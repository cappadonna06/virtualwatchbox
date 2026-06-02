import fs from 'node:fs'
import path from 'node:path'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export const maxDuration = 30
export const runtime = 'nodejs'

type ReviewStatus = 'pending' | 'approved' | 'needs_reprocess' | 'deleted'
const STATUSES: ReadonlyArray<ReviewStatus> = ['pending', 'approved', 'needs_reprocess', 'deleted']

type ManifestEntry = { watchId: string; rawFilename: string }
let manifestCache: { mtimeMs: number; map: Map<string, string> } | null = null

function loadManifestRawMap(): Map<string, string> {
  // Read manifest.json off disk so the UI can render the raw side-by-side
  // from /watch-assets/raw/<rawFilename>. Source of truth for the original
  // extension (jpg / avif / png / webp) is the manifest, not the catalog row.
  const manifestPath = path.join(process.cwd(), 'public', 'watch-assets', 'processed', 'manifest.json')
  try {
    const stat = fs.statSync(manifestPath)
    if (manifestCache && manifestCache.mtimeMs === stat.mtimeMs) return manifestCache.map
    const raw = fs.readFileSync(manifestPath, 'utf8')
    const parsed = JSON.parse(raw) as ManifestEntry[]
    const map = new Map<string, string>()
    for (const entry of parsed) {
      if (entry?.watchId && entry?.rawFilename) map.set(entry.watchId, entry.rawFilename)
    }
    manifestCache = { mtimeMs: stat.mtimeMs, map }
    return map
  } catch {
    return new Map()
  }
}

