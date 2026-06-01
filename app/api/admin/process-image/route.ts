import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { processWatchImageBuffer } from '@/lib/imageProcessing'
import { identifyWatchWithVision } from '@/lib/watchVision'
import { lookupReferenceCandidates, type ReferenceCandidate } from '@/lib/referenceLookup'
import { type VerifyExpected } from '@/lib/watchVerify'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { watches as staticCatalog } from '@/lib/watches'

// Some input formats (notably AVIF and HEIC from iPhone exports) trip up the
// alpha-aware background-removal pipeline that processWatchImageBuffer runs.
// As a fallback when the rich pipeline fails, produce a simple resize-only
// PNG/WebP so the admin can still upload a working catalog photo. The
// background removal is a nice-to-have, not a hard requirement.
async function fallbackProcess(inputBuffer: Buffer) {
  const sourceMeta = await sharp(inputBuffer).metadata()
  const sourceWidth = sourceMeta.width ?? 0
  const sourceHeight = sourceMeta.height ?? 0
  const pngBuffer = await sharp(inputBuffer)
    .rotate()
    .resize({ height: 900, withoutEnlargement: false })
    .flatten({ background: '#ffffff' })
    .png()
    .toBuffer()
  const webpBuffer = await sharp(pngBuffer).webp({ quality: 88 }).toBuffer()
  const meta = await sharp(pngBuffer).metadata()
  return {
    pngBuffer,
    webpBuffer,
    sourceWidth,
    sourceHeight,
    processedWidth: meta.width ?? 0,
    processedHeight: meta.height ?? 0,
    backgroundRemovalApplied: false,
  }
}

export const maxDuration = 60
export const runtime = 'nodejs'

async function loadExpectedWatch(watchId: string): Promise<VerifyExpected | null> {
  // Two possible sources, in order:
  //   1. Supabase catalog_watches table (admin-curated or user-submitted rows)
  //   2. Static seed in lib/watches.ts (the bootstrap catalog)
  //
  // The service-role client is used for the DB read so admins can verify
  // pending submissions owned by other users — those rows are scoped to the
  // submitter by RLS otherwise.
  const supabase = createAdminClient() ?? createClient()
  const { data, error } = await supabase
    .from('catalog_watches')
    .select('brand, model, reference, dial_color, case_size_mm, case_material')
    .eq('id', watchId)
    .maybeSingle()
  if (!error && data) {
    return {
      brand: String(data.brand ?? ''),
      model: String(data.model ?? ''),
      reference: String(data.reference ?? ''),
      dialColor: String(data.dial_color ?? ''),
      caseSizeMm: typeof data.case_size_mm === 'number' ? data.case_size_mm : null,
      caseMaterial: String(data.case_material ?? ''),
    }
  }

  // Static seed fallback — replacing the photo on a seed watch (which has no
  // Supabase row yet) should still run in verify mode against the seed's
  // metadata. The user-photo `approve-image` flow writes only to watch_images
  // / catalog_watches.image_url and doesn't depend on the seed having a DB row.
  const seed = staticCatalog.find(w => w.id === watchId)
  if (seed) {
    return {
      brand: seed.brand,
      model: seed.model,
      reference: seed.reference,
      dialColor: seed.dialColor,
      caseSizeMm: seed.caseSizeMm,
      caseMaterial: seed.caseMaterial,
    }
  }

  return null
}

export async function POST(request: NextRequest) {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.response

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('image') as File | null
  if (!file) return NextResponse.json({ error: 'No image provided' }, { status: 400 })

  const expectedWatchIdRaw = formData.get('expectedWatchId')
  const expectedWatchId = typeof expectedWatchIdRaw === 'string' && expectedWatchIdRaw.trim()
    ? expectedWatchIdRaw.trim()
    : null

  const filename = file.name
  const inputBuffer = Buffer.from(await file.arrayBuffer())

  let processed
  try {
    processed = await processWatchImageBuffer(inputBuffer)
  } catch (err) {
    console.error('[admin/process-image] Sharp processing failed, trying fallback:', err)
    try {
      processed = await fallbackProcess(inputBuffer)
    } catch (fallbackErr) {
      console.error('[admin/process-image] Fallback also failed:', fallbackErr)
      const detail = fallbackErr instanceof Error ? fallbackErr.message : 'Image processing failed'
      return NextResponse.json({ error: detail }, { status: 422 })
    }
  }

  // Verify mode: a watchId was passed.
  //
  // Stay in verify mode whenever the URL signaled it — admin landed here
  // intentionally to replace a specific watch's photo. Falling back to the
  // expensive intake pipeline would surprise the admin with the AI inventing
  // a brand-new catalog row id that the upload doesn't even target. If the
  // row can't be located (DB miss + not in static seed), return verify mode
  // with `expected: null` so the UI can render a clear "row not found"
  // warning instead of pretending to identify the watch from scratch.
  //
  // No AI re-confirmation: the admin already named the exact ref, so a vision
  // call to "confirm" the match is pure latency/cost with no decision value —
  // they see the before/after and approve. `verification` stays null.
  if (expectedWatchId) {
    const expected = await loadExpectedWatch(expectedWatchId)
    return NextResponse.json({
      mode: 'verify' as const,
      pngDataUrl: `data:image/png;base64,${processed.pngBuffer.toString('base64')}`,
      webpDataUrl: `data:image/webp;base64,${processed.webpBuffer.toString('base64')}`,
      sourceWidth: processed.sourceWidth,
      sourceHeight: processed.sourceHeight,
      processedWidth: processed.processedWidth,
      processedHeight: processed.processedHeight,
      backgroundRemovalApplied: processed.backgroundRemovalApplied,
      expected,
      verification: null,
    })
  }

  // Intake mode: identify + reference lookup.
  const identification = await identifyWatchWithVision(inputBuffer, filename)

  let referenceCandidates: ReferenceCandidate[] = []
  let estimatedValueUsd: number | null = null
  let estimatedValueSource: string | null = null
  // Skip the expensive web-search lookup when the image isn't a watch.
  if (identification && identification.subject === 'watch') {
    try {
      // Pass the filename so the lookup can use any SKU-like tokens in it
      // (e.g. "...l3-830-4-92-6-hero.jpg") as a strong prior.
      const lookup = await lookupReferenceCandidates(identification, filename)
      referenceCandidates = lookup.candidates
      estimatedValueUsd = lookup.estimatedValueUsd
      estimatedValueSource = lookup.estimatedValueSource ?? null
    } catch (err) {
      console.warn('[admin/process-image] reference lookup failed (non-fatal):', err)
    }
  }

  // If we got a market value back from the lookup but the AI vision didn't, fold it
  // into the identification so the admin UI's existing fields fill in.
  const enrichedIdentification = identification && estimatedValueUsd && (!identification.estimatedValue || identification.estimatedValue <= 0)
    ? { ...identification, estimatedValue: estimatedValueUsd }
    : identification

  return NextResponse.json({
    mode: 'intake' as const,
    pngDataUrl: `data:image/png;base64,${processed.pngBuffer.toString('base64')}`,
    webpDataUrl: `data:image/webp;base64,${processed.webpBuffer.toString('base64')}`,
    sourceWidth: processed.sourceWidth,
    sourceHeight: processed.sourceHeight,
    processedWidth: processed.processedWidth,
    processedHeight: processed.processedHeight,
    backgroundRemovalApplied: processed.backgroundRemovalApplied,
    identification: enrichedIdentification,
    referenceCandidates,
    estimatedValueUsd,
    estimatedValueSource,
  })
}
