// Cloudflare Worker — vw-news-feed
// Fetches 5 watch publication RSS feeds, parses + tags + caches them in KV,
// returns NewsItem[] JSON. Type contract mirrors @/types/news.ts (kept here
// inline so the Worker compiles standalone via wrangler/esbuild).

type SourceName = 'Hodinkee' | 'Worn & Wound' | 'Fratello' | 'Monochrome' | 'ABTW'
type NewsCategory = 'market' | 'new-release' | 'review' | 'history' | 'interview'

interface NewsItem {
  id: string
  source: SourceName
  title: string
  excerpt: string
  url: string
  publishedAt: string
  imageUrl?: string
  author?: string
  tags: {
    brands: string[]
    references: string[]
    categories: NewsCategory[]
  }
}

export interface Env {
  NEWS_CACHE: KVNamespace
}

// Minimal KVNamespace surface so this file typechecks without
// @cloudflare/workers-types installed at the monorepo root.
interface KVNamespace {
  get(key: string, options?: { type: 'json' }): Promise<unknown>
  get(key: string, options?: { type: 'text' }): Promise<string | null>
  put(
    key: string,
    value: string,
    options?: { expirationTtl?: number; metadata?: Record<string, unknown> }
  ): Promise<void>
  getWithMetadata(
    key: string,
    options?: { type: 'json' }
  ): Promise<{ value: unknown; metadata: Record<string, unknown> | null }>
}

const SOURCES: { name: SourceName; url: string }[] = [
  { name: 'Hodinkee', url: 'https://hodinkee.com/feed' },
  { name: 'Worn & Wound', url: 'https://wornandwound.com/feed/' },
  { name: 'Fratello', url: 'https://fratellowatches.com/feed/' },
  { name: 'Monochrome', url: 'https://monochrome-watches.com/feed/' },
  { name: 'ABTW', url: 'https://ablogtowatch.com/feed/' },
]

const CACHE_KEY = 'feed'
const CACHE_TTL_SECONDS = 900
const PER_SOURCE_CAP = 12
const TOTAL_CAP = 60

const ALLOWED_ORIGINS = new Set([
  'https://virtualwatchbox.com',
  'https://www.virtualwatchbox.com',
  'http://localhost:3000',
])

// ---------- Tagging dictionaries ----------

const BRANDS = [
  'Rolex', 'Patek Philippe', 'Audemars Piguet', 'Omega', 'IWC', 'Jaeger-LeCoultre',
  'Cartier', 'Vacheron Constantin', 'A. Lange & Söhne', 'Grand Seiko', 'Seiko',
  'Tudor', 'Breitling', 'TAG Heuer', 'Panerai', 'Hublot', 'Richard Mille',
  'F.P. Journe', 'MB&F', 'Nomos', 'Zenith', 'Longines', 'Tissot', 'Oris',
  'Hamilton', 'Breguet', 'Glashütte Original', 'Chopard', 'Bulgari', 'Piaget',
  'Montblanc', 'Rado', 'Frederique Constant',
]

const NAMED_REFERENCES = [
  'Submariner', 'Speedmaster', 'Nautilus', 'Royal Oak', 'Daytona', 'Datejust',
  'Explorer', 'GMT-Master', 'Aquanaut', 'Patrimony', 'Reverso', 'Portugieser',
  'Seamaster', 'Moonwatch', 'Calatrava', 'Santos', 'Tank', 'Ballon Bleu',
  'Overseas',
]

const CATEGORY_KEYWORDS: Record<NewsCategory, string[]> = {
  market: ['price', 'value', 'investment', 'market', 'auction', 'sold for'],
  'new-release': ['introducing', 'debut', 'new', '2025', '2026', 'basel', 'watches & wonders'],
  review: ['review', 'hands-on', 'tested', 'wearing', 'impression'],
  history: ['history', 'vintage', 'reference guide', 'evolution', 'archive'],
  interview: ['interview', 'speaks with', 'in conversation', 'founder', 'CEO'],
}

// ---------- Worker entry ----------

export default {
  async fetch(req: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url)

    if (req.method === 'OPTIONS') return preflight(req)
    if (req.method !== 'GET') {
      return cors(req, new Response('Method not allowed', { status: 405 }))
    }

    if (url.pathname === '/health') {
      const meta = await readCacheWithMetadata(env)
      const items = (meta?.value as NewsItem[] | null) ?? null
      return cors(
        req,
        Response.json({
          ok: true,
          cachedAt: (meta?.metadata?.cachedAt as string | undefined) ?? null,
          itemCount: items?.length ?? 0,
        })
      )
    }

    // Default route: feed
    try {
      const cached = await env.NEWS_CACHE.get(CACHE_KEY, { type: 'json' })
      if (cached && Array.isArray(cached)) {
        return cors(req, Response.json(cached, { headers: { 'X-Cache': 'HIT' } }))
      }
    } catch (err) {
      console.error('[vw-news-feed] cache read failed', err)
    }

    const items = await buildFeed()

    try {
      await env.NEWS_CACHE.put(CACHE_KEY, JSON.stringify(items), {
        expirationTtl: CACHE_TTL_SECONDS,
        metadata: { cachedAt: new Date().toISOString() },
      })
    } catch (err) {
      console.error('[vw-news-feed] cache write failed', err)
    }

    return cors(req, Response.json(items, { headers: { 'X-Cache': 'MISS' } }))
  },
}

