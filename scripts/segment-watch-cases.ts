/**
 * Case-only watch segmentation pipeline (Strap Studio — Feature 7).
 *
 * Produces a "case only" render of each watch (case/head opaque, strap/bracelet
 * region transparent) so the Strap Studio can layer a strap image BEHIND the
 * watch head for a true composite. Also derives lug-attachment geometry (where
 * the strap meets the case) used to position + width-scale the strap.
 *
 * Outputs, per watch:
 *   - watch-images/{catalog_watch_id}/case-only.png   (Supabase Storage, RGBA)
 *   - watch-images/{catalog_watch_id}/case-only.webp
 *   - watch_images columns (case_only_url, case_only_webp_url, lug_geometry,
 *     segmentation_confidence, segmentation_status) — requires migration 032;
 *     write is best-effort and degrades gracefully if not yet applied.
 *   - data/case-only-images.json  — committed static bridge the client reads at
 *     module-load (lib/caseOnlyImages.ts), so the Studio needs zero round-trips.
 *
 * ── Providers (swappable, provider-agnostic) ───────────────────────────────
 *   SegmentationProvider.segmentCase(buffer, hint) → { caseMask, lugGeometry, confidence }
 *
 *   • ReplicateSamProvider (DEFAULT) — SAM 3 / grounded-SAM via the Replicate
 *     REST API (REPLICATE_API_TOKEN). Text+point hinted to "watch case head
 *     excluding strap/bracelet". Model id is configurable (REPLICATE_SEGMENT_MODEL).
 *   • OpenAiMaskProvider (FALLBACK) — OpenAI image-edit mask generation
 *     (OPENAI_API_KEY). Best-effort; less reliable than SAM. Unverified.
 *   • --ingest mode bypasses providers entirely: the inputs are ALREADY
 *     case-only (e.g. curated 3D renders in public/demo-cases), so we only
 *     normalize → derive geometry → upload.
 *
 *   Premium 3rd-party option (NOT built — noted for future scaling): a paid
 *   segmentation/mask API such as remove.bg's mask tier, or a specialized
 *   watch-segmentation service, can drop in behind the same SegmentationProvider
 *   interface.
 *
 * ── Usage ──────────────────────────────────────────────────────────────────
 *   # Ingest pre-segmented case-only renders (primary path today):
 *   npm run straps:segment-cases -- --ingest public/demo-cases
 *
 *   # Segment the top 100 by heat score (scaling path; needs REPLICATE_API_TOKEN):
 *   npm run straps:segment-cases -- --top 100 --by heat-score
 *   npm run straps:segment-cases -- --only=tudor-black-bay-gmt-m79830rb
 *   #   --force        regenerate even if case-only already exists
 *   #   --provider=openai   use the OpenAI fallback instead of Replicate
 *   #   DRY_RUN=1      preview, no uploads / writes
 *
 * Required env (loaded from .env.local): SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL,
 * SUPABASE_SECRET_KEY/SERVICE_ROLE_KEY, and REPLICATE_API_TOKEN (segment path).
 */

import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { cropToAlphaBounds } from '../lib/imageProcessing'
import { loadLocalEnv, repoRoot } from './watch-image-pipeline'

loadLocalEnv()

const BUCKET = 'watch-images'
const OUTPUT_HEIGHT = 900
const BRIDGE_PATH = path.join(repoRoot, 'data', 'case-only-images.json')

// ── CLI args ────────────────────────────────────────────────────────────────
const ARGV = process.argv.slice(2)
function arg(name: string): string | undefined {
  const hit = ARGV.find(a => a === name || a.startsWith(`${name}=`))
  if (!hit) return undefined
  if (hit === name) return ARGV[ARGV.indexOf(hit) + 1]
  return hit.slice(name.length + 1)
}
const INGEST_DIR = arg('--ingest')
const TOP = Number(arg('--top') ?? 0)
const ONLY = arg('--only')
const PROVIDER = (arg('--provider') ?? 'replicate').toLowerCase()
const FORCE = ARGV.includes('--force')
const DRY_RUN = process.env.DRY_RUN === '1'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY

