/**
 * LLM extraction pass — fills the SPARSE fields the rule-based pipeline
 * couldn't recover, using rich free-text watch descriptions.
 *
 * Primary source of text: `watch_db.csv` Description column — ~35K watches
 * with ~1000 chars of vendor-quality prose each. Plus optional fallbacks
 * from thewatchapi cache.
 *
 * Target fields (skip-already-filled — won't burn tokens on watches whose
 * data is already covered):
 *    watchType, nickname, msrpAtLaunchUsd, countryOfOrigin, bezelType,
 *    caseFinish, lumeColor, claspType, markerType
 *
 * Provider auto-detect:
 *    OPENAI_API_KEY    → OpenAI (default model: gpt-4o-mini)
 *    ANTHROPIC_API_KEY → Anthropic (default model: claude-haiku-4-5)
 *
 * Cost (with gpt-4o-mini at $0.15/$0.60 per M in/out tokens):
 *    Full catalog (35k watches) ≈ $5-15
 *    Top 5000 by heat            ≈ $0.80-2
 *
 * Output:  data/external/llm-extracts/<id>.json  (one file per watch)
 *          Idempotent: skipped if already cached, unless --overwrite.
 *
 * Usage:
 *    npm run catalog:llm-extract -- --top=100             # smoke test, top 100
 *    npm run catalog:llm-extract -- --top=5000            # focused run
 *    npm run catalog:llm-extract                          # full catalog
 *    LLM_MODEL=gpt-4o npm run catalog:llm-extract         # better model, more $
 *    LLM_CONCURRENCY=20 npm run catalog:llm-extract       # default 10
 *    LLM_DRY_RUN=1 npm run catalog:llm-extract            # no API calls
 *    LLM_FORCE=1 npm run catalog:llm-extract              # re-extract cached rows
 */

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { repoRoot, loadLocalEnv } from './watch-image-pipeline'

loadLocalEnv()

const outDir = path.join(repoRoot, 'data', 'external', 'llm-extracts')
const enrichedPath = path.join(repoRoot, 'data', 'catalog-enriched-full.json')
const watchDbCsvPath = path.join(repoRoot, 'data', 'external', 'kaggle', 'watch_db.csv')
const thewatchapiCacheDir = path.join(repoRoot, 'data', 'external', 'thewatchapi-cache')
const processedManifestPath = path.join(
  repoRoot,
  'public',
  'watch-assets',
  'processed',
  'manifest.json',
)

const ARGV = process.argv.slice(2)
function arg(name: string): string | undefined {
  const hit = ARGV.find(a => a === name || a.startsWith(`${name}=`))
  if (!hit) return undefined
  if (hit === name) {
    const idx = ARGV.indexOf(hit)
    return ARGV[idx + 1]
  }
  return hit.slice(name.length + 1)
}

const TOP = Number(arg('--top') ?? process.env.LLM_TOP ?? 0)
const LIMIT = Number(process.env.LLM_LIMIT ?? 0)
const CONCURRENCY = Number(process.env.LLM_CONCURRENCY ?? 10)
const DRY_RUN = process.env.LLM_DRY_RUN === '1'
const FORCE = process.env.LLM_FORCE === '1'
// By default, only extract for watches that have a processed image. The
// argument is the LLM-enriched spec polish has the most user-visible value
// for watches the UI will actually show prominently. Pass --all-watches to
// extract for everything (e.g. before images are ready for the long tail).
const ALL_WATCHES = ARGV.includes('--all-watches') || process.env.LLM_ALL_WATCHES === '1'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

type Provider = 'openai' | 'anthropic'
const PROVIDER: Provider = OPENAI_API_KEY
  ? 'openai'
  : ANTHROPIC_API_KEY
    ? 'anthropic'
    : ('openai' as Provider)

const DEFAULT_MODELS: Record<Provider, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-haiku-4-5-20251001',
}
const MODEL = process.env.LLM_MODEL ?? DEFAULT_MODELS[PROVIDER]