async function readCacheWithMetadata(env: Env) {
  try {
    return await env.NEWS_CACHE.getWithMetadata(CACHE_KEY, { type: 'json' })
  } catch {
    return null
  }
}

// ---------- Feed pipeline ----------

async function buildFeed(): Promise<NewsItem[]> {
  const results = await Promise.allSettled(
    SOURCES.map(async (s) => {
      const xml = await fetchWithTimeout(s.url, 10_000)
      const parsed = await parseFeed(xml, s.name)
      return parsed.slice(0, PER_SOURCE_CAP)
    })
  )

  const merged: NewsItem[] = []
  for (let i = 0; i < results.length; i++) {
    const r = results[i]
    if (r.status === 'fulfilled') {
      merged.push(...r.value)
    } else {
      console.error(`[vw-news-feed] source ${SOURCES[i].name} failed:`, r.reason)
    }
  }

  merged.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
  return merged.slice(0, TOTAL_CAP)
}

async function fetchWithTimeout(url: string, ms: number): Promise<string> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try {
    // `cf` is a Cloudflare-specific RequestInit extension; cast to any to opt out of
    // the standard RequestInit type narrowing.
    const init: RequestInit = {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'VirtualWatchbox-NewsFeed/1.0 (+https://virtualwatchbox.com)' },
    }
    ;(init as unknown as { cf?: RequestInitCfProperties }).cf = { cacheTtl: 60, cacheEverything: true }
    const res = await fetch(url, init)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.text()
  } finally {
    clearTimeout(t)
  }
}

// ---------- RSS parsing ----------

async function parseFeed(xml: string, source: SourceName): Promise<NewsItem[]> {
  const items: NewsItem[] = []
  const itemRegex = /<item[\s>][\s\S]*?<\/item>/g
  const matches = xml.match(itemRegex) ?? []

  for (const block of matches) {
    const title = cleanText(getTag(block, 'title'))
    if (!title) continue

    let link = cleanText(getTag(block, 'link'))
    if (!link) {
      const guid = getTag(block, 'guid')
      if (guid && /^https?:\/\//.test(guid.trim())) link = guid.trim()
    }
    if (!link) continue

    const pubRaw = getTag(block, 'pubDate') || getTag(block, 'dc:date')
    const ts = Date.parse(pubRaw)
    if (Number.isNaN(ts)) continue
    const publishedAt = new Date(ts).toISOString()

    const description = getTag(block, 'description')
    const contentEncoded = getTag(block, 'content:encoded')
    const excerpt = truncateOnWord(stripHtml(description || contentEncoded), 300)

    const author =
      cleanText(getTag(block, 'dc:creator')) ||
      cleanText(getTag(block, 'author')) ||
      undefined

    const imageUrl = extractImageUrl(block, description, contentEncoded)

    const id = await hashLink(link)
    const tags = tagArticle(title, excerpt)

    items.push({
      id,
      source,
      title,
      excerpt,
      url: link,
      publishedAt,
      imageUrl,
      author,
      tags,
    })
  }

  return items
}

function getTag(block: string, name: string): string {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, 'i')
  const m = block.match(re)
  return m ? m[1] : ''
}

function getAttr(block: string, tagName: string, attr: string): string {
  const escapedTag = tagName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const escapedAttr = attr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`<${escapedTag}[^>]*\\s${escapedAttr}=["']([^"']+)["']`, 'i')
  const m = block.match(re)
  return m ? m[1] : ''
}

function extractImageUrl(block: string, description: string, contentEncoded: string): string | undefined {
  const media = getAttr(block, 'media:content', 'url')
  if (media) return media
  const mediaThumb = getAttr(block, 'media:thumbnail', 'url')
  if (mediaThumb) return mediaThumb
  const enclosure = getAttr(block, 'enclosure', 'url')
  if (enclosure) return enclosure

  const haystack = (description || '') + ' ' + (contentEncoded || '')
  const m = haystack.match(/<img[^>]+src=["']([^"']+)["']/i)
  if (m) return m[1]
  return undefined
}