// ── Types ─────────────────────────────────────────────────────────────────--
export interface LugPoint { x: number; y: number }
export interface LugGeometry {
  topLugLeft: LugPoint
  topLugRight: LugPoint
  bottomLugLeft: LugPoint
  bottomLugRight: LugPoint
  lugWidthPx: number
  /** Pixel dimensions of the case-only image these coords live in. */
  imageWidth: number
  imageHeight: number
}
export interface SegmentationResult {
  caseMask: Buffer // single-channel-ish alpha mask, white=case, black=strap
  lugGeometry: LugGeometry | null
  confidence: number
}
export interface SegmentationProvider {
  segmentCase(
    imageBuffer: Buffer,
    hint?: { lugWidthMm?: number; braceletType?: string },
  ): Promise<SegmentationResult>
}

type BridgeEntry = {
  caseOnlyUrl: string
  caseOnlyPngUrl: string
  lugGeometry: LugGeometry
  lugWidthMm?: number
  brand?: string
  model?: string
  reference?: string
  confidence: number
  status: 'pending' | 'approved' | 'needs_review' | 'rejected'
}

// Curated case-only renders → catalog watch. The depicted watch's real lug width
// + display fields are carried so the Studio renders fully even if the catalog
// row is sparse. (Image refs may differ slightly from the matched catalog ref —
// these are demo associations.)
const INGEST_MAP: Record<string, { id: string; brand: string; model: string; reference: string; lugWidthMm: number }> = {
  'Tudor_BB58_Black_Bay_58_GMT_CASE': {
    id: 'tudor-black-bay-gmt-m79830rb',
    brand: 'Tudor', model: 'Black Bay GMT', reference: 'M79830RB-0001', lugWidthMm: 22,
  },
  'Omega_-_Seamaster_Aqua_Terra_150M_Co-Axial_Master_Chronometer_-_220.10.38.20.03.001_-3DPRO-CASE': {
    id: 'omega-aqua-terra-blue-22010412103004',
    brand: 'Omega', model: 'Seamaster Aqua Terra 150M', reference: '220.10.38.20.03.001', lugWidthMm: 19,
  },
  'ORIS-Big-Crown-Oris-X-Cervo-Volante-175477794067-3DPRO-CASE': {
    id: 'oris-big-crown-pointer-date-green',
    brand: 'Oris', model: 'Big Crown Pointer Date (Cervo Volante)', reference: 'Big Crown', lugWidthMm: 20,
  },
}

function fail(msg: string): never {
  console.error(`[segment-cases] ${msg}`)
  process.exit(1)
}

// ── Lug geometry: detect where the strap channel sits between the lug pair ────
// In a case-only render the gap BETWEEN the two lugs (top + bottom) is
// transparent — that gap is exactly where the strap attaches. We scan rows for
// "two opaque runs separated by a gap": the gap centre is the strap centre and
// the gap width ≈ the strap width.
function opaqueRuns(rgba: Buffer, width: number, y: number, threshold = 24, minRun = 4): Array<[number, number]> {
  const runs: Array<[number, number]> = []
  let start = -1
  for (let x = 0; x < width; x += 1) {
    const a = rgba[(y * width + x) * 4 + 3]
    if (a > threshold) {
      if (start < 0) start = x
    } else if (start >= 0) {
      if (x - start >= minRun) runs.push([start, x - 1])
      start = -1
    }
  }
  if (start >= 0 && width - start >= minRun) runs.push([start, width - 1])
  return runs
}

function alphaBoundsRows(rgba: Buffer, width: number, height: number, threshold = 24): { top: number; bottom: number } {
  let top = height
  let bottom = -1
  for (let y = 0; y < height; y += 1) {
    let any = false
    for (let x = 0; x < width; x += 1) {
      if (rgba[(y * width + x) * 4 + 3] > threshold) { any = true; break }
    }
    if (any) { if (y < top) top = y; bottom = y }
  }
  return { top: top === height ? 0 : top, bottom: bottom < 0 ? height - 1 : bottom }
}

