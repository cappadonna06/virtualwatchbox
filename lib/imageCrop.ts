import sharp from 'sharp'
import type { DialBbox } from '@/lib/watchVision'

/**
 * Parses a normalized DialBbox out of FormData fields (`bboxX`, `bboxY`, `bboxW`, `bboxH`).
 * Returns null when any field is missing or invalid — caller should fall through to no-crop behavior.
 */
export function readBboxFromFormData(form: FormData): DialBbox | null {
  const x = Number(form.get('bboxX'))
  const y = Number(form.get('bboxY'))
  const w = Number(form.get('bboxW'))
  const h = Number(form.get('bboxH'))
  if (![x, y, w, h].every(Number.isFinite)) return null
  if (w <= 0 || h <= 0) return null
  if (x < 0 || y < 0 || x >= 1 || y >= 1) return null
  if (x + w > 1.001 || y + h > 1.001) return null
  return { x, y, w, h }
}

/**
 * Crops an image to a square focused on the watch face using a normalized bbox.
 *
 * - Applies EXIF rotation first so bbox coordinates are interpreted in the
 *   correctly-oriented frame (the AI saw the rotated version).
 * - Adds a margin around the bbox so the case isn't pressed against the edge.
 * - Squares the crop by taking the larger of (width, height) as the side
 *   length, centered on the bbox center, then clamps to image bounds.
 * - Falls back to a centered square crop of the full image when bbox is null
 *   or the resulting crop would be smaller than minSidePx.
 */
export async function cropToDialSquare(
  inputBuffer: Buffer,
  bbox: DialBbox | null,
  options: { marginPct?: number; minSidePx?: number; maxSidePx?: number } = {},
): Promise<Buffer> {
  const marginPct = options.marginPct ?? 0.10
  const minSidePx = options.minSidePx ?? 220
  const maxSidePx = options.maxSidePx ?? 1600

  // Materialize the rotated image so bbox coordinates align with the buffer we crop.
  const rotated = await sharp(inputBuffer).rotate().toBuffer()
  const meta = await sharp(rotated).metadata()
  const W = meta.width ?? 0
  const H = meta.height ?? 0
  if (!W || !H) {
    // Pathological — just return the rotated original.
    return rotated
  }

  // Fall back: no bbox → centered square crop of the full image.
  if (!bbox) {
    const side = Math.min(W, H)
    const left = Math.round((W - side) / 2)
    const top = Math.round((H - side) / 2)
    return sharp(rotated)
      .extract({ left, top, width: side, height: side })
      .resize(Math.min(side, maxSidePx), Math.min(side, maxSidePx), { fit: 'cover' })
      .jpeg({ quality: 88 })
      .toBuffer()
  }

  const px = (val: number, axis: number) => Math.round(val * axis)
  let bx = px(bbox.x, W)
  let by = px(bbox.y, H)
  let bw = px(bbox.w, W)
  let bh = px(bbox.h, H)

  // Center of the watch face.
  const cx = bx + bw / 2
  const cy = by + bh / 2

  // Square side: longest bbox dimension + margin on both sides.
  const longest = Math.max(bw, bh)
  let side = Math.round(longest * (1 + 2 * marginPct))

  // Don't go bigger than the image.
  side = Math.min(side, W, H)

  // If the bbox is so small that the resulting square would be tiny, abort the
  // crop (likely a low-confidence detection on a small inset). Use a centered
  // fallback so we still get a square in the watchbox slot.
  if (side < minSidePx) {
    const fallbackSide = Math.min(W, H)
    const left = Math.round((W - fallbackSide) / 2)
    const top = Math.round((H - fallbackSide) / 2)
    return sharp(rotated)
      .extract({ left, top, width: fallbackSide, height: fallbackSide })
      .resize(Math.min(fallbackSide, maxSidePx), Math.min(fallbackSide, maxSidePx), { fit: 'cover' })
      .jpeg({ quality: 88 })
      .toBuffer()
  }

  // Position the square centered on the bbox; then clamp into the image.
  let left = Math.round(cx - side / 2)
  let top = Math.round(cy - side / 2)
  if (left < 0) left = 0
  if (top < 0) top = 0
  if (left + side > W) left = W - side
  if (top + side > H) top = H - side

  // Suppress unused-var warnings; bw/bh kept for potential future tuning.
  void bx; void by; void bw; void bh

  return sharp(rotated)
    .extract({ left, top, width: side, height: side })
    .resize(Math.min(side, maxSidePx), Math.min(side, maxSidePx), { fit: 'cover' })
    .jpeg({ quality: 88 })
    .toBuffer()
}