// Approximate token pricing (USD per 1M tokens) — used only for the
// pre-flight cost estimate, not for billing. Update when models change.
const PRICING: Record<string, { in: number; out: number }> = {
  'gpt-4o-mini': { in: 0.15, out: 0.6 },
  'gpt-4o': { in: 2.5, out: 10 },
  'gpt-4.1-mini': { in: 0.15, out: 0.6 },
  'gpt-4.1-nano': { in: 0.05, out: 0.4 },
  'claude-haiku-4-5-20251001': { in: 1.0, out: 5.0 },
  'claude-sonnet-4-5-20250929': { in: 3.0, out: 15.0 },
}

// ─────────────────────────────────────────────────────────────────────────
// Extraction schema — focused on the sparse fields. Each is optional in
// the response: model MUST omit fields it can't ground in the source text.
// ─────────────────────────────────────────────────────────────────────────

const TARGET_FIELDS = [
  'watchType',
  'nickname',
  'msrpAtLaunchUsd',
  'countryOfOrigin',
  'bezelType',
  'caseFinish',
  'lumeColor',
  'claspType',
  'markerType',
  'dialFinish',
  'productionStatus',
] as const

const EXTRACTION_PROMPT = `You are a watch catalog data extractor.

OMIT any field you cannot ground in EXPLICIT evidence in the source text. Do NOT guess. Do NOT infer from materials. An empty {} response is always acceptable.

Field definitions (READ CAREFULLY — common mistakes flagged):

- watchType: category. MUST be one of: Diver, Dress, Sport, Chronograph, GMT, Pilot, Field, "Integrated Bracelet", Vintage. Only set if clearly stated or unambiguously implied by complications.

- nickname: SHORT, well-known collector nickname like "Daytona", "Submariner", "Sub", "Speedy", "Royal Oak", "Nautilus", "Aquanaut". The product line name (e.g., "Royal Oak", "Nautilus") counts. Skip if the watch has no widely-used nickname.

- msrpAtLaunchUsd: manufacturer's launch price in USD. ONLY if the text states an explicit price at launch. NEVER guess. NEVER return 0 or null — just omit the field.

- countryOfOrigin: country of manufacture, NOT the brand's HQ. Usually "Switzerland", "Germany", "Japan", "United States", "France".

- bezelType: the TYPE/FUNCTION of the bezel, NOT its material. Valid examples: "fixed", "rotating", "unidirectional rotating", "bidirectional rotating", "tachymeter", "GMT", "dive", "fluted", "smooth", "domed", "octagonal", "engraved". NEVER set this to a material name like "steel" or "ceramic" — that's bezelMaterial which we already have. NEVER set to "screw down" (that's a crown attribute).

- caseFinish: the FINISHING TECHNIQUE applied to the case surface, NOT the material. Valid examples: "brushed and polished", "fully polished", "satin brushed", "vertical brushed", "sandblasted", "matte", "DLC coated", "PVD coated", "mirror polished". NEVER set this to a material like "stainless steel".

- dialFinish: the surface TREATMENT of the dial, NOT its color. Valid examples: "sunburst", "matte", "lacquered", "glossy", "enamel", "guilloche", "Grande Tapisserie" (AP), "Tapisserie", "textured", "fume", "smoked", "opaline". NEVER set this to a color like "blue" or "black".

- lumeColor: color of the luminous material. Valid examples: "green", "blue", "Super-LumiNova C3" (greenish), "Super-LumiNova BGW9" (blue glow), "old radium" (yellow). Only set if explicitly described. NEVER guess from the dial color.

- claspType: type of bracelet clasp. Valid examples: "fold-over", "deployant", "butterfly", "pin buckle", "tang buckle", "safety clasp", "oysterlock", "glidelock". Skip if not stated.

- markerType: type of hour markers. Valid examples: "applied indices", "Arabic numerals", "Roman numerals", "stick", "dot", "baton", "diamond", "luminous dots". Skip if not stated.

- productionStatus: MUST be one of: current, discontinued, limited, one-off, prototype. Only set if clearly stated.

If you only have material/color information for a field whose definition requires technique/function/type info — OMIT THAT FIELD ENTIRELY. Do not substitute.`

