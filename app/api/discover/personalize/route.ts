import { NextResponse } from 'next/server'
import { fetchOpenAIWithRetry, extractResponseText, parseVisionJson } from '@/lib/watchVision'

export const runtime = 'nodejs'

type CollectionLine = {
  brand: string
  model: string
  type?: string | null
  dialColor?: string | null
  value?: number | null
}

type RequestBody = {
  collection: CollectionLine[]
  gap?: { type: string; gapLabel: string } | null
  leadPick?: { brand: string; model: string; reference: string; type: string; value?: number } | null
  brandRead?: string | null
  priceTarget?: number | null
}

type Payload = { read: string; leadInsight: string }

const SYSTEM_PROMPT = [
  'You are a watch editor at Virtual Watchbox, a luxury-tech app for serious collectors.',
  'Voice: sophisticated, dry, observant. Like a confident bylined column — not a marketing email.',
  'Avoid clichés. Never use: timepiece, ticker, horological, "stunning", "exquisite", "the perfect watch", exclamation points, em-dash-as-drama.',
  'Prefer specifics over flourish. Reference materials, dial colors, complications, eras when grounded in the collection.',
  'Output VALID JSON only. No prose around it. No markdown fences. Exactly: {"read":"...","leadInsight":"..."}.',
  'Field constraints:',
  '- "read": a single short editorial phrase, 5–12 words, lowercase-first-word style. Describes the collection\'s character. Example shapes: "tool-leaning, with a quiet preference for blue dials", "sport-led, sub-$10K, modern Tudor at the core". No trailing period.',
  '- "leadInsight": a 1–2 sentence italic editorial paragraph (35–55 words) explaining why the identified gap matters in THIS collection specifically. Reference 1–2 watches the user actually owns by short name. Don\'t restate the pick — explain the hole. End with a period.',
].join(' ')

function compactCollection(c: CollectionLine[]): string {
  return c.slice(0, 20).map(w => {
    const bits = [
      `${w.brand} ${w.model}`,
      w.type && w.type !== '' ? w.type : null,
      w.dialColor ? `${w.dialColor} dial` : null,
      w.value ? `~$${Math.round(w.value).toLocaleString('en-US')}` : null,
    ].filter(Boolean)
    return `- ${bits.join(' · ')}`
  }).join('\n')
}

function fallback(): Payload {
  return {
    read: '',
    leadInsight: '',
  }
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ ok: false, reason: 'no-key', ...fallback() }, { status: 200 })
  }

  let body: RequestBody
  try {
    body = await req.json() as RequestBody
  } catch {
    return NextResponse.json({ ok: false, reason: 'bad-body', ...fallback() }, { status: 400 })
  }

  if (!Array.isArray(body.collection) || body.collection.length === 0) {
    return NextResponse.json({ ok: false, reason: 'empty-collection', ...fallback() }, { status: 200 })
  }

  const gapLine = body.gap
    ? `The collection is missing a "${body.gap.type}" (gap label: "${body.gap.gapLabel}").`
    : 'No specific gap identified — speak to the collection\'s overall character.'
  const leadValueBit = body.leadPick?.value ? ` ~$${Math.round(body.leadPick.value).toLocaleString('en-US')}` : ''
  const leadLine = body.leadPick
    ? `The deterministic lead pick is: ${body.leadPick.brand} ${body.leadPick.model} (${body.leadPick.reference}, a ${body.leadPick.type}${leadValueBit}). Do not name it in "leadInsight" — explain the gap, not the pick.`
    : ''
  const priceLine = body.priceTarget
    ? `Price context: the collection's median value is roughly $${Math.round(body.priceTarget).toLocaleString('en-US')}. The pick sits in that band on purpose — the leadInsight should sound like a peer recommendation, not a stretch grail.`
    : ''
  const brandReadHint = body.brandRead
    ? `Rules-based read for reference (improve on this, don't echo it): "${body.brandRead}"`
    : ''

  const userPrompt = [
    `Collection (${body.collection.length} watches):`,
    compactCollection(body.collection),
    '',
    gapLine,
    leadLine,
    priceLine,
    brandReadHint,
  ].filter(Boolean).join('\n')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 3000)

  try {
    const response = await fetchOpenAIWithRetry({
      model: process.env.OPENAI_DISCOVER_MODEL ?? 'gpt-4.1-mini',
      input: [
        { role: 'system', content: [{ type: 'input_text', text: SYSTEM_PROMPT }] },
        { role: 'user', content: [{ type: 'input_text', text: userPrompt }] },
      ],
      temperature: 0.6,
      max_output_tokens: 220,
    }, apiKey)

    clearTimeout(timeout)
    if (!response?.ok) {
      return NextResponse.json({ ok: false, reason: 'upstream', ...fallback() }, { status: 200 })
    }
    const raw = parseVisionJson(extractResponseText(await response.json()))
    if (!raw) {
      return NextResponse.json({ ok: false, reason: 'parse', ...fallback() }, { status: 200 })
    }
    const read = typeof raw.read === 'string' ? raw.read.trim() : ''
    const leadInsight = typeof raw.leadInsight === 'string' ? raw.leadInsight.trim() : ''
    if (!read || !leadInsight) {
      return NextResponse.json({ ok: false, reason: 'empty', ...fallback() }, { status: 200 })
    }
    return NextResponse.json({ ok: true, read, leadInsight }, { status: 200 })
  } catch {
    clearTimeout(timeout)
    return NextResponse.json({ ok: false, reason: 'error', ...fallback() }, { status: 200 })
  }
}