// Find the strap channel (widest 2-run gap) within a vertical band.
function findChannel(
  rgba: Buffer, width: number, yStart: number, yEnd: number, step: number,
): { left: number; right: number; y: number; gap: number } | null {
  let best: { left: number; right: number; y: number; gap: number } | null = null
  const lo = Math.min(yStart, yEnd)
  const hi = Math.max(yStart, yEnd)
  for (let y = lo; y <= hi; y += Math.max(1, step)) {
    const runs = opaqueRuns(rgba, width, y)
    if (runs.length < 2) continue
    // Largest gap between adjacent runs on this row.
    for (let i = 0; i < runs.length - 1; i += 1) {
      const left = runs[i][1]
      const right = runs[i + 1][0]
      const gap = right - left
      // The strap channel is a substantial central gap, not a tiny notch.
      if (gap < width * 0.08) continue
      const center = (left + right) / 2
      const centrality = 1 - Math.abs(center - width / 2) / (width / 2)
      if (centrality < 0.35) continue
      if (!best || gap > best.gap) best = { left, right, y, gap }
    }
  }
  return best
}

async function deriveLugGeometry(rgba: Buffer, width: number, height: number): Promise<{ geom: LugGeometry; confidence: number }> {
  const { top, bottom } = alphaBoundsRows(rgba, width, height)
  const caseH = Math.max(1, bottom - top)
  const step = Math.max(1, Math.round(caseH / 120))

  // Top lugs: scan the top ~28% of the case downward.
  const topChannel = findChannel(rgba, width, top, top + Math.round(caseH * 0.28), step)
  // Bottom lugs: scan the bottom ~28% of the case upward.
  const bottomChannel = findChannel(rgba, width, bottom, bottom - Math.round(caseH * 0.28), step)

  let confidence = 0.4
  let geom: LugGeometry

  if (topChannel && bottomChannel) {
    confidence = 0.9
    const lugWidthPx = Math.round((topChannel.gap + bottomChannel.gap) / 2)
    geom = {
      topLugLeft: { x: topChannel.left, y: topChannel.y },
      topLugRight: { x: topChannel.right, y: topChannel.y },
      bottomLugLeft: { x: bottomChannel.left, y: bottomChannel.y },
      bottomLugRight: { x: bottomChannel.right, y: bottomChannel.y },
      lugWidthPx,
      imageWidth: width,
      imageHeight: height,
    }
  } else {
    // Fallback: centre-based estimate from the case bounding box.
    const ch = topChannel || bottomChannel
    let left = 0
    let right = width
    for (let y = top; y <= bottom; y += step) {
      const runs = opaqueRuns(rgba, width, y)
      if (runs.length) {
        left = Math.min(left || runs[0][0], runs[0][0])
        right = Math.max(right === width ? runs[runs.length - 1][1] : right, runs[runs.length - 1][1])
      }
    }
    const caseW = Math.max(1, right - left)
    const cx = ch ? Math.round((ch.left + ch.right) / 2) : Math.round(left + caseW / 2)
    const lugWidthPx = ch ? ch.gap : Math.round(caseW * 0.3)
    const topY = top + Math.round(caseH * 0.08)
    const botY = bottom - Math.round(caseH * 0.08)
    confidence = ch ? 0.6 : 0.4
    geom = {
      topLugLeft: { x: cx - Math.round(lugWidthPx / 2), y: topY },
      topLugRight: { x: cx + Math.round(lugWidthPx / 2), y: topY },
      bottomLugLeft: { x: cx - Math.round(lugWidthPx / 2), y: botY },
      bottomLugRight: { x: cx + Math.round(lugWidthPx / 2), y: botY },
      lugWidthPx,
      imageWidth: width,
      imageHeight: height,
    }
  }
  return { geom, confidence }
}

// ── Normalize a case-only RGBA buffer to the canonical output ─────────────────
async function normalizeCaseOnly(input: Buffer): Promise<{ png: Buffer; webp: Buffer; rgba: Buffer; width: number; height: number }> {
  const trimmed = await cropToAlphaBounds(input)
  const resized = await sharp(trimmed)
    .resize({ height: OUTPUT_HEIGHT, withoutEnlargement: false })
    .png()
    .toBuffer()
  const { data, info } = await sharp(resized).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const png = await sharp(resized).png({ compressionLevel: 9 }).toBuffer()
  const webp = await sharp(resized).webp({ quality: 92, alphaQuality: 100 }).toBuffer()
  return { png, webp, rgba: data, width: info.width, height: info.height }
}

