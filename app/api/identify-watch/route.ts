import { NextRequest, NextResponse } from 'next/server'
import { identifyWatchWithVision, type DialBbox, type WatchIdentification } from '@/lib/watchVision'
import { lookupReferenceCandidates, type ReferenceCandidate } from '@/lib/referenceLookup'
import { matchCatalog, type CatalogMatchMethod } from '@/lib/catalogMatch'
import { watches } from '@/lib/watches'

export const maxDuration = 60
export const runtime = 'nodejs'

type AiResult = {
  brand: string
  model: string
  reference: string | null
  referenceShort: string | null
  dialColor: string
  caseSize: number | null
  confidence: number
  identificationNotes: string
  alternates: Array<{ brand: string; model: string; reference: string | null; confidence: number }>
}

type IdentifyResponse = {
  subject: 'watch' | 'not_watch'
  subjectLabel: string
  aiResult: AiResult
  catalogMatches: typeof watches
  matchMethod: CatalogMatchMethod
  referenceCandidates: ReferenceCandidate[]
  estimatedValueUsd: number | null
  estimatedValueSource: string | null
  dialBbox: DialBbox | null
}

function confidenceToScore(c: WatchIdentification['confidence']): number {
  switch (c) {
    case 'high': return 0.9
    case 'medium': return 0.65
    case 'low': return 0.3
    case 'unmatched': return 0.1
  }
}

function adapt(id: WatchIdentification, primaryRef: string | null): AiResult {
  return {
    brand: id.brand,
    model: id.model,
    reference: primaryRef,
    referenceShort: null,
    dialColor: id.dialColor,
    caseSize: id.caseSizeMm,
    confidence: confidenceToScore(id.confidence),
    identificationNotes: id.notes,
    alternates: [],
  }
}

export async function POST(request: NextRequest) {
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'invalid_form' }, { status: 400 })
  }

  const file = formData.get('image')
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'no_image' }, { status: 400 })
  }

  let buffer: Buffer
  try {
    buffer = Buffer.from(await file.arrayBuffer())
  } catch {
    return NextResponse.json({ error: 'invalid_image' }, { status: 422 })
  }

  let identification: WatchIdentification | null
  try {
    identification = await identifyWatchWithVision(buffer, file.name || 'upload')
  } catch (err) {
    console.error('[identify-watch] vision call threw:', err)
    return NextResponse.json({ error: 'identification_unavailable' }, { status: 503 })
  }

  if (!identification) {
    return NextResponse.json({ error: 'identification_unavailable' }, { status: 503 })
  }

  // Short-circuit when the image isn't a watch — skip the expensive web-search lookup
  // and return a marker the UI can render the playful "not a watch" panel against.
  if (identification.subject === 'not_watch') {
    const body: IdentifyResponse = {
      subject: 'not_watch',
      subjectLabel: identification.subjectLabel,
      aiResult: adapt(identification, null),
      catalogMatches: [],
      matchMethod: 'none',
      referenceCandidates: [],
      estimatedValueUsd: null,
      estimatedValueSource: null,
      dialBbox: null,
    }
    return NextResponse.json(body)
  }

  let referenceCandidates: ReferenceCandidate[] = []
  let estimatedValueUsd: number | null = null
  let estimatedValueSource: string | null = null
  try {
    const lookup = await lookupReferenceCandidates(identification)
    referenceCandidates = lookup.candidates
    estimatedValueUsd = lookup.estimatedValueUsd
    estimatedValueSource = lookup.estimatedValueSource ?? null
  } catch (err) {
    console.warn('[identify-watch] reference lookup failed (non-fatal):', err)
  }

  const candidateRefs = referenceCandidates.map(c => c.reference)
  const primaryRef = candidateRefs[0] ?? null

  const aiResult = adapt(identification, primaryRef)
  const { matches, method } = matchCatalog(
    { brand: identification.brand, model: identification.model, references: candidateRefs },
    watches,
  )

  const body: IdentifyResponse = {
    subject: 'watch',
    subjectLabel: '',
    aiResult,
    catalogMatches: matches,
    matchMethod: method,
    referenceCandidates,
    estimatedValueUsd,
    estimatedValueSource,
    dialBbox: identification.dialBbox,
  }

  return NextResponse.json(body)
}
