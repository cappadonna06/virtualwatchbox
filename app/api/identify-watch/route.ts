import { NextRequest, NextResponse } from 'next/server'
import { identifyWatchWithVision, type WatchIdentification } from '@/lib/watchVision'
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
  aiResult: AiResult
  catalogMatches: typeof watches
  matchMethod: CatalogMatchMethod
}

function confidenceToScore(c: WatchIdentification['confidence']): number {
  switch (c) {
    case 'high': return 0.9
    case 'medium': return 0.65
    case 'low': return 0.3
    case 'unmatched': return 0.1
  }
}

function adapt(id: WatchIdentification): AiResult {
  return {
    brand: id.brand,
    model: id.model,
    reference: id.reference ? id.reference : null,
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

  const aiResult = adapt(identification)
  const { matches, method } = matchCatalog(
    { brand: identification.brand, model: identification.model, reference: identification.reference },
    watches,
  )

  const body: IdentifyResponse = {
    aiResult,
    catalogMatches: matches,
    matchMethod: method,
  }

  return NextResponse.json(body)
}