// ── Storage upload ────────────────────────────────────────────────────────--
async function objectExists(supabase: SupabaseClient, objectPath: string): Promise<boolean> {
  const slash = objectPath.lastIndexOf('/')
  const dir = slash >= 0 ? objectPath.slice(0, slash) : ''
  const name = slash >= 0 ? objectPath.slice(slash + 1) : objectPath
  const { data } = await supabase.storage.from(BUCKET).list(dir, { limit: 100, search: name })
  return Array.isArray(data) && data.some(d => d.name === name)
}

async function uploadCaseOnly(
  supabase: SupabaseClient, id: string, png: Buffer, webp: Buffer,
): Promise<{ caseOnlyPngUrl: string; caseOnlyUrl: string }> {
  const pngPath = `${id}/case-only.png`
  const webpPath = `${id}/case-only.webp`
  const caseOnlyPngUrl = supabase.storage.from(BUCKET).getPublicUrl(pngPath).data.publicUrl
  const caseOnlyUrl = supabase.storage.from(BUCKET).getPublicUrl(webpPath).data.publicUrl
  if (DRY_RUN) return { caseOnlyPngUrl, caseOnlyUrl }
  for (const [p, buf, ct] of [[pngPath, png, 'image/png'], [webpPath, webp, 'image/webp']] as const) {
    const { error } = await supabase.storage.from(BUCKET).upload(p, buf, {
      contentType: ct, upsert: true, cacheControl: '31536000',
    })
    if (error && !error.message?.toLowerCase().includes('resource already exists')) {
      throw new Error(`upload ${p} failed: ${error.message}`)
    }
  }
  return { caseOnlyPngUrl, caseOnlyUrl }
}

// Best-effort DB writes — never fatal (migration 032 may not be applied yet, and
// a watch may not have a primary watch_images row). The static bridge is the
// client's source of truth, so these are for the admin review surface + scaling.
async function writeDbColumns(
  supabase: SupabaseClient, id: string, entry: BridgeEntry,
): Promise<void> {
  if (DRY_RUN) return
  try {
    const { error, count } = await supabase
      .from('watch_images')
      .update({
        case_only_url: entry.caseOnlyUrl,
        case_only_webp_url: entry.caseOnlyUrl,
        lug_geometry: entry.lugGeometry,
        segmentation_confidence: entry.confidence,
        segmentation_status: entry.status,
        segmentation_reviewed_at: entry.status === 'approved' ? new Date().toISOString() : null,
      }, { count: 'exact' })
      .eq('catalog_watch_id', id)
      .eq('variant', 'primary')
    if (error) {
      if (error.message?.includes('column') || error.code === '42703') {
        console.warn(`  ⚠ watch_images case-only columns missing — apply migration 032 (bridge written regardless).`)
      } else {
        console.warn(`  ⚠ watch_images update warn: ${error.message}`)
      }
    } else if (!count) {
      console.warn(`  ⚠ no primary watch_images row for ${id} (bridge written regardless).`)
    }
  } catch (e) {
    console.warn(`  ⚠ watch_images update skipped: ${(e as Error).message}`)
  }
}

async function updateCatalogLugWidth(supabase: SupabaseClient, id: string, mm: number): Promise<void> {
  if (DRY_RUN) return
  try {
    const { error } = await supabase.from('catalog_watches').update({ lug_width_mm: mm }).eq('id', id)
    if (error) console.warn(`  ⚠ catalog lug-width update warn: ${error.message}`)
  } catch (e) {
    console.warn(`  ⚠ catalog lug-width update skipped: ${(e as Error).message}`)
  }
}

function readBridge(): Record<string, BridgeEntry> {
  try {
    return JSON.parse(fs.readFileSync(BRIDGE_PATH, 'utf8')) as Record<string, BridgeEntry>
  } catch {
    return {}
  }
}

function writeBridge(map: Record<string, BridgeEntry>): void {
  if (DRY_RUN) return
  const sorted = Object.fromEntries(Object.entries(map).sort(([a], [b]) => a.localeCompare(b)))
  fs.writeFileSync(BRIDGE_PATH, JSON.stringify(sorted, null, 2) + '\n')
}

// ── Providers ────────────────────────────────────────────────────────────--
class ReplicateSamProvider implements SegmentationProvider {
  private token = process.env.REPLICATE_API_TOKEN
  private model = process.env.REPLICATE_SEGMENT_MODEL
    // A text-promptable SAM/grounded-segmentation model. Override per your
    // Replicate account's preferred version pin.
    || 'schananas/grounded_sam:ee871c19efb1941f55f66a3d7d960428c8a5afcb77449547fe8e5a3ab9ebc21c'