export async function GET(request: NextRequest) {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.response
  const supabase = createAdminClient() ?? createClient()

  const url = new URL(request.url)
  const statusParam = (url.searchParams.get('status') ?? 'all').toLowerCase()
  const status: ReviewStatus | 'all' = STATUSES.includes(statusParam as ReviewStatus)
    ? (statusParam as ReviewStatus)
    : 'all'
  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1') || 1)
  const pageSize = Math.min(200, Math.max(10, Number(url.searchParams.get('pageSize') ?? '50') || 50))
  // Free-text search across brand / model / reference / catalog_watch_id.
  // Whitespace tokens AND-match so "rolex sub" requires both. Counts on
  // the status tabs remain across the full set so tab switching stays
  // useful while a search is active.
  const qRaw = (url.searchParams.get('q') ?? '').trim().toLowerCase()
  const qTokens = qRaw ? qRaw.split(/\s+/).filter(t => t.length >= 1) : []

  // Base set: every watch with a primary image. ~3k rows today — cheap to
  // pull, filter in memory, then paginate. Avoids a server-side "latest review
  // per watch" query that would need a window function or view.
  //
  // PostgREST caps a single response at 1,000 rows by default, so we page
  // through explicitly. .range() is inclusive on both ends.
  const PAGE = 1000
  const allImageRows: Array<Record<string, unknown>> = []
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase
      .from('watch_images')
      .select('catalog_watch_id, webp_url, png_url, processed_width, processed_height, background_removal_applied, catalog_watches(brand, model, reference)')
      .eq('variant', 'primary')
      .range(offset, offset + PAGE - 1)
    if (error) {
      console.error('[admin/image-review] watch_images query failed:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!data || data.length === 0) break
    allImageRows.push(...(data as Array<Record<string, unknown>>))
    if (data.length < PAGE) break
  }
  const imagesQ = { data: allImageRows } as { data: Array<Record<string, unknown>> }

  // Same pagination story as watch_images: with multiple reviews per watch
  // over time, total review-row count quickly exceeds the 1,000 single-
  // response cap. Page through so 'latest review per watch' is accurate
  // for every watch — not just the 1,000 most-recently-reviewed.
  const allReviewRows: Array<Record<string, unknown>> = []
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase
      .from('watch_image_reviews')
      .select('catalog_watch_id, variant, status, notes, tags, created_at, reviewer_id')
      .eq('variant', 'primary')
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE - 1)
    if (error) {
      console.error('[admin/image-review] watch_image_reviews query failed:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!data || data.length === 0) break
    allReviewRows.push(...(data as Array<Record<string, unknown>>))
    if (data.length < PAGE) break
  }
  const reviewsQ = { data: allReviewRows } as { data: Array<Record<string, unknown>> }

  const latestByWatch = new Map<string, { status: ReviewStatus; notes: string | null; tags: string[]; created_at: string }>()
  for (const r of reviewsQ.data ?? []) {
    const id = r.catalog_watch_id as string
    if (!latestByWatch.has(id)) {
      latestByWatch.set(id, {
        status: r.status as ReviewStatus,
        notes: (r.notes as string | null) ?? null,
        tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
        created_at: r.created_at as string,
      })
    }
  }

  const rawMap = loadManifestRawMap()

  type Row = {
    catalog_watch_id: string
    brand: string | null
    model: string | null
    reference: string | null
    webp_url: string
    png_url: string
    raw_url: string | null
    processed_width: number | null
    processed_height: number | null
    background_removal_applied: boolean
    status: ReviewStatus
    notes: string | null
    tags: string[]
    last_reviewed_at: string | null
  }

  const all: Row[] = (imagesQ.data ?? []).map((img: Record<string, unknown>) => {
    const id = img.catalog_watch_id as string
    const latest = latestByWatch.get(id)
    const cw = (img.catalog_watches ?? null) as { brand?: string; model?: string; reference?: string } | null
    const rawFilename = rawMap.get(id) ?? null
    return {
      catalog_watch_id: id,
      brand: cw?.brand ?? null,
      model: cw?.model ?? null,
      reference: cw?.reference ?? null,
      webp_url: img.webp_url as string,
      png_url: img.png_url as string,
      raw_url: rawFilename ? `/watch-assets/raw/${rawFilename}` : null,
      processed_width: (img.processed_width as number | null) ?? null,
      processed_height: (img.processed_height as number | null) ?? null,
      background_removal_applied: Boolean(img.background_removal_applied),
      status: latest?.status ?? 'pending',
      notes: latest?.notes ?? null,
      tags: latest?.tags ?? [],
      last_reviewed_at: latest?.created_at ?? null,
    }
  })

  const counts = {
    all: all.length,
    pending: 0,
    approved: 0,
    needs_reprocess: 0,
    deleted: 0,
  }
  for (const row of all) counts[row.status] += 1

  // A watch is "flagged" if it needs reprocessing or the auto-screener tagged
  // it while still unreviewed. 'deleted' rows already had their image purged so
  // they no longer appear in `all`; the count is still reported for the badge.
  const isFlagged = (r: Row) =>
    r.status === 'needs_reprocess' || (r.status === 'pending' && r.tags.length > 0)
  const flaggedRows = all.filter(isFlagged)

  // Summary mode: lightweight payload for the dashboard tile + catalog badges.
  // Returns just the flagged ids (with status + tags) plus counts, so callers
  // don't pull the full paginated row set.
  if (url.searchParams.get('summary') === '1') {
    return NextResponse.json({
      counts: { ...counts, flagged: flaggedRows.length },
      flagged: flaggedRows.map(r => ({ id: r.catalog_watch_id, status: r.status, tags: r.tags })),
    })
  }

  let filtered = status === 'all' ? all : all.filter(r => r.status === status)
  if (qTokens.length > 0) {
    filtered = filtered.filter(r => {
      const hay = [r.brand, r.model, r.reference, r.catalog_watch_id]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return qTokens.every(t => hay.includes(t))
    })
  }
  filtered.sort((a, b) => {
    // Unreviewed (pending) first, then most-recently-reviewed first within
    // the rest. Inside pending, alphabetical by id is stable across pages.
    if (a.status === 'pending' && b.status !== 'pending') return -1
    if (b.status === 'pending' && a.status !== 'pending') return 1
    if (a.status === 'pending' && b.status === 'pending') {
      return a.catalog_watch_id.localeCompare(b.catalog_watch_id)
    }
    const at = a.last_reviewed_at ?? ''
    const bt = b.last_reviewed_at ?? ''
    return bt.localeCompare(at)
  })

  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const start = (page - 1) * pageSize
  const rows = filtered.slice(start, start + pageSize)

  return NextResponse.json({
    rows,
    page,
    pageSize,
    total,
    totalPages,
    counts,
    status,
  })
}

type PostPayload = {
  catalog_watch_id: string
  variant?: string
  status: ReviewStatus
  notes?: string | null
  tags?: string[] | null
}

const ALLOWED_TAGS = new Set([
  // Manual review tags (TagPicker UI in app/admin/image-review/page.tsx)
  'bracelet_top', 'bracelet_bottom', 'band', 'case', 'small_detail',
  'halo', 'edge_eroded', 'bottom_clipped',
  'shadow_remnant', 'bg_remnant',
  // Auto-screener tags. Reviewers can confirm/clear via the UI's "Auto-detected"
  // group. Keep this in sync with TagKey in app/admin/image-review/page.tsx.
  'aspect_ratio_off', 'multi_object', 'dial_only', 'bracelet_truncated', 'tiny_subject',
  'wrong_subject_arm', 'wrong_subject_box', 'multi_watch', 'wrong_orientation', 'incomplete',
  // Triage tags written by scripts/triage-rolex-image-review.ts and similar
  // operator-script flows. Not user-clickable, but allowed for symmetry so
  // the user can correct a triage decision (e.g. set status=approved and
  // keep the tag for audit).
  'bad_cutout', 'wrong_subject', 'multi_watch_legacy', 'true_duplicate', 'triage_reacquired',
])

export async function POST(request: NextRequest) {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.response
  const supabase = createAdminClient() ?? createClient()

  const body = (await request.json()) as PostPayload
  if (!body?.catalog_watch_id || !STATUSES.includes(body.status)) {
    return NextResponse.json({ error: 'catalog_watch_id and a valid status are required' }, { status: 400 })
  }

  const tags = Array.isArray(body.tags)
    ? Array.from(new Set(body.tags.filter(t => typeof t === 'string' && ALLOWED_TAGS.has(t))))
    : []

  // 'deleted' = "Wrong watch / delete" — purge the watch_images row
  // immediately so the bad image stops rendering on the catalog. The audit
  // trail still lives on in watch_image_reviews. Persistence across deploys
  // requires running `npm run images:sync-deletions` to fold the id into
  // data/excluded-image-ids.json (otherwise the next seed-from-enriched
  // run would recreate the watch_images row from manifest.json).
  if (body.status === 'deleted') {
    const { error: delErr } = await supabase
      .from('watch_images')
      .delete()
      .eq('variant', body.variant ?? 'primary')
      .eq('catalog_watch_id', body.catalog_watch_id)
    if (delErr) {
      console.error('[admin/image-review] watch_images delete failed:', delErr)
      // Continue — the review row insert below still gives us the audit trail.
    }
  }

  const insert = await supabase.from('watch_image_reviews').insert({
    catalog_watch_id: body.catalog_watch_id,
    variant: body.variant ?? 'primary',
    status: body.status,
    notes: body.notes?.trim() ? body.notes.trim() : null,
    tags,
    reviewer_id: gate.userId,
  }).select('id, status, notes, tags, created_at').single()

  if (insert.error) {
    console.error('[admin/image-review] insert failed:', insert.error)
    return NextResponse.json({ error: insert.error.message }, { status: 500 })
  }

  return NextResponse.json({ review: insert.data })
}
