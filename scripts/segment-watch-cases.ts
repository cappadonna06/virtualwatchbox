import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { brand } from '../lib/brand'
import type { CaseOnlyEntry, LugGeometry } from '../lib/caseOnlyImages'
import { cropToAlphaBounds } from '../lib/imageProcessing'
import { loadLocalEnv, repoRoot } from './watch-image-pipeline'
import { segmentWatchHead } from './segment-watch-head'
import { heatScore } from '../lib/heatScore'

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
const SOURCE_ID = arg('--source-id')
const REVIEW_DIR = arg('--review-dir')
const MEASURE_CLEARANCE = ARGV.includes('--measure-clearance')
const FORCE = ARGV.includes('--force')
const DRY_RUN = process.env.DRY_RUN === '1'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY

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

// Outermost row (scanning from the case's outer edge inward) where the
// between-lugs gap exists — i.e. the lug TIP row. Strap pin rows anchor here;
// the widest-gap row can land mid/inner-channel (it did for every bottom
// channel), which anchored bottom straps too deep into the case.
function findChannelTip(
  rgba: Buffer, width: number, outerY: number, innerY: number,
): number | null {
  const dir = innerY > outerY ? 1 : -1
  for (let y = outerY; dir > 0 ? y <= innerY : y >= innerY; y += dir) {
    const runs = opaqueRuns(rgba, width, y)
    if (runs.length < 2) continue
    for (let i = 0; i < runs.length - 1; i += 1) {
      const gap = runs[i + 1][0] - runs[i][1]
      if (gap < width * 0.08) continue
      const center = (runs[i][1] + runs[i + 1][0]) / 2
      if (1 - Math.abs(center - width / 2) / (width / 2) < 0.35) continue
      return y
    }
  }
  return null
}

function measureCaseEdge(rgba: Buffer, width: number, height: number, left: LugGeometry['topLugLeft'], right: LugGeometry['topLugRight'], direction: 1 | -1) {
  const tip = Math.round((left.y + right.y) / 2)
  const span = right.x - left.x
  const center = (left.x + right.x) / 2
  const limit = Math.round(span * 0.38)
  const hits: number[] = []
  for (const fraction of [-0.08, -0.04, 0, 0.04, 0.08]) {
    const x = Math.round(center + span * fraction)
    for (let depth = 0; depth <= limit; depth += 1) {
      const y = tip + direction * depth
      if (y < 2 || y >= height - 2) continue
      const alphaAt = (offset: number) => rgba[((y + direction * offset) * width + x) * 4 + 3]
      if (alphaAt(0) >= 230 && alphaAt(1) >= 230 && alphaAt(2) >= 230) {
        hits.push(y)
        break
      }
    }
  }
  return hits.length >= 3 ? hits.sort((a, b) => a - b)[Math.floor(hits.length / 2)] : undefined
}