const OPENAI_JSON_SCHEMA = {
  name: 'watch_specs',
  strict: false, // some fields optional → strict mode rejects, so loose
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      watchType: {
        type: 'string',
        enum: [
          'Diver',
          'Dress',
          'Sport',
          'Chronograph',
          'GMT',
          'Pilot',
          'Field',
          'Integrated Bracelet',
          'Vintage',
        ],
      },
      nickname: { type: 'string' },
      msrpAtLaunchUsd: { type: 'number' },
      countryOfOrigin: { type: 'string' },
      bezelType: { type: 'string' },
      caseFinish: { type: 'string' },
      lumeColor: { type: 'string' },
      claspType: { type: 'string' },
      markerType: { type: 'string' },
      dialFinish: { type: 'string' },
      productionStatus: {
        type: 'string',
        enum: ['current', 'discontinued', 'limited', 'one-off', 'prototype'],
      },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────
// Source loading: enriched catalog + watch_db descriptions
// ─────────────────────────────────────────────────────────────────────────

type Watch = {
  id: string
  brand: string
  model: string
  reference: string
  watchType: string | null
  nickname: string | null
  msrpAtLaunchUsd: number | null
  countryOfOrigin: string | null
  bezelType: string | null
  caseFinish: string | null
  lumeColor: string | null
  claspType: string | null
  markerType: string | null
  dialFinish: string | null
  productionStatus: string | null
  heatScore: number
  popularityRank: number
}

function normalizeBrand(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]/g, '')
}
function normalizeReference(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}
function brandSlug(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
function refKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function loadEnriched(): Watch[] {
  if (!fs.existsSync(enrichedPath)) {
    console.error(`Enriched catalog not found at ${enrichedPath}`)
    process.exit(1)
  }
  const data = JSON.parse(fs.readFileSync(enrichedPath, 'utf8'))
  return (data.records as Array<Record<string, unknown>>).map(r => ({
    id: r.id as string,
    brand: (r.brand as string) ?? '',
    model: (r.model as string) ?? '',
    reference: (r.reference as string) ?? '',
    watchType: (r.watchType as string) || null,
    nickname: (r.nickname as string) || null,
    msrpAtLaunchUsd: (r.msrpAtLaunchUsd as number) ?? null,
    countryOfOrigin: (r.countryOfOrigin as string) || null,
    bezelType: (r.bezelType as string) || null,
    caseFinish: (r.caseFinish as string) || null,
    lumeColor: (r.lumeColor as string) || null,
    claspType: (r.claspType as string) || null,
    markerType: (r.markerType as string) || null,
    dialFinish: (r.dialFinish as string) || null,
    productionStatus: (r.productionStatus as string) || null,
    heatScore: typeof r.heatScore === 'number' ? r.heatScore : 0,
    popularityRank: typeof r.popularityRank === 'number' ? (r.popularityRank as number) : 999999,
  }))
}

// Map (brand, ref) → watch_db description. Loads once at startup.
function loadWatchDbDescriptions(): Map<string, string> {
  const map = new Map<string, string>()
  if (!fs.existsSync(watchDbCsvPath)) return map
  // watch_db.csv is Windows-1252 with `;` delimiter and multiline-quoted fields.
  const buf = fs.readFileSync(watchDbCsvPath)
  const content = new TextDecoder('windows-1252').decode(buf)
  const len = content.length

  // Header
  let pos = 0
  let field = ''
  let quoted = false
  const headers: string[] = []
  while (pos < len) {
    const ch = content[pos]
    if (quoted) {
      if (ch === '"' && content[pos + 1] === '"') { field += '"'; pos += 2; continue }
      if (ch === '"') { quoted = false; pos++; continue }
      field += ch; pos++; continue
    }
    if (ch === '"') { quoted = true; pos++; continue }
    if (ch === ';') { headers.push(field.trim()); field = ''; pos++; continue }
    if (ch === '\n' || ch === '\r') {
      headers.push(field.trim()); field = ''; pos++
      if (ch === '\r' && content[pos] === '\n') pos++
      break
    }
    field += ch; pos++
  }

  const brandIdx = headers.indexOf('Brand')
  const refIdx = headers.indexOf('Reference')
  const descIdx = headers.indexOf('Description')
  if (brandIdx < 0 || refIdx < 0 || descIdx < 0) {
    console.warn('[llm] watch_db.csv missing expected columns')
    return map
  }

  let row: string[] = []
  field = ''
  quoted = false
  while (pos < len) {
    const ch = content[pos]
    if (quoted) {
      if (ch === '"' && content[pos + 1] === '"') { field += '"'; pos += 2; continue }
      if (ch === '"') { quoted = false; pos++; continue }
      field += ch; pos++; continue
    }
    if (ch === '"') { quoted = true; pos++; continue }
    if (ch === ';') { row.push(field); field = ''; pos++; continue }
    if (ch === '\n' || ch === '\r') {
      row.push(field); field = ''; pos++
      if (ch === '\r' && content[pos] === '\n') pos++
      if (row.length > Math.max(brandIdx, refIdx, descIdx)) {
        const brand = row[brandIdx]?.trim()
        const ref = row[refIdx]?.trim()
        const desc = row[descIdx]?.trim()
        if (brand && ref && desc && desc.length > 50) {
          map.set(`${normalizeBrand(brand)}::${normalizeReference(ref)}`, desc)
        }
      }
      row = []
      continue
    }
    field += ch; pos++
  }
  return map
}

function loadThewatchapiDescription(reference: string): string | null {
  const filePath = path.join(thewatchapiCacheDir, `${refKey(reference)}.json`)
  if (!fs.existsSync(filePath)) return null
  try {
    const json = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    if (json && !json._miss && typeof json.description === 'string') return json.description
  } catch {
    // skip
  }
  return null
}

function shouldExtract(w: Watch): boolean {
  // If all target fields are already filled, skip this watch
  return TARGET_FIELDS.some(f => {
    const v = w[f as keyof Watch]
    return v == null || v === '' || (Array.isArray(v) && v.length === 0)
  })
}

function buildPrompt(w: Watch, description: string): string {
  const missing = TARGET_FIELDS.filter(f => {
    const v = w[f as keyof Watch]
    return v == null || v === '' || (Array.isArray(v) && v.length === 0)
  })
  return [
    `Brand: ${w.brand}`,
    `Model: ${w.model}`,
    `Reference: ${w.reference}`,
    `Fields we already have (do NOT need to re-extract): ${TARGET_FIELDS.filter(f => !missing.includes(f as any)).join(', ') || 'none'}`,
    `Fields we WANT extracted (only if grounded in text): ${missing.join(', ')}`,
    '',
    'Source description:',
    description.length > 4000 ? description.slice(0, 4000) + ' [...]' : description,
  ].join('\n')
}

function hashInput(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex').slice(0, 16)
}

// ─────────────────────────────────────────────────────────────────────────
// Provider calls
// ─────────────────────────────────────────────────────────────────────────

async function callOpenAI(
  systemPrompt: string,
  userContent: string,
): Promise<{ text: string; tokensIn: number; tokensOut: number }> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      response_format: { type: 'json_schema', json_schema: OPENAI_JSON_SCHEMA },
      max_tokens: 512,
      temperature: 0,
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`openai HTTP ${res.status}: ${body.slice(0, 300)}`)
  }
  const json = (await res.json()) as {
    choices: Array<{ message: { content: string } }>
    usage?: { prompt_tokens?: number; completion_tokens?: number }
  }
  const text = json.choices[0]?.message?.content ?? ''
  return {
    text,
    tokensIn: json.usage?.prompt_tokens ?? 0,
    tokensOut: json.usage?.completion_tokens ?? 0,
  }
}