function cleanText(s: string): string {
  if (!s) return ''
  let out = s
  // Strip CDATA
  out = out.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  // Strip HTML tags
  out = out.replace(/<[^>]+>/g, '')
  // Decode common entities
  out = decodeEntities(out)
  return out.replace(/\s+/g, ' ').trim()
}

function stripHtml(s: string): string {
  if (!s) return ''
  let out = s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  out = out.replace(/<script[\s\S]*?<\/script>/gi, '')
  out = out.replace(/<style[\s\S]*?<\/style>/gi, '')
  out = out.replace(/<[^>]+>/g, ' ')
  out = decodeEntities(out)
  return out.replace(/\s+/g, ' ').trim()
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_m, n) => {
      const code = Number(n)
      return Number.isFinite(code) ? String.fromCharCode(code) : _m
    })
    .replace(/&#x([0-9a-f]+);/gi, (_m, n) => {
      const code = parseInt(n, 16)
      return Number.isFinite(code) ? String.fromCharCode(code) : _m
    })
}

function truncateOnWord(s: string, max: number): string {
  if (!s) return ''
  if (s.length <= max) return s
  const sliced = s.slice(0, max + 1)
  const lastSpace = sliced.lastIndexOf(' ')
  return (lastSpace > max * 0.6 ? sliced.slice(0, lastSpace) : s.slice(0, max)).trim() + '…'
}

async function hashLink(link: string): Promise<string> {
  try {
    const buf = new TextEncoder().encode(link)
    const digest = await crypto.subtle.digest('SHA-1', buf)
    const bytes = new Uint8Array(digest)
    let hex = ''
    for (let i = 0; i < 8; i++) hex += bytes[i].toString(16).padStart(2, '0')
    return hex
  } catch {
    // Last-resort fallback: encode last URL segment
    const parts = link.split('/').filter(Boolean)
    return encodeURIComponent(parts[parts.length - 1] || link).slice(0, 32)
  }
}

// ---------- Tagging ----------

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export function tagArticle(title: string, excerpt: string): NewsItem['tags'] {
  const original = `${title} ${excerpt}`
  const lower = original.toLowerCase()
  const lowerNoDiacritics = stripDiacritics(lower)

  // Brands
  const brands: string[] = []
  for (const brand of BRANDS) {
    const target = stripDiacritics(brand.toLowerCase())
    const re = new RegExp(`(?:^|[^a-z0-9])${escapeRegex(target)}(?=$|[^a-z0-9])`, 'i')
    if (re.test(lowerNoDiacritics)) brands.push(brand)
  }

  // References — alphanumeric ref pattern (case-sensitive against original)
  const referencesSet = new Set<string>()
  const refRe = /\b[A-Z]{1,3}-?[0-9]{3,6}\/?[0-9A-Z]*\b/g
  const refMatches = original.match(refRe)
  if (refMatches) {
    for (const r of refMatches) referencesSet.add(r)
  }
  // Pure numeric refs (e.g. "5711", "3135") — common in horology
  const numericRe = /\b(?:ref\.?\s*)?(\d{4,5})\b/gi
  let nm: RegExpExecArray | null
  while ((nm = numericRe.exec(original)) !== null) {
    const n = nm[1]
    // Filter out years and obvious non-refs
    const num = Number(n)
    if (num >= 1900 && num <= 2100) continue
    referencesSet.add(n)
  }
  // Named references
  for (const name of NAMED_REFERENCES) {
    const re = new RegExp(`(?:^|[^a-z0-9])${escapeRegex(name.toLowerCase())}(?=$|[^a-z0-9])`, 'i')
    if (re.test(lower)) referencesSet.add(name)
  }
  const references = Array.from(referencesSet).slice(0, 5)

  // Categories
  const categories: NewsCategory[] = []
  for (const cat of Object.keys(CATEGORY_KEYWORDS) as NewsCategory[]) {
    const kws = CATEGORY_KEYWORDS[cat]
    if (kws.some((kw) => lower.includes(kw))) categories.push(cat)
  }

  return { brands, references, categories }
}

// ---------- CORS ----------

function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') || ''
  const allow = ALLOWED_ORIGINS.has(origin) ? origin : 'https://virtualwatchbox.com'
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
    'Cache-Control': 'public, max-age=60',
  }
}

function cors(req: Request, res: Response): Response {
  const headers = new Headers(res.headers)
  for (const [k, v] of Object.entries(corsHeadersFor(req))) headers.set(k, v)
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers })
}

function preflight(req: Request): Response {
  return new Response(null, { status: 204, headers: corsHeadersFor(req) })
}

// Minimal ambient declarations so this file typechecks standalone
declare const crypto: {
  subtle: {
    digest(algorithm: string, data: BufferSource): Promise<ArrayBuffer>
  }
}
declare interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void
  passThroughOnException(): void
}
declare interface RequestInitCfProperties {
  cacheTtl?: number
  cacheEverything?: boolean
}