// LugGeometry semantics: the four lug-point y values are the OUTER TIP rows of
// each channel (top: first gap row from the top; bottom: last from the bottom).
// lugWidthPx + the x coordinates come from the widest-gap row, where the
// channel edges are stable.
async function deriveLugGeometry(rgba: Buffer, width: number, height: number): Promise<{ geom: LugGeometry; confidence: number }> {
  const { top, bottom } = alphaBoundsRows(rgba, width, height)
  const caseH = Math.max(1, bottom - top)
  const step = Math.max(1, Math.round(caseH / 120))

  // Top lugs: scan the top ~28% of the case downward.
  const topChannel = findChannel(rgba, width, top, top + Math.round(caseH * 0.28), step)
  // Bottom lugs: scan the bottom ~28% of the case upward.
  const bottomChannel = findChannel(rgba, width, bottom, bottom - Math.round(caseH * 0.28), step)
  const topTipY = findChannelTip(rgba, width, top, top + Math.round(caseH * 0.28))
  const botTipY = findChannelTip(rgba, width, bottom, bottom - Math.round(caseH * 0.28))

  let confidence = 0.4
  let geom: LugGeometry

  if (topChannel && bottomChannel) {
    confidence = 0.9
    const lugWidthPx = Math.round((topChannel.gap + bottomChannel.gap) / 2)
    const topY = topTipY ?? topChannel.y
    const botY = botTipY ?? bottomChannel.y
    geom = {
      topLugLeft: { x: topChannel.left, y: topY },
      topLugRight: { x: topChannel.right, y: topY },
      bottomLugLeft: { x: bottomChannel.left, y: botY },
      bottomLugRight: { x: bottomChannel.right, y: botY },
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
  if (confidence === 0.9) {
    geom.topCaseEdgeY = measureCaseEdge(rgba, width, height, geom.topLugLeft, geom.topLugRight, 1)
    geom.bottomCaseEdgeY = measureCaseEdge(rgba, width, height, geom.bottomLugLeft, geom.bottomLugRight, -1)
  }
  return { geom, confidence }
}

async function removeDetachedFragments(input: Buffer): Promise<Buffer> {
  const { data, info: { width, height } } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const size = width * height
  const visited = new Uint8Array(size)
  const queue = new Uint32Array(size)
  let count = 0
  const visit = (index: number) => {
    if (visited[index] || data[index * 4 + 3] < 8) return
    visited[index] = 1
    queue[count] = index
    count += 1
  }
  visit(Math.floor(height / 2) * width + Math.floor(width / 2))
  if (!count) throw new Error('Cutout has no watch body at the center')
  for (let read = 0; read < count; read += 1) {
    const index = queue[read]
    if (index % width > 0) visit(index - 1)
    if (index % width < width - 1) visit(index + 1)
    if (index >= width) visit(index - width)
    if (index < size - width) visit(index + width)
  }
  for (let index = 0; index < size; index += 1) {
    if (!visited[index]) data[index * 4 + 3] = 0
  }
  return sharp(data, { raw: { width, height, channels: 4 } }).png().toBuffer()
}

// ── Normalize a case-only RGBA buffer to the canonical output ─────────────────
async function normalizeCaseOnly(input: Buffer): Promise<{ png: Buffer; webp: Buffer; rgba: Buffer; width: number; height: number }> {
  const trimmed = await cropToAlphaBounds(await removeDetachedFragments(input))
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
async function uploadCaseOnly(
  supabase: SupabaseClient, id: string, png: Buffer, webp: Buffer,
): Promise<{ caseOnlyPngUrl: string; caseOnlyUrl: string }> {
  const stem = `${id}/case-only${FORCE ? `-${createHash('sha256').update(png).digest('hex').slice(0, 12)}` : ''}`
  const pngPath = `${stem}.png`
  const webpPath = `${stem}.webp`
  const caseOnlyPngUrl = supabase.storage.from(BUCKET).getPublicUrl(pngPath).data.publicUrl
  const caseOnlyUrl = supabase.storage.from(BUCKET).getPublicUrl(webpPath).data.publicUrl
  if (DRY_RUN) return { caseOnlyPngUrl, caseOnlyUrl }
  for (const [p, buf, ct] of [[pngPath, png, 'image/png'], [webpPath, webp, 'image/webp']] as const) {
    const { error } = await supabase.storage.from(BUCKET).upload(p, buf, {
      contentType: ct, upsert: true, cacheControl: '31536000',
    })
    if (error) {
      throw new Error(`upload ${p} failed: ${error.message}`)
    }
  }
  return { caseOnlyPngUrl, caseOnlyUrl }
}

async function writeDbColumns(supabase: SupabaseClient, id: string, entry: CaseOnlyEntry): Promise<void> {
  const { error, count } = await supabase
    .from('watch_images')
    .update({
      case_only_url: entry.caseOnlyPngUrl,
      case_only_webp_url: entry.caseOnlyUrl,
      lug_geometry: entry.lugGeometry,
      segmentation_confidence: entry.confidence,
      segmentation_status: entry.status,
      segmentation_reviewed_at: new Date().toISOString(),
    }, { count: 'exact' })
    .eq('catalog_watch_id', id)
    .eq('variant', 'primary')
  if (error) throw new Error(error.message)
  if (!count) throw new Error('No primary watch_images row for this reference')
}

function readBridge(): Record<string, CaseOnlyEntry> {
  return JSON.parse(fs.readFileSync(BRIDGE_PATH, 'utf8')) as Record<string, CaseOnlyEntry>
}

function writeBridge(map: Record<string, CaseOnlyEntry>): void {
  if (DRY_RUN) return
  const sorted = Object.fromEntries(Object.entries(map).sort(([a], [b]) => a.localeCompare(b)))
  fs.writeFileSync(BRIDGE_PATH, JSON.stringify(sorted, null, 2) + '\n')
}

type CatalogEntry = {
  id: string
  brand: string
  model: string
  reference: string
  lug_width_mm: number | null
  bracelet_type: string | null
}

function canUseStraightStraps(watch: CatalogEntry): boolean {
  return watch.bracelet_type !== 'integrated' &&
    watch.lug_width_mm != null && [18, 19, 20, 21, 22, 24].includes(watch.lug_width_mm)
}

function assertCaseGeometry(rgba: Buffer, geom: LugGeometry) {
  const { imageWidth, imageHeight, topLugLeft, topLugRight, bottomLugLeft, bottomLugRight } = geom
  const topWidth = topLugRight.x - topLugLeft.x
  const bottomWidth = bottomLugRight.x - bottomLugLeft.x
  const topCenter = (topLugLeft.x + topLugRight.x) / 2
  const bottomCenter = (bottomLugLeft.x + bottomLugRight.x) / 2
  if (Math.min(topWidth, bottomWidth) / Math.max(topWidth, bottomWidth) < 0.72 ||
      Math.abs(topCenter - bottomCenter) > imageWidth * 0.12) {
    throw new Error('Lug channels disagree on width or center')
  }
  const center = Math.round((topCenter + bottomCenter) / 2)
  for (let y = Math.round(imageHeight * 0.23); y < imageHeight * 0.77; y += 1) {
    if (rgba[(y * imageWidth + center) * 4 + 3] < 240) throw new Error('Cutout is missing pixels through the watch body')
  }
}

function writeReviewPage(directory: string) {
  const entries = fs.readdirSync(directory).sort().filter(file => /^[a-z0-9][a-z0-9-]*\.original\.webp$/.test(file))
  const rows = entries.map(file => {
    const id = file.replace('.original.webp', '')
    if (!fs.existsSync(path.join(directory, `${id}.png`))) return ''
    return `<article><h2>${id}</h2><div><figure><img loading="lazy" src="${file}" alt=""><figcaption>Catalog photo</figcaption></figure><figure><img loading="lazy" src="${id}.png" alt=""><figcaption>Candidate cutout</figcaption></figure></div></article>`
  })
  fs.writeFileSync(path.join(directory, 'review.html'), `<!doctype html><html lang="en"><meta charset="utf-8">
<title>Strap Studio watch review</title><style>
body{font:16px system-ui;margin:24px;background:${brand.colors.bg};color:${brand.colors.ink}}
main{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px}
article{background:${brand.colors.white};padding:12px;border:1px solid ${brand.colors.border}}
article div{display:flex;gap:8px}h2{font-size:14px;overflow-wrap:anywhere}
figure{margin:0;flex:1;text-align:center}img{display:block;width:100%;height:205px;object-fit:contain;background:${brand.colors.slot}}
figcaption{font-size:12px;padding:5px}
</style><h1>Strap Studio watch review</h1>
<p>Compare the dial, crown, and both lug channels to the original. Approve only exact-reference cutouts that preserve the watch and remove the original band.</p><main>${rows.join('')}</main></html>`)
}

async function runIngest(supabase: SupabaseClient, dir: string): Promise<void> {
  const directory = path.resolve(dir)
  const requested = new Set(ONLY?.split(',').map(id => id.trim()).filter(Boolean))
  if (!requested.size) fail('Pass --only with the exact catalog IDs you reviewed.')
  const bridge = readBridge()
  let failed = false
  for (const id of requested) {
    try {
      if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) throw new Error('Invalid catalog ID')
      if (bridge[id]?.status === 'approved' && !FORCE) {
        console.log(`Skip ${id} (already approved)`)
        continue
      }
      const { data: watch, error } = await supabase.from('catalog_watches')
        .select('id, brand, model, reference, lug_width_mm, bracelet_type').eq('id', id).single<CatalogEntry>()
      if (error) throw new Error(error.message)
      if (!canUseStraightStraps(watch)) throw new Error('Requires a supported straight-strap lug width')
      const source = fs.readFileSync(path.join(directory, `${id}.png`))
      const norm = await normalizeCaseOnly(source)
      const { geom, confidence } = await deriveLugGeometry(norm.rgba, norm.width, norm.height)
      if (confidence < 0.9) throw new Error('Could not identify both lug channels in the reviewed image')
      assertCaseGeometry(norm.rgba, geom)
      const springBarPath = path.join(directory, `${id}.spring-bars.json`)
      if (fs.existsSync(springBarPath)) {
        const measured: Partial<LugGeometry> = JSON.parse(fs.readFileSync(springBarPath, 'utf8'))
        for (const [key, min, max] of [
          ['topSpringBarY', Math.max(geom.topLugLeft.y, geom.topLugRight.y), norm.height / 3],
          ['bottomSpringBarY', norm.height * 2 / 3, Math.min(geom.bottomLugLeft.y, geom.bottomLugRight.y)],
        ] as const) {
          const y = measured[key]
          if (y === undefined) continue
          if (!Number.isFinite(y) || y < min || y > max) throw new Error(`Invalid ${key} for this cutout`)
          geom[key] = y
        }
      }
      if (!DRY_RUN) {
        const metadataPath = path.join(directory, `${id}.json`)
        const metadata: { sourceId?: string; sourceUrl?: string } = fs.existsSync(metadataPath)
          ? JSON.parse(fs.readFileSync(metadataPath, 'utf8')) : {}
        const { caseOnlyPngUrl, caseOnlyUrl } = await uploadCaseOnly(supabase, id, norm.png, norm.webp)
        const entry: CaseOnlyEntry = {
          caseOnlyUrl, caseOnlyPngUrl, lugGeometry: geom, confidence, status: 'approved', catalogReferenceVerified: true,
          brand: watch.brand, model: watch.model, reference: watch.reference, lugWidthMm: watch.lug_width_mm!,
          sourceCatalogId: metadata.sourceId !== id ? metadata.sourceId : undefined,
          sourcePhotoUrl: metadata.sourceUrl,
        }
        await writeDbColumns(supabase, id, entry)
        bridge[id] = entry
        writeBridge(bridge)
      }
      console.log(`${DRY_RUN ? 'Validated' : 'Approved'} ${id} (${watch.reference}, ${watch.lug_width_mm} mm)`)
    } catch (error) {
      failed = true
      console.error(`Failed ${id}: ${(error as Error).message}`)
    }
  }
  if (failed) process.exitCode = 1
}

function loadSegmentTargets(bridge: Record<string, CaseOnlyEntry>): string[] {
  if (ONLY) return ONLY.split(',').map(s => s.trim()).filter(Boolean)
  const { scores } = JSON.parse(fs.readFileSync(path.join(repoRoot, 'data', 'catalog-heat-scores.json'), 'utf8')) as {
    scores: Record<string, { heatScore: number }>
  }
  const { watches } = JSON.parse(fs.readFileSync(path.join(repoRoot, 'data', 'catalog-live-imaged.json'), 'utf8')) as {
    watches: CatalogEntry[]
  }
  const eligible = watches.filter(watch => canUseStraightStraps(watch) && (FORCE || bridge[watch.id]?.status !== 'approved'))
  const brandCounts = new Map<string, number>()
  const ranked = eligible.map(watch => ({
    watch, score: scores[watch.id]?.heatScore ?? heatScore(watch),
  })).sort((a, b) => b.score - a.score ||
    Number(b.watch.bracelet_type === 'strap') - Number(a.watch.bracelet_type === 'strap'))
    .map(entry => {
      const group = `${entry.score}:${entry.watch.brand}`
      const brandPosition = brandCounts.get(group) ?? 0
      brandCounts.set(group, brandPosition + 1)
      return { ...entry, brandPosition }
    })
  return ranked.sort((a, b) => b.score - a.score || a.brandPosition - b.brandPosition)
    .slice(0, TOP).map(entry => entry.watch.id)
}

async function runSegment(supabase: SupabaseClient, dir: string): Promise<void> {
  if (!ONLY && (!Number.isInteger(TOP) || TOP < 1)) fail('Pass --only or a positive --top.')
  if (SOURCE_ID && (!ONLY || ONLY.includes(',') || !/^[a-z0-9][a-z0-9-]*$/.test(SOURCE_ID))) {
    fail('--source-id requires one exact target in --only and a valid source catalog ID.')
  }
  const bridge = readBridge()
  const ids = [...new Set(loadSegmentTargets(bridge))].filter(id => FORCE || bridge[id]?.status !== 'approved')
  if (DRY_RUN) {
    console.log(ids.join('\n'))
    return
  }
  const token = process.env.REPLICATE_API_TOKEN
  if (!token) fail('Missing REPLICATE_API_TOKEN.')
  fs.mkdirSync(dir, { recursive: true })
  let failed = false
  let lastPrediction = 0
  for (const id of ids) {
    try {
      if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) throw new Error('Invalid catalog ID')
      const cutoutPath = path.join(dir, `${id}.png`)
      if (!FORCE && fs.existsSync(cutoutPath)) {
        console.log(`Skip ${id} (candidate already prepared)`)
        continue
      }
      const sourceId = SOURCE_ID ?? id
      const { data: row, error } = await supabase.from('watch_images')
        .select('webp_url, png_url').eq('catalog_watch_id', sourceId).eq('variant', 'primary').maybeSingle()
      if (error) throw new Error(error.message)
      const srcUrl = row?.png_url || row?.webp_url
      if (!srcUrl) throw new Error('No primary image')
      const response = await fetch(srcUrl, { signal: AbortSignal.timeout(20_000) })
      if (!response.ok) throw new Error(`Primary image HTTP ${response.status}`)
      const source = Buffer.from(await response.arrayBuffer())
      const delay = lastPrediction + 10_500 - Date.now()
      if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay))
      lastPrediction = Date.now()
      const { cutout, confidence } = await segmentWatchHead(source, token)
      const norm = await normalizeCaseOnly(cutout)
      const lug = await deriveLugGeometry(norm.rgba, norm.width, norm.height)
      fs.writeFileSync(path.join(dir, `${id}.original.webp`), await sharp(source).webp().toBuffer())
      fs.writeFileSync(path.join(dir, `${id}.json`), JSON.stringify({ sourceId, segmentationConfidence: confidence, ...lug }, null, 2) + '\n')
      fs.writeFileSync(cutoutPath, norm.png)
      console.log(`Prepared ${id} (SAM ${confidence.toFixed(2)}, lug geometry ${lug.confidence.toFixed(2)})`)
    } catch (error) {
      failed = true
      console.error(`Failed ${id}: ${(error as Error).message}`)
    }
  }
  writeReviewPage(dir)
  console.log(`Review ${path.join(dir, 'review.html')}`)
  if (failed) process.exitCode = 1
}

