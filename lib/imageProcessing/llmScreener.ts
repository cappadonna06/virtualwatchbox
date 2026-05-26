/**
 * LLM vision screener — catches failure modes the rules screener can't:
 *   - arm/hand visible (wrong subject)
 *   - watch sitting in / on a display box
 *   - upside-down or otherwise mis-oriented (when the rules' aspect-ratio
 *     check passes — e.g. a square watch rotated 90°)
 *   - "incomplete" subjects the rules miss
 *
 * Uses OpenAI gpt-4o-mini vision. Cost is ~$0.001 per image, so a one-off
 * sweep over the full ~7,300-image catalog runs ~$7. Designed to be called
 * AFTER the rules screener has passed — the rules catch cheap obvious cases,
 * the LLM catches subtle wrong-subject cases.
 *
 * Calling convention mirrors scripts/llm-extract-specs.ts (plain `fetch`,
 * OPENAI_API_KEY from env, configurable model).
 */
const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? ''
const MODEL = process.env.LLM_SCREENER_MODEL || 'gpt-4o-mini'

export const LLM_SCREENER_TAGS = [
  'wrong_subject_arm',
  'wrong_subject_box',
  'multi_watch',
  'wrong_orientation',
  'incomplete',
] as const

export type LlmScreenerTag = (typeof LLM_SCREENER_TAGS)[number]

export type LlmScreenerResult = {
  isClean: boolean
  tags: LlmScreenerTag[]
  reason: string
  tokensIn: number
  tokensOut: number
  model: string
}

const SYSTEM_PROMPT = `You are reviewing a product image of a wristwatch for an e-commerce catalog. Respond with JSON only.

A clean image meets ALL of these:
  - exactly one watch in frame (no second watch, no ghost behind)
  - the watch is complete (full case + complete bracelet/strap visible, nothing clipped)
  - oriented vertically (lugs vertical, crown at right or hidden)
  - neutral or transparent background (no display box visible, no arm/hand/wrist, no shelf, no packaging)

Otherwise list the issues from this fixed vocabulary:
  - "wrong_subject_arm"     — an arm, hand, or wrist is visible (often wearing a different watch)
  - "wrong_subject_box"     — the watch is sitting inside or on a display box / case / packaging
  - "multi_watch"           — two or more watches in the frame (side-by-side, or one behind the other)
  - "wrong_orientation"     — the watch is rotated (e.g. 90° on its side, upside down)
  - "incomplete"            — case, bracelet, or strap is clipped or missing

If unsure, prefer "is_clean: true".

Output schema (return ONLY this JSON object, no commentary):
{
  "is_clean": true | false,
  "issues": ["wrong_subject_arm", "wrong_subject_box", "multi_watch", "wrong_orientation", "incomplete"],   // subset; empty array if is_clean is true
  "reason": "one short sentence (≤ 80 chars) describing what you see"
}`

export async function llmScreenImage(input: Buffer | string): Promise<LlmScreenerResult> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set — required for LLM screener')
  }

  // Accept a Buffer (file bytes) or a string (URL). Convert Buffer to data URL.
  const imageUrl: string = typeof input === 'string'
    ? input
    : `data:image/png;base64,${input.toString('base64')}`

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Review this watch image and respond with the JSON schema.' },
            { type: 'image_url', image_url: { url: imageUrl, detail: 'low' } },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 256,
      temperature: 0,
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`llmScreener: openai HTTP ${res.status}: ${body.slice(0, 300)}`)
  }

  const json = (await res.json()) as {
    choices: Array<{ message: { content: string } }>
    usage?: { prompt_tokens?: number; completion_tokens?: number }
    model?: string
  }
  const text = json.choices[0]?.message?.content ?? '{}'

  let parsed: { is_clean?: boolean; issues?: string[]; reason?: string } = {}
  try {
    parsed = JSON.parse(text)
  } catch {
    // Defensive — model returned something unparseable
    return {
      isClean: true,                  // prefer permissive on error
      tags: [],
      reason: `parse error: ${text.slice(0, 80)}`,
      tokensIn: json.usage?.prompt_tokens ?? 0,
      tokensOut: json.usage?.completion_tokens ?? 0,
      model: json.model ?? MODEL,
    }
  }

  const validTags = new Set(LLM_SCREENER_TAGS as readonly string[])
  const tags = (parsed.issues ?? []).filter(t => validTags.has(t)) as LlmScreenerTag[]

  return {
    isClean: parsed.is_clean === true && tags.length === 0,
    tags,
    reason: (parsed.reason ?? '').slice(0, 200),
    tokensIn: json.usage?.prompt_tokens ?? 0,
    tokensOut: json.usage?.completion_tokens ?? 0,
    model: json.model ?? MODEL,
  }
}

// Estimated cost (USD) for a single screener call. Numbers are gpt-4o-mini
// pricing at $0.15/M in, $0.60/M out, plus the ~85-token image at low detail.
export function estimateCostUsd(tokensIn: number, tokensOut: number): number {
  const inUsd = tokensIn * 0.15 / 1_000_000
  const outUsd = tokensOut * 0.60 / 1_000_000
  return inUsd + outUsd
}