  async segmentCase(imageBuffer: Buffer, hint?: { braceletType?: string }): Promise<SegmentationResult> {
    if (!this.token) fail('REPLICATE_API_TOKEN required for the Replicate provider (or use --ingest / --provider=openai).')
    const dataUri = `data:image/png;base64,${imageBuffer.toString('base64')}`
    const prompt = 'watch case, bezel, crown and dial — the watch head only, excluding the strap and bracelet'
    const create = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ version: this.model.split(':')[1], input: { image: dataUri, mask_prompt: prompt, negative_mask_prompt: 'strap, bracelet, band, leather, rubber' } }),
    })
    if (!create.ok) throw new Error(`Replicate create failed: ${create.status} ${await create.text()}`)
    let pred = await create.json() as { id: string; status: string; output?: unknown; error?: string; urls?: { get: string } }
    const getUrl = pred.urls?.get || `https://api.replicate.com/v1/predictions/${pred.id}`
    const started = Date.now()
    while (pred.status !== 'succeeded' && pred.status !== 'failed' && pred.status !== 'canceled') {
      if (Date.now() - started > 120_000) throw new Error('Replicate prediction timed out')
      await new Promise(r => setTimeout(r, 1500))
      const poll = await fetch(getUrl, { headers: { Authorization: `Bearer ${this.token}` } })
      pred = await poll.json()
    }
    if (pred.status !== 'succeeded') throw new Error(`Replicate prediction ${pred.status}: ${pred.error ?? ''}`)
    const maskUrl = Array.isArray(pred.output) ? String(pred.output[pred.output.length - 1]) : String(pred.output)
    const maskRes = await fetch(maskUrl)
    const caseMask = Buffer.from(await maskRes.arrayBuffer())
    return { caseMask, lugGeometry: null, confidence: 0.75 }
  }
}

class OpenAiMaskProvider implements SegmentationProvider {
  // Fallback. OpenAI image-edit mask generation is less reliable than SAM for
  // fine watch-case isolation; provided for completeness and offline fallback.
  // Unverified at scale — review every result in the admin Case Segmentation tab.
  async segmentCase(): Promise<SegmentationResult> {
    fail('OpenAI mask provider is a documented fallback and is not wired for batch use yet — use --ingest or the Replicate provider.')
  }
}

function getProvider(): SegmentationProvider {
  return PROVIDER === 'openai' ? new OpenAiMaskProvider() : new ReplicateSamProvider()
}

// ── Modes ────────────────────────────────────────────────────────────────--
async function runIngest(supabase: SupabaseClient, dir: string): Promise<void> {
  const abs = path.isAbsolute(dir) ? dir : path.join(repoRoot, dir)
  if (!fs.existsSync(abs)) fail(`--ingest dir not found: ${abs}`)
  const files = fs.readdirSync(abs).filter(f => /\.(png|webp|jpg|jpeg)$/i.test(f))
  if (!files.length) fail(`no images in ${abs}`)
  console.log(`[segment-cases] ingest ${files.length} pre-segmented case-only image(s) from ${dir}\n`)

  const bridge = readBridge()
  let ok = 0
  let fa = 0
  for (const file of files) {
    const stem = file.replace(/\.[^.]+$/, '')
    const map = INGEST_MAP[stem]
    if (!map) {
      console.warn(`  ? no INGEST_MAP entry for "${stem}" — skipping`)
      fa += 1
      continue
    }
    try {
      const input = fs.readFileSync(path.join(abs, file))
      const norm = await normalizeCaseOnly(input)
      const { geom, confidence } = await deriveLugGeometry(norm.rgba, norm.width, norm.height)
      const { caseOnlyPngUrl, caseOnlyUrl } = await uploadCaseOnly(supabase, map.id, norm.png, norm.webp)
      const entry: BridgeEntry = {
        caseOnlyUrl, caseOnlyPngUrl, lugGeometry: geom, lugWidthMm: map.lugWidthMm,
        brand: map.brand, model: map.model, reference: map.reference,
        confidence, status: 'approved',
      }
      bridge[map.id] = entry
      await writeDbColumns(supabase, map.id, entry)
      await updateCatalogLugWidth(supabase, map.id, map.lugWidthMm)
      ok += 1
      console.log(`  ✓ ${map.brand} ${map.model} → ${map.id}  lug=${map.lugWidthMm}mm  ` +
        `geom(${geom.imageWidth}×${geom.imageHeight}, w=${geom.lugWidthPx}px, conf=${confidence.toFixed(2)})`)
    } catch (e) {
      fa += 1
      console.warn(`  ✗ ${file}: ${(e as Error).message}`)
    }
  }
  writeBridge(bridge)
  console.log(`\n[segment-cases] ingest done: ${ok} ok, ${fa} failed. Bridge → data/case-only-images.json`)
}

