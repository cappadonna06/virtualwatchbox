import { NextRequest, NextResponse } from 'next/server'
import { processWatchImageBuffer } from '@/lib/imageProcessing'
import { identifyWatchWithVision } from '@/lib/watchVision'
import { lookupReferenceCandidates, type ReferenceCandidate } from '@/lib/referenceLookup'
import { verifyWatchImage, type WatchVerification, type VerifyExpected } from '@/lib/watchVerify'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60
export const runtime = 'nodejs'

async function loadExpectedWatch(watchId: string): Promise<VerifyExpected | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('catalog_watches')
    .select('brand, model, reference, dial_color, case_size_mm, case_material')
    .eq('id', watchId)
    .maybeSingle()
  if (error || !data) return null
  return {
    brand: String(data.brand ?? ''),
    model: String(data.model ?? ''),
    reference: String(data.reference ?? ''),
    dialColor: String(data.dial_color ?? ''),
    caseSizeMm: typeof data.case_size_mm === 'number' ? data.case_size_mm : null,
    caseMaterial: String(data.case_material ?? ''),
  }
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
    console.error('[admin/process-image] Sharp processing failed:', err)
    return NextResponse.json({ error: 'Image processing failed' }, { status: 422 })
  }

  // Verify mode: a watchId was passed and matches a real catalog row.
  // Cheap single vision call, no web search.
  if (expectedWatchId) {
    const expected = await loadExpectedWatch(expectedWatchId)
    if (expected) {
      let verification: WatchVerification | null = null
      try {
        verification = await verifyWatchImage(inputBuffer, filename, expected)
      } catch (err) {
        console.warn('[admin/process-image] verify failed (non-fatal):', err)
      }
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
        verification,
      })
    }
    // expectedWatchId provided but unknown — fall through to intake mode so admin
    // can still process the upload rather than getting a hard error.
  }

  // Intake mode: identify + reference lookup.
  const identification = await identifyWatchWithVision(inputBuffer, filename)

  let referenceCandidates: ReferenceCandidate[] = []
  let estimatedValueUsd: number | null = null
  let estimatedValueSource: string | null = null
  // Skip the expensive web-search lookup when the image isn't a watch.
  if (identification && identification.subject === 'watch') {
    try {
      const lookup = await lookupReferenceCandidates(identification)
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