async function callAnthropic(
  systemPrompt: string,
  userContent: string,
): Promise<{ text: string; tokensIn: number; tokensOut: number }> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`anthropic HTTP ${res.status}: ${body.slice(0, 300)}`)
  }
  const json = (await res.json()) as {
    content: Array<{ type: string; text?: string }>
    usage?: { input_tokens?: number; output_tokens?: number }
  }
  const text = json.content
    .filter(c => c.type === 'text')
    .map(c => c.text ?? '')
    .join('')
  return {
    text,
    tokensIn: json.usage?.input_tokens ?? 0,
    tokensOut: json.usage?.output_tokens ?? 0,
  }
}

function safeParseJson(text: string): unknown | null {
  const trimmed = text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/```$/i, '')
    .trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/)
    if (!match) return null
    try {
      return JSON.parse(match[0])
    } catch {
      return null
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────

let tokensInTotal = 0
let tokensOutTotal = 0

async function processOne(
  w: Watch,
  description: string,
): Promise<'hit' | 'skip' | 'miss'> {
  const outPath = path.join(outDir, `${w.id}.json`)
  if (!FORCE && fs.existsSync(outPath)) return 'skip'

  const userContent = buildPrompt(w, description)
  const inputHash = hashInput(userContent)

  if (DRY_RUN) {
    fs.writeFileSync(
      outPath,
      JSON.stringify(
        {
          extracted_at: new Date().toISOString(),
          model: MODEL,
          provider: PROVIDER,
          input_hash: inputHash,
          fields: {},
        },
        null,
        2,
      ),
      'utf8',
    )
    return 'hit'
  }

  try {
    const result =
      PROVIDER === 'openai'
        ? await callOpenAI(EXTRACTION_PROMPT, userContent)
        : await callAnthropic(EXTRACTION_PROMPT, userContent)
    tokensInTotal += result.tokensIn
    tokensOutTotal += result.tokensOut
    const parsed = safeParseJson(result.text) as Record<string, unknown> | null
    if (!parsed || typeof parsed !== 'object') return 'miss'
    fs.writeFileSync(
      outPath,
      JSON.stringify(
        {
          extracted_at: new Date().toISOString(),
          model: MODEL,
          provider: PROVIDER,
          input_hash: inputHash,
          tokens_in: result.tokensIn,
          tokens_out: result.tokensOut,
          fields: parsed,
        },
        null,
        2,
      ),
      'utf8',
    )
    return 'hit'
  } catch (err) {
    console.error(`[llm] ${w.id} error: ${(err as Error).message}`)
    return 'miss'
  }
}

async function main() {
  if (!OPENAI_API_KEY && !ANTHROPIC_API_KEY && !DRY_RUN) {
    console.error(
      '[llm] no API key set (need OPENAI_API_KEY or ANTHROPIC_API_KEY). Aborting.',
    )
    process.exit(1)
  }

  fs.mkdirSync(outDir, { recursive: true })

  console.log(`[llm] provider=${PROVIDER}  model=${MODEL}  concurrency=${CONCURRENCY}${DRY_RUN ? '  DRY_RUN' : ''}`)

  console.log('[llm] loading enriched catalog…')
  const allWatches = loadEnriched()
  console.log(`[llm] loaded ${allWatches.length.toLocaleString()} watches`)

  console.log('[llm] loading watch_db.csv descriptions…')
  const descByKey = loadWatchDbDescriptions()
  console.log(`[llm] indexed ${descByKey.size.toLocaleString()} descriptions from watch_db`)

  // ── Image-gating ────────────────────────────────────────────────────
  // Default: restrict extraction to watches that have a processed image.
  // Rationale: the LLM polish (caseFinish / bezelType / dialFinish /
  // nickname / etc.) shows up in the sidebar — which only opens for
  // watches the UI surfaces. Watches without images aren't going to be
  // featured, so this cuts cost ~25x. Run again with --all-watches once
  // image coverage grows.
  let imagedIds: Set<string> | null = null
  if (!ALL_WATCHES) {
    if (!fs.existsSync(processedManifestPath)) {
      console.warn(
        `[llm] no processed manifest at ${processedManifestPath}; run images:process first, or pass --all-watches to extract anyway`,
      )
      return
    }
    const manifest = JSON.parse(fs.readFileSync(processedManifestPath, 'utf8')) as Array<{
      watchId: string
    }>
    imagedIds = new Set(manifest.map(m => m.watchId))
    console.log(
      `[llm] image gate ON — restricting to ${imagedIds.size.toLocaleString()} watches with processed images. Use --all-watches to bypass.`,
    )
  } else {
    console.log('[llm] image gate OFF (--all-watches) — extracting for any candidate')
  }

  // Filter: need text, need missing target fields, optionally need an image
  const candidates = allWatches.filter(w => {
    if (imagedIds && !imagedIds.has(w.id)) return false
    if (!shouldExtract(w)) return false
    const key = `${normalizeBrand(w.brand)}::${normalizeReference(w.reference)}`
    return descByKey.has(key) || loadThewatchapiDescription(w.reference) != null
  })
  console.log(`[llm] ${candidates.length.toLocaleString()} watches eligible (missing target fields + has source text${imagedIds ? ' + has image' : ''})`)

  // Sort by heat (best first)
  candidates.sort((a, b) => a.popularityRank - b.popularityRank)
  let targets = candidates
  if (TOP > 0) targets = targets.slice(0, TOP)
  if (LIMIT > 0) targets = targets.slice(0, LIMIT)

  // Cost estimate
  const pricing = PRICING[MODEL]
  if (pricing && !DRY_RUN) {
    const estIn = targets.length * 1500
    const estOut = targets.length * 200
    const estCost = (estIn / 1_000_000) * pricing.in + (estOut / 1_000_000) * pricing.out
    console.log(
      `[llm] estimated cost: ~$${estCost.toFixed(2)} for ${targets.length.toLocaleString()} watches  (~${(estIn / 1_000_000).toFixed(1)}M in + ~${(estOut / 1_000_000).toFixed(1)}M out tokens at $${pricing.in}/$${pricing.out} per Mtok)`,
    )
    console.log(`[llm] proceeding in 5 seconds — Ctrl-C to abort`)
    await new Promise(r => setTimeout(r, 5000))
  }

  let hits = 0
  let skipped = 0
  let misses = 0

  const queue = [...targets]
  const workers: Promise<void>[] = []
  for (let i = 0; i < Math.max(1, CONCURRENCY); i += 1) {
    workers.push(
      (async () => {
        while (queue.length > 0) {
          const w = queue.shift()!
          const key = `${normalizeBrand(w.brand)}::${normalizeReference(w.reference)}`
          const desc =
            descByKey.get(key) ?? loadThewatchapiDescription(w.reference) ?? ''
          if (!desc) {
            misses += 1
            continue
          }
          const result = await processOne(w, desc)
          if (result === 'hit') hits += 1
          else if (result === 'skip') skipped += 1
          else misses += 1
          if ((hits + misses) % 100 === 0 && hits + misses > 0) {
            const cost =
              pricing != null
                ? (tokensInTotal / 1_000_000) * pricing.in +
                  (tokensOutTotal / 1_000_000) * pricing.out
                : 0
            console.log(
              `[llm] progress: hits=${hits} skip=${skipped} miss=${misses}  tokens=${tokensInTotal.toLocaleString()}in/${tokensOutTotal.toLocaleString()}out  est=$${cost.toFixed(2)}`,
            )
          }
        }
      })(),
    )
  }
  await Promise.all(workers)

  const finalCost =
    pricing != null
      ? (tokensInTotal / 1_000_000) * pricing.in +
        (tokensOutTotal / 1_000_000) * pricing.out
      : 0
  console.log()
  console.log(`[llm] done. hits=${hits} skipped=${skipped} misses=${misses}`)
  if (!DRY_RUN) {
    console.log(`[llm] total tokens: ${tokensInTotal.toLocaleString()} in + ${tokensOutTotal.toLocaleString()} out`)
    console.log(`[llm] estimated cost: $${finalCost.toFixed(4)}`)
  }
  console.log()
  console.log('Next: re-run `npm run catalog:enrich` to ingest the new extractions.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
