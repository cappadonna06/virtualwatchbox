import { NextResponse } from 'next/server'
import { fetchOpenAIWithRetry, extractResponseText, parseVisionJson } from '@/lib/watchVision'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

// Bump this when prompt shape or output schema changes — older cached rows
// stay dormant until a downgrade, and new rows are written under the new
// version. Keep in sync with INSIGHT_PROMPT_VERSION in lib/discover.ts if you
// add one there for the client-side hash.
const PROMPT_VERSION = 1

type CollectionLine = {
  brand: string
  model: string
  type?: string | null
  dialColor?: string | null
  value?: number | null
}

type UpgradePairInput = {
  fromWatchId: string
  fromBrand: string
  fromModel: string
  fromType: string
  toWatchId: string
  toBrand: string
  toModel: string
  toType: string
  upgradeDeltaUsd: number
}

type HeroLeadInput = {
  toWatchId: string
  brand: string
  model: string
  type: string
}

type RequestBody = {
  collection: CollectionLine[]
  gap?: { type: string; gapLabel: string } | null
  leadPick?: { brand: string; model: string; reference: string; type: string; value?: number } | null
  brandRead?: string | null
  priceTarget?: number | null
  upgradePairs?: UpgradePairInput[]
  heroLead?: HeroLeadInput | null
}

type Payload = {
  read: string
  leadInsight: string
  upgradeRationales?: Record<string, string>
}

