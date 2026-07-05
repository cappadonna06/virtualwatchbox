/**
 * Case-only watch segmentation pipeline (Strap Studio — Feature 7).
 *
 * Produces a "case only" render of each watch (case/head opaque, strap/bracelet
 * region transparent) so the Strap Studio can layer a strap image BEHIND the
 * watch head for a true composite. Also derives lug-attachment geometry (where
 * the strap meets the case) used to position + width-scale the strap.
 *
 * The segmentation algorithms (providers) live in lib/caseSegmentation.ts —
 * this file is the CLI/orchestration layer: argument parsing, Supabase I/O,
 * the tiered 'auto' escalation policy, and the committed static bridge.
 *
 * ── Why the old default (generic promptable SAM segmentation) didn't work ──
 * Catalog photos already have clean transparent backgrounds — the hard part
 * was never "find the watch," it's "find where the case ends and the strap
 * begins" WITHIN a silhouette we already have. Generic segmentation models
 * (grounded-SAM et al.) have no notion of "watch lug" and need a REPLICATE_API_TOKEN
 * that was never actually configured for this project — that path produced
 * zero real segmentations. See docs/playbooks/case-segmentation-strategy.md.
 *
 * ── Providers (swappable, provider-agnostic — see lib/caseSegmentation.ts) ──
 *   • GeometricSilhouetteProvider (DEFAULT, tier 0, free) — width-profile
 *     boundary detection on the existing alpha channel. Weak on integrated-
 *     bracelet designs by construction (no sharp width transition) — which is
 *     the correct signal to escalate or skip, not a bug.
 *   • ClaudeVisionLandmarkProvider (tier 1, escalation) — for low-confidence
 *     geometric results, asks Claude's vision API for the four lug-tip
 *     landmark points directly as structured tool output (ANTHROPIC_API_KEY).
 *   • ReplicateSamProvider (tier 2, rare heavy fallback) — SAM/grounded-SAM via
 *     the Replicate REST API (REPLICATE_API_TOKEN). No longer the default.
 *   • OpenAiMaskProvider (documented fallback, not wired for batch use).
 *   • --ingest mode bypasses providers entirely: the inputs are ALREADY
 *     case-only (e.g. curated 3D renders in public/demo-cases), so we only
 *     normalize → derive geometry → upload.
 *
 * Catalog watches tagged bracelet_type='integrated' (Royal Oak / Nautilus
 * style, where the bracelet visually flows into the case with no drilled lug)
 * are skipped outright — the Studio's own product design already keeps those
 * side-by-side rather than composited, so attempting a cutout would be
 * fighting the product, not a segmentation shortfall.
 *
 * ── Usage ──────────────────────────────────────────────────────────────────
 *   # Ingest pre-segmented case-only renders (curated 3D demo assets):
 *   npm run straps:segment-cases -- --ingest public/demo-cases
 *
 *   # Segment the top 100 by heat score (default: geometric + Claude escalation):
 *   npm run straps:segment-cases -- --top 100 --by heat-score
 *   npm run straps:segment-cases -- --only=tudor-black-bay-gmt-m79830rb
 *   npm run straps:segment-cases -- --top 300 --by model-family   # grouped batch + per-cluster report
 *   #   --force               regenerate even if case-only already exists
 *   #   --provider=geometric  force the free tier only, no Claude escalation
 *   #   --provider=claude     force the Claude vision tier for every target
 *   #   --provider=replicate  legacy heavy fallback
 *   #   DRY_RUN=1             preview, no uploads / writes
 *
 * Required env (loaded from .env.local): SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL,
 * SUPABASE_SECRET_KEY/SERVICE_ROLE_KEY. ANTHROPIC_API_KEY enables tier-1
 * escalation; REPLICATE_API_TOKEN enables the legacy tier-2 fallback. Neither
 * is required for tier-0 (geometric) segmentation to run.
 */

import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { cropToAlphaBounds } from '../lib/imageProcessing'
import {
  GeometricSilhouetteProvider,
  ClaudeVisionLandmarkProvider,
  ReplicateSamProvider,
  OpenAiMaskProvider,
  deriveLugGeometry,
  applyCaseMask,
  type LugGeometry,
  type CaseShape,
  type StrapAttachment,
  type SegmentationProvider,
  type SegmentationResult,
} from '../lib/caseSegmentation'
import { loadLocalEnv, repoRoot } from './watch-image-pipeline'

loadLocalEnv()

const BUCKET = 'watch-images'
const OUTPUT_HEIGHT = 900
const BRIDGE_PATH = path.join(repoRoot, 'data', 'case-only-images.json')
const CATALOG_LIVE_PATH = path.join(repoRoot, 'data', 'catalog-live-imaged.json')

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
const BY = (arg('--by') ?? 'heat-score').toLowerCase()
const PROVIDER = (arg('--provider') ?? 'auto').toLowerCase()
const FORCE = ARGV.includes('--force')
const DRY_RUN = process.env.DRY_RUN === '1'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY

