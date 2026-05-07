import type { NewsCategory, NewsItem, SourceName } from '@/types/news'

export const revalidate = 900

const VALID_CATEGORIES: ReadonlySet<NewsCategory> = new Set([
  'market',
  'new-release',
  'review',
  'history',
  'interview',
])

export async function GET(req: Request) {
  const workerUrl = process.env.NEWS_WORKER_URL
  if (!workerUrl) {
    return Response.json({ error: 'Feed not configured' }, { status: 503 })
  }

  let items: NewsItem[]
  try {
    const res = await fetch(workerUrl, { next: { revalidate: 900 } })
    if (!res.ok) throw new Error(`Worker responded ${res.status}`)
    const data = await res.json()
    if (!Array.isArray(data)) throw new Error('Worker returned non-array')
    items = data as NewsItem[]
  } catch (err) {
    console.error('[api/news] worker unreachable:', err)
    return Response.json({ error: 'Feed unavailable' }, { status: 503 })
  }

  const url = new URL(req.url)
  const source = url.searchParams.get('source') as SourceName | null
  const brandsParam = url.searchParams.get('brands')
  const brands = brandsParam
    ? brandsParam.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
    : []
  const categoryParam = url.searchParams.get('category')
  const category =
    categoryParam && VALID_CATEGORIES.has(categoryParam as NewsCategory)
      ? (categoryParam as NewsCategory)
      : null
  const limitRaw = Number(url.searchParams.get('limit'))
  const limit = Number.isFinite(limitRaw) ? Math.max(0, Math.min(60, Math.floor(limitRaw))) : 0

  let out = items
  if (source) out = out.filter((i) => i.source === source)
  if (brands.length) {
    out = out.filter((i) => i.tags.brands.some((b) => brands.includes(b.toLowerCase())))
  }
  if (category) out = out.filter((i) => i.tags.categories.includes(category))
  if (limit) out = out.slice(0, limit)

  return Response.json(out, {
    headers: { 'Cache-Control': 'public, max-age=60, s-maxage=900' },
  })
}