async function loadSegmentTargets(supabase: SupabaseClient): Promise<string[]> {
  if (ONLY) return ONLY.split(',').map(s => s.trim()).filter(Boolean)
  // Top-N by heat score with an approved primary image but no case-only yet.
  const heat = JSON.parse(fs.readFileSync(path.join(repoRoot, 'data', 'catalog-heat-scores.json'), 'utf8')) as Record<string, number>
  const ranked = Object.entries(heat).sort(([, a], [, b]) => b - a).map(([id]) => id)
  const bridge = readBridge()
  const out: string[] = []
  for (const id of ranked) {
    if (!FORCE && bridge[id]?.status) continue
    out.push(id)
    if (TOP > 0 && out.length >= TOP) break
  }
  return out
}

async function runSegment(supabase: SupabaseClient): Promise<void> {
  const provider = getProvider()
  const ids = await loadSegmentTargets(supabase)
  if (!ids.length) { console.log('[segment-cases] nothing to segment (all done, or empty heat list).'); return }
  console.log(`[segment-cases] segmenting ${ids.length} watch(es) via ${PROVIDER}\n`)
  const bridge = readBridge()
  let ok = 0
  let fa = 0
  for (const id of ids) {
    try {
      if (!FORCE && await objectExists(supabase, `${id}/case-only.webp`)) { console.log(`  · skip ${id} (exists)`); continue }
      const { data: rows } = await supabase.from('watch_images').select('webp_url, png_url').eq('catalog_watch_id', id).eq('variant', 'primary').limit(1)
      const srcUrl = rows?.[0]?.png_url || rows?.[0]?.webp_url
      if (!srcUrl) { console.warn(`  ✗ ${id}: no primary image`); fa += 1; continue }
      const srcBuf = Buffer.from(await (await fetch(srcUrl)).arrayBuffer())
      const { caseMask, confidence } = await provider.segmentCase(srcBuf)
      // Apply mask: keep only the case region (white in mask) → strap transparent.
      const masked = await sharp(srcBuf).ensureAlpha()
        .composite([{ input: await sharp(caseMask).resize({ width: (await sharp(srcBuf).metadata()).width }).toColourspace('b-w').toBuffer(), blend: 'dest-in' }])
        .png().toBuffer()
      const norm = await normalizeCaseOnly(masked)
      const { geom, confidence: geomConf } = await deriveLugGeometry(norm.rgba, norm.width, norm.height)
      const { caseOnlyPngUrl, caseOnlyUrl } = await uploadCaseOnly(supabase, id, norm.png, norm.webp)
      const entry: BridgeEntry = {
        caseOnlyUrl, caseOnlyPngUrl, lugGeometry: geom,
        confidence: Math.min(confidence, geomConf), status: 'pending',
      }
      bridge[id] = entry
      await writeDbColumns(supabase, id, entry)
      ok += 1
      console.log(`  ✓ ${id} (conf=${entry.confidence.toFixed(2)}) → pending review`)
    } catch (e) {
      fa += 1
      console.warn(`  ✗ ${id}: ${(e as Error).message}`)
    }
  }
  writeBridge(bridge)
  console.log(`\n[segment-cases] segment done: ${ok} ok, ${fa} failed. Review in /admin/image-review → Case Segmentation.`)
}

async function main(): Promise<void> {
  if (!SUPABASE_URL) fail('Missing SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL.')
  if (!SUPABASE_KEY && !DRY_RUN) fail('Missing SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY.')
  const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY ?? 'anon', {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  if (INGEST_DIR) await runIngest(supabase, INGEST_DIR)
  else await runSegment(supabase)
}

void main().catch(err => {
  console.error(err)
  process.exit(1)
})