type BridgeStatus = 'pending' | 'approved' | 'needs_review' | 'rejected'
type BridgeEntry = {
  caseOnlyUrl: string
  caseOnlyPngUrl: string
  lugGeometry: LugGeometry
  lugWidthMm?: number
  brand?: string
  model?: string
  reference?: string
  confidence: number
  status: BridgeStatus
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
        console.warn(`  ⚠ watch_images case-only columns missing — apply migration 032/034.`)
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

async function markNotApplicable(supabase: SupabaseClient, id: string): Promise<void> {
  if (DRY_RUN) return
  try {
    await supabase
      .from('watch_images')
      .update({ segmentation_status: 'not_applicable' })
      .eq('catalog_watch_id', id)
      .eq('variant', 'primary')
  } catch {
    // best-effort — see writeDbColumns
  }
}

async function writeCaseClassification(
  supabase: SupabaseClient, id: string, caseShape: CaseShape | undefined, strapAttachment: StrapAttachment | undefined,
): Promise<void> {
  if (DRY_RUN || (!caseShape && !strapAttachment)) return
  try {
    const patch: Record<string, string> = {}
    if (caseShape) patch.case_shape = caseShape
    if (strapAttachment) patch.strap_attachment_type = strapAttachment
    await supabase.from('catalog_watches').update(patch).eq('id', id)
  } catch {
    // best-effort — column may not exist yet if migration 034 isn't applied
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

type CatalogMeta = {
  braceletType: string | null
  modelFamily: string | null
  caseSizeMm: number | null
  brand: string
  model: string
  reference: string
}

function loadCatalogMeta(): Map<string, CatalogMeta> {
  const map = new Map<string, CatalogMeta>()
  try {
    const raw = JSON.parse(fs.readFileSync(CATALOG_LIVE_PATH, 'utf8')) as { watches: Array<Record<string, unknown>> }
    for (const w of raw.watches ?? []) {
      map.set(w.id as string, {
        braceletType: (w.bracelet_type as string) ?? null,
        modelFamily: (w.model_family as string) ?? null,
        caseSizeMm: (w.case_size_mm as number) ?? null,
        brand: (w.brand as string) ?? '',
        model: (w.model as string) ?? '',
        reference: (w.reference as string) ?? '',
      })
    }
  } catch {
    // Optional — clustering/skip logic degrades to "process everything" if missing.
  }
  return map
}

function getProvider(): SegmentationProvider {
  if (PROVIDER === 'openai') return new OpenAiMaskProvider()
  if (PROVIDER === 'claude') return new ClaudeVisionLandmarkProvider()
  if (PROVIDER === 'replicate') return new ReplicateSamProvider()
  return new GeometricSilhouetteProvider()
}

const ESCALATE_BELOW = Number(process.env.SEGMENT_CONFIDENCE_ESCALATE ?? 0.7)
const AUTO_APPROVE_AT = Number(process.env.SEGMENT_AUTO_APPROVE ?? 0.9)
const NEEDS_REVIEW_BELOW = 0.55

// The 'auto' orchestrator: free tier first, pay for semantic reasoning only
// on the hard cases.
async function segmentAuto(imageBuffer: Buffer, id: string): Promise<{ result: SegmentationResult; providerUsed: string }> {
  const geo = await new GeometricSilhouetteProvider().segmentCase(imageBuffer)
  if (geo.confidence >= ESCALATE_BELOW || !process.env.ANTHROPIC_API_KEY) {
    return { result: geo, providerUsed: 'geometric' }
  }
  try {
    const claude = await new ClaudeVisionLandmarkProvider().segmentCase(imageBuffer)
    return claude.confidence > geo.confidence
      ? { result: claude, providerUsed: 'claude' }
      : { result: geo, providerUsed: 'geometric' }
  } catch (e) {
    console.warn(`  ⚠ claude escalation failed for ${id}, keeping geometric result: ${(e as Error).message}`)
    return { result: geo, providerUsed: 'geometric' }
  }
}

function statusForConfidence(confidence: number): BridgeStatus {
  if (confidence >= AUTO_APPROVE_AT) return 'approved'
  if (confidence >= NEEDS_REVIEW_BELOW) return 'pending'
  return 'needs_review'
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

async function loadSegmentTargets(supabase: SupabaseClient, catalogMeta: Map<string, CatalogMeta>): Promise<string[]> {
  if (ONLY) return ONLY.split(',').map(s => s.trim()).filter(Boolean)
  const heat = JSON.parse(fs.readFileSync(path.join(repoRoot, 'data', 'catalog-heat-scores.json'), 'utf8')) as Record<string, number>
  let ranked = Object.entries(heat).sort(([, a], [, b]) => b - a).map(([id]) => id)

  if (BY === 'model-family') {
    // Group by (brand, model_family, bracelet_type) so a batch's admin-review
    // pass reads as "one case family at a time" rather than shuffled by heat
    // score alone — makes it obvious when a whole family shares one failure
    // mode (e.g. all Milanese-mesh Aqua Terras hit the same low confidence).
    const clusterKey = (id: string) => {
      const m = catalogMeta.get(id)
      return m ? `${m.brand}::${m.modelFamily ?? m.model}::${m.braceletType ?? 'na'}` : `unknown::${id}`
    }
    const order = new Map<string, number>()
    ranked.forEach((id, i) => { if (!order.has(clusterKey(id))) order.set(clusterKey(id), i) })
    ranked = [...ranked].sort((a, b) => (order.get(clusterKey(a))! - order.get(clusterKey(b))!) || (clusterKey(a).localeCompare(clusterKey(b))))
  }

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
  const catalogMeta = loadCatalogMeta()
  const ids = await loadSegmentTargets(supabase, catalogMeta)
  if (!ids.length) { console.log('[segment-cases] nothing to segment (all done, or empty heat list).'); return }
  console.log(`[segment-cases] segmenting ${ids.length} watch(es) via provider="${PROVIDER}"\n`)
  const bridge = readBridge()
  const clusterStats = new Map<string, { count: number; sumConfidence: number; skipped: number }>()
  let ok = 0
  let fa = 0
  let skipped = 0
  for (const id of ids) {
    const meta = catalogMeta.get(id)
    const clusterKey = meta ? `${meta.brand} ${meta.modelFamily ?? meta.model}` : id

    if (meta?.braceletType === 'integrated') {
      skipped += 1
      await markNotApplicable(supabase, id)
      console.log(`  · skip ${id} (integrated bracelet — Studio uses side-by-side, not a cutout)`)
      const s = clusterStats.get(clusterKey) ?? { count: 0, sumConfidence: 0, skipped: 0 }
      s.skipped += 1
      clusterStats.set(clusterKey, s)
      continue
    }

    try {
      if (!FORCE && await objectExists(supabase, `${id}/case-only.webp`)) { console.log(`  · skip ${id} (exists)`); continue }
      const { data: rows } = await supabase.from('watch_images').select('webp_url, png_url').eq('catalog_watch_id', id).eq('variant', 'primary').limit(1)
      const srcUrl = rows?.[0]?.png_url || rows?.[0]?.webp_url
      if (!srcUrl) { console.warn(`  ✗ ${id}: no primary image`); fa += 1; continue }
      const srcBuf = Buffer.from(await (await fetch(srcUrl)).arrayBuffer())

      const { result, providerUsed } = PROVIDER === 'auto'
        ? await segmentAuto(srcBuf, id)
        : { result: await getProvider().segmentCase(srcBuf, { braceletType: meta?.braceletType ?? undefined }), providerUsed: PROVIDER }

      const masked = await applyCaseMask(srcBuf, result.caseMask)
      const norm = await normalizeCaseOnly(masked)

      // Providers that already output semantic lug geometry (Claude tier, the
      // geometric tier itself) keep it; only fall back to the legacy
      // channel-gap heuristic when a provider (e.g. Replicate) returned none.
      const { geom, confidence: geomConf } = result.lugGeometry
        ? { geom: result.lugGeometry, confidence: result.confidence }
        : await deriveLugGeometry(norm.rgba, norm.width, norm.height)

      const { caseOnlyPngUrl, caseOnlyUrl } = await uploadCaseOnly(supabase, id, norm.png, norm.webp)
      const confidence = Math.min(result.confidence, geomConf)
      const entry: BridgeEntry = {
        caseOnlyUrl, caseOnlyPngUrl, lugGeometry: geom,
        confidence, status: statusForConfidence(confidence),
      }
      bridge[id] = entry
      await writeDbColumns(supabase, id, entry)
      await writeCaseClassification(supabase, id, result.caseShape, result.strapAttachment)
      ok += 1
      const s = clusterStats.get(clusterKey) ?? { count: 0, sumConfidence: 0, skipped: 0 }
      s.count += 1
      s.sumConfidence += confidence
      clusterStats.set(clusterKey, s)
      console.log(`  ✓ ${id} (${providerUsed}, conf=${confidence.toFixed(2)}) → ${entry.status}`)
    } catch (e) {
      fa += 1
      console.warn(`  ✗ ${id}: ${(e as Error).message}`)
    }
  }
  writeBridge(bridge)
  console.log(`\n[segment-cases] segment done: ${ok} ok, ${skipped} skipped (integrated), ${fa} failed. Review in /admin/image-review → Case Segmentation.`)

  if (BY === 'model-family' && clusterStats.size) {
    console.log('\n[segment-cases] per-family summary:')
    const rows = [...clusterStats.entries()].sort(([, a], [, b]) => b.count - a.count)
    for (const [key, s] of rows) {
      const avg = s.count ? (s.sumConfidence / s.count).toFixed(2) : '—'
      console.log(`  ${key.padEnd(40)} processed=${s.count}  skipped=${s.skipped}  avgConfidence=${avg}`)
    }
  }
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