async function backfillClearance(supabase: SupabaseClient) {
  const bridge = readBridge()
  const ids = ONLY ? [...new Set(ONLY.split(',').map(id => id.trim()).filter(Boolean))]
    : Object.keys(bridge).filter(id => bridge[id].catalogReferenceVerified && bridge[id].status === 'approved')
  for (const id of ids) {
    try {
      const entry = bridge[id]
      if (entry?.status !== 'approved' || !entry.catalogReferenceVerified) throw new Error('No approved exact-reference cutout')
      const response = await fetch(entry.caseOnlyPngUrl, { signal: AbortSignal.timeout(20_000) })
      if (!response.ok) throw new Error(`Cutout HTTP ${response.status}`)
      const { data, info: { width, height } } = await sharp(Buffer.from(await response.arrayBuffer()))
        .ensureAlpha().raw().toBuffer({ resolveWithObject: true })
      const geometry = { ...entry.lugGeometry }
      if (geometry.imageWidth !== width || geometry.imageHeight !== height) throw new Error('Stored dimensions differ from the cutout')
      const top = measureCaseEdge(data, width, height, geometry.topLugLeft, geometry.topLugRight, 1)
      const bottom = measureCaseEdge(data, width, height, geometry.bottomLugLeft, geometry.bottomLugRight, -1)
      if (top === undefined || bottom === undefined) throw new Error('Could not locate both edges of the case')
      // Entries predating the case-edge fields stored calculated spring-bar
      // positions as if they were measurements. Replace those old estimates.
      if (geometry.topCaseEdgeY === undefined) delete geometry.topSpringBarY
      if (geometry.bottomCaseEdgeY === undefined) delete geometry.bottomSpringBarY
      geometry.topCaseEdgeY = top
      geometry.bottomCaseEdgeY = bottom
      if (!DRY_RUN) {
        const { error, count } = await supabase.from('watch_images')
          .update({ lug_geometry: geometry }, { count: 'exact' })
          .eq('catalog_watch_id', id).eq('variant', 'primary').eq('case_only_webp_url', entry.caseOnlyUrl)
        if (error || !count) throw new Error(error?.message || 'Primary image row changed')
        bridge[id] = { ...entry, lugGeometry: geometry }
        writeBridge(bridge)
      }
      console.log(`${id}: case edges at ${top} / ${bottom}`)
    } catch (error) {
      console.error(`Failed ${id}: ${(error as Error).message}`)
      process.exitCode = 1
    }
  }
}

async function main(): Promise<void> {
  if (!SUPABASE_URL) fail('Missing SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL.')
  if (!SUPABASE_KEY && !DRY_RUN) fail('Missing SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY.')
  if ([INGEST_DIR, REVIEW_DIR, MEASURE_CLEARANCE].filter(Boolean).length !== 1) {
    fail('Pass one of --review-dir, --ingest, or --measure-clearance.')
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'anon', {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  if (INGEST_DIR) await runIngest(supabase, INGEST_DIR)
  if (REVIEW_DIR) await runSegment(supabase, REVIEW_DIR)
  if (MEASURE_CLEARANCE) await backfillClearance(supabase)
}

void main().catch(err => {
  console.error(err)
  process.exit(1)
})