const SYSTEM_PROMPT = [
  'You are a watch editor at Virtual Watchbox, a luxury-tech app for serious collectors.',
  'Voice: sophisticated, dry, observant. Like a confident bylined column — not a marketing email.',
  'Avoid clichés. Never use: timepiece, ticker, horological, "stunning", "exquisite", "the perfect watch", exclamation points, em-dash-as-drama.',
  'CRITICAL: do not anthropomorphize the collection. A collection does not "own", "deserve", "want", or "yearn for" anything — the COLLECTOR (you / your rotation / your box) does. Do not use "gap", "hole", "fill", "holes in your box", "fills the gap", "void". Prefer: "absence", "missing register", "unclaimed slot", "chapter you haven\'t opened", "anchor your rotation is missing".',
  'Prefer specifics over flourish. Reference materials, dial colors, complications, eras when grounded in the collection.',
  'Output VALID JSON only. No prose around it. No markdown fences. Exactly: {"read":"...","leadInsight":"...","upgradeRationales":{"<fromId>|<toId>":"..."}}.',
  'Field constraints:',
  '- "read": a single short editorial phrase, 5–12 words, lowercase-first-word style. Describes the collection\'s character. No trailing period.',
  '- "leadInsight": ONE sentence, 18–28 words total. Explain why the missing register matters in THIS collection. Reference ONE watch the user owns by short name. Do NOT restate the headline; do NOT name the lead pick; do NOT mention the type-name again if it\'s already in the headline. End with a period.',
  '- "upgradeRationales": for EACH pair, one sentence (12–22 words) keyed by "<fromId>|<toId>". Name the move specifically: reference the upgrade\'s brand-family, complication, finishing, or movement story. Avoid generic "preserves your slot" boilerplate. Each rationale MUST be distinct from the others.',
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

function fmtUsd(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`
}

function fallback(): Payload {
  return { read: '', leadInsight: '', upgradeRationales: {} }
}

type CacheKey = { kind: 'hero' | 'upgrade'; from: string; to: string }

function keyToString(k: CacheKey): string {
  return `${k.kind}|${k.from}|${k.to}`
}

type CachedHero = { read: string; leadInsight: string }

function tryParseHeroCopy(raw: string): CachedHero | null {
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed?.read === 'string' && typeof parsed?.leadInsight === 'string') {
      return { read: parsed.read, leadInsight: parsed.leadInsight }
    }
  } catch {}
  return null
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY

  let body: RequestBody
  try {
    body = await req.json() as RequestBody
  } catch {
    return NextResponse.json({ ok: false, reason: 'bad-body', ...fallback() }, { status: 400 })
  }

  if (!Array.isArray(body.collection) || body.collection.length === 0) {
    return NextResponse.json({ ok: false, reason: 'empty-collection', ...fallback() }, { status: 200 })
  }

  const heroLead = body.heroLead ?? null
  const upgradePairs = Array.isArray(body.upgradePairs) ? body.upgradePairs : []

  // ── 1. Cache lookup ──────────────────────────────────────────────────────
  const wantedKeys: CacheKey[] = []
  if (heroLead) wantedKeys.push({ kind: 'hero', from: '', to: heroLead.toWatchId })
  for (const p of upgradePairs) {
    wantedKeys.push({ kind: 'upgrade', from: p.fromWatchId, to: p.toWatchId })
  }

  const admin = createAdminClient()
  const cachedCopy = new Map<string, string>()
  if (admin && wantedKeys.length > 0) {
    try {
      // Group by kind to keep the IN clauses well-formed.
      const upgradeToIds = wantedKeys.filter(k => k.kind === 'upgrade').map(k => k.to)
      const heroToIds = wantedKeys.filter(k => k.kind === 'hero').map(k => k.to)

      const queries: Promise<unknown>[] = []
      if (upgradeToIds.length > 0) {
        queries.push(
          admin.from('discover_insights')
            .select('kind, from_watch_id, to_watch_id, copy')
            .eq('kind', 'upgrade')
            .eq('prompt_version', PROMPT_VERSION)
            .in('to_watch_id', upgradeToIds)
            .then(r => r) as Promise<unknown>,
        )
      }
      if (heroToIds.length > 0) {
        queries.push(
          admin.from('discover_insights')
            .select('kind, from_watch_id, to_watch_id, copy')
            .eq('kind', 'hero')
            .eq('prompt_version', PROMPT_VERSION)
            .in('to_watch_id', heroToIds)
            .then(r => r) as Promise<unknown>,
        )
      }
      const results = await Promise.all(queries) as Array<{ data?: Array<{ kind: string; from_watch_id: string; to_watch_id: string; copy: string }> | null }>
      for (const r of results) {
        for (const row of r.data ?? []) {
          const key = keyToString({
            kind: row.kind as 'hero' | 'upgrade',
            from: row.from_watch_id ?? '',
            to: row.to_watch_id,
          })
          if (wantedKeys.some(k => keyToString(k) === key)) {
            cachedCopy.set(key, row.copy)
          }
        }
      }
    } catch {
      // Cache read failures should not block render — fall through to LLM.
    }
  }

  // ── 2. Build response from cache + missing-set ───────────────────────────
  let payload: Payload = { read: '', leadInsight: '', upgradeRationales: {} }

  if (heroLead) {
    const cached = cachedCopy.get(keyToString({ kind: 'hero', from: '', to: heroLead.toWatchId }))
    const parsed = cached ? tryParseHeroCopy(cached) : null
    if (parsed) {
      payload.read = parsed.read
      payload.leadInsight = parsed.leadInsight
    }
  }
  for (const p of upgradePairs) {
    const cached = cachedCopy.get(keyToString({ kind: 'upgrade', from: p.fromWatchId, to: p.toWatchId }))
    if (cached) {
      payload.upgradeRationales![`${p.fromWatchId}|${p.toWatchId}`] = cached
    }
  }

  const heroMissing = heroLead && !payload.read
  const upgradeMissing = upgradePairs.filter(p => !payload.upgradeRationales![`${p.fromWatchId}|${p.toWatchId}`])
  const needsLlm = heroMissing || upgradeMissing.length > 0

  if (!needsLlm) {
    return NextResponse.json({ ok: true, ...payload, cached: true }, { status: 200 })
  }

  // ── 3. LLM call for the missing set ──────────────────────────────────────
  if (!apiKey) {
    // No API key — return whatever cache had (possibly empty). Clients fall
    // back to the static RATIONALE_TEMPLATES path.
    return NextResponse.json({ ok: false, reason: 'no-key', ...payload }, { status: 200 })
  }

  const gapLine = body.gap
    ? `The collection is missing a "${body.gap.type}" (gap label: "${body.gap.gapLabel}").`
    : 'No specific missing register identified — speak to the collection\'s overall character.'
  const leadValueBit = body.leadPick?.value ? ` ~${fmtUsd(body.leadPick.value)}` : ''
  const leadLine = body.leadPick
    ? `The deterministic lead pick is: ${body.leadPick.brand} ${body.leadPick.model} (${body.leadPick.reference}, a ${body.leadPick.type}${leadValueBit}). Do not name it in "leadInsight" — explain the absence, not the pick.`
    : ''
  const priceLine = body.priceTarget
    ? `Price context: the collection's median value is roughly ${fmtUsd(body.priceTarget)}. The pick sits in that band on purpose — leadInsight should sound like a peer recommendation, not a stretch grail.`
    : ''
  const brandReadHint = body.brandRead
    ? `Rules-based read for reference (improve on this, don't echo it): "${body.brandRead}"`
    : ''

  const pairsBlock = upgradeMissing.length > 0
    ? [
        '',
        'Upgrade pairs needing a rationale sentence (use the exact id in the output key):',
        ...upgradeMissing.map((p, i) =>
          `${i + 1}. id="${p.fromWatchId}|${p.toWatchId}" — ${p.fromBrand} ${p.fromModel} (${p.fromType}) → ${p.toBrand} ${p.toModel} (${p.toType}) | delta ${p.upgradeDeltaUsd >= 0 ? '+' : '−'}${fmtUsd(Math.abs(p.upgradeDeltaUsd))}`,
        ),
      ].join('\n')
    : ''
  const heroBlock = heroMissing
    ? `\nAlso write "read" and "leadInsight" for the hero gap (see above).`
    : `\nDo NOT write "read" or "leadInsight" — those are already cached. Return them as empty strings.`

  const userPrompt = [
    `Collection (${body.collection.length} watches):`,
    compactCollection(body.collection),
    '',
    gapLine,
    leadLine,
    priceLine,
    brandReadHint,
    pairsBlock,
    heroBlock,
  ].filter(Boolean).join('\n')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)

  try {
    const response = await fetchOpenAIWithRetry({
      model: process.env.OPENAI_DISCOVER_MODEL ?? 'gpt-4.1-mini',
      input: [
        { role: 'system', content: [{ type: 'input_text', text: SYSTEM_PROMPT }] },
        { role: 'user', content: [{ type: 'input_text', text: userPrompt }] },
      ],
      temperature: 0.6,
      max_output_tokens: 700,
    }, apiKey)

    clearTimeout(timeout)
    if (!response?.ok) {
      return NextResponse.json({ ok: false, reason: 'upstream', ...payload }, { status: 200 })
    }
    const raw = parseVisionJson(extractResponseText(await response.json())) as Partial<Payload> | null
    if (!raw) {
      return NextResponse.json({ ok: false, reason: 'parse', ...payload }, { status: 200 })
    }

    const llmRead = typeof raw.read === 'string' ? raw.read.trim() : ''
    const llmLeadInsight = typeof raw.leadInsight === 'string' ? raw.leadInsight.trim() : ''
    const llmRationales = raw.upgradeRationales && typeof raw.upgradeRationales === 'object'
      ? raw.upgradeRationales as Record<string, string>
      : {}

    // ── 4. Merge LLM output into response + upsert to cache ────────────────
    const toUpsert: Array<{ kind: 'upgrade' | 'hero'; from_watch_id: string; to_watch_id: string; copy: string; model_used: string; prompt_version: number }> = []

    if (heroMissing && heroLead && llmRead && llmLeadInsight) {
      payload.read = llmRead
      payload.leadInsight = llmLeadInsight
      toUpsert.push({
        kind: 'hero',
        from_watch_id: '',
        to_watch_id: heroLead.toWatchId,
        copy: JSON.stringify({ read: llmRead, leadInsight: llmLeadInsight }),
        model_used: process.env.OPENAI_DISCOVER_MODEL ?? 'gpt-4.1-mini',
        prompt_version: PROMPT_VERSION,
      })
    }
    for (const p of upgradeMissing) {
      const pairKey = `${p.fromWatchId}|${p.toWatchId}`
      const sentence = typeof llmRationales[pairKey] === 'string' ? llmRationales[pairKey].trim() : ''
      if (!sentence) continue
      payload.upgradeRationales![pairKey] = sentence
      toUpsert.push({
        kind: 'upgrade',
        from_watch_id: p.fromWatchId,
        to_watch_id: p.toWatchId,
        copy: sentence,
        model_used: process.env.OPENAI_DISCOVER_MODEL ?? 'gpt-4.1-mini',
        prompt_version: PROMPT_VERSION,
      })
    }

    if (admin && toUpsert.length > 0) {
      try {
        await admin.from('discover_insights').upsert(toUpsert, {
          onConflict: 'kind,from_watch_id,to_watch_id,prompt_version',
          ignoreDuplicates: false,
        })
      } catch {
        // Cache write failure is non-fatal — next visit will regenerate.
      }
    }

    return NextResponse.json({ ok: true, ...payload }, { status: 200 })
  } catch {
    clearTimeout(timeout)
    return NextResponse.json({ ok: false, reason: 'error', ...payload }, { status: 200 })
  }
}
