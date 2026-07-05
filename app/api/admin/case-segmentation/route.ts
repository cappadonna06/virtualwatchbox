import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import type { LugGeometry } from '@/lib/caseSegmentation'

export const maxDuration = 30
export const runtime = 'nodejs'

type SegStatus = 'pending' | 'approved' | 'needs_review' | 'rejected' | 'not_applicable'
const STATUSES: ReadonlyArray<SegStatus> = ['pending', 'approved', 'needs_review', 'rejected', 'not_applicable']

type Row = {
  catalog_watch_id: string
  brand: string | null
  model: string | null
  reference: string | null
  primary_webp_url: string | null
  case_only_url: string | null
  case_only_webp_url: string | null
  lug_geometry: LugGeometry | null
  segmentation_confidence: number | null
  segmentation_status: SegStatus | null
  segmentation_reviewed_at: string | null
  case_shape: string | null
  strap_attachment_type: string | null
}

export async function GET(request: NextRequest) {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.response
  const supabase = createAdminClient() ?? createClient()

  const url = new URL(request.url)
  const statusParam = (url.searchParams.get('status') ?? 'all').toLowerCase()
  const status: SegStatus | 'all' = STATUSES.includes(statusParam as SegStatus) ? (statusParam as SegStatus) : 'all'
  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1') || 1)
  const pageSize = Math.min(200, Math.max(10, Number(url.searchParams.get('pageSize') ?? '24') || 24))
  const qRaw = (url.searchParams.get('q') ?? '').trim().toLowerCase()
  const qTokens = qRaw ? qRaw.split(/\s+/).filter(Boolean) : []

  const PAGE = 1000
  const all: Row[] = []
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase
      .from('watch_images')
      .select(
        'catalog_watch_id, webp_url, case_only_url, case_only_webp_url, lug_geometry, segmentation_confidence, segmentation_status, segmentation_reviewed_at, catalog_watches(brand, model, reference, case_shape, strap_attachment_type)',
      )
      .eq('variant', 'primary')
      .not('segmentation_status', 'is', null)
      .range(offset, offset + PAGE - 1)
    if (error) {
      console.error('[admin/case-segmentation] query failed:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!data || data.length === 0) break
    for (const img of data as Array<Record<string, unknown>>) {
      const cw = (img.catalog_watches ?? null) as { brand?: string; model?: string; reference?: string; case_shape?: string; strap_attachment_type?: string } | null
      all.push({
        catalog_watch_id: img.catalog_watch_id as string,
        brand: cw?.brand ?? null,
        model: cw?.model ?? null,
        reference: cw?.reference ?? null,
        primary_webp_url: (img.webp_url as string) ?? null,
        case_only_url: (img.case_only_url as string) ?? null,
        case_only_webp_url: (img.case_only_webp_url as string) ?? null,
        lug_geometry: (img.lug_geometry as LugGeometry) ?? null,
        segmentation_confidence: (img.segmentation_confidence as number) ?? null,
        segmentation_status: (img.segmentation_status as SegStatus) ?? null,
        segmentation_reviewed_at: (img.segmentation_reviewed_at as string) ?? null,
        case_shape: cw?.case_shape ?? null,
        strap_attachment_type: cw?.strap_attachment_type ?? null,
      })
    }
    if (data.length < PAGE) break
  }

  const counts: Record<'all' | SegStatus, number> = {
    all: all.length, pending: 0, approved: 0, needs_review: 0, rejected: 0, not_applicable: 0,
  }
  for (const row of all) if (row.segmentation_status) counts[row.segmentation_status] += 1

  if (url.searchParams.get('summary') === '1') {
    return NextResponse.json({ counts })
  }

  let filtered = status === 'all' ? all : all.filter(r => r.segmentation_status === status)
  if (qTokens.length) {
    filtered = filtered.filter(r => {
      const hay = [r.brand, r.model, r.reference, r.catalog_watch_id].filter(Boolean).join(' ').toLowerCase()
      return qTokens.every(t => hay.includes(t))
    })
  }
  // Lowest confidence first within a status — the rows most worth a human's
  // attention surface first, rather than being buried alphabetically.
  filtered.sort((a, b) => (a.segmentation_confidence ?? 0) - (b.segmentation_confidence ?? 0))

  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const start = (page - 1) * pageSize
  const rows = filtered.slice(start, start + pageSize)

  return NextResponse.json({ rows, page, pageSize, total, totalPages, counts, status })
}

type PostPayload = {
  catalog_watch_id: string
  status: SegStatus
  lug_geometry?: LugGeometry
  notes?: string | null
}

export async function POST(request: NextRequest) {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.response
  const supabase = createAdminClient() ?? createClient()

  const body = (await request.json()) as PostPayload
  if (!body?.catalog_watch_id || !STATUSES.includes(body.status)) {
    return NextResponse.json({ error: 'catalog_watch_id and a valid status are required' }, { status: 400 })
  }

  const patch: Record<string, unknown> = {
    segmentation_status: body.status,
    segmentation_reviewed_at: new Date().toISOString(),
  }
  if (body.lug_geometry) {
    patch.lug_geometry = body.lug_geometry
    // A human just placed these points by hand — that supersedes whatever
    // automated confidence score got it into the review queue.
    patch.segmentation_confidence = 1
  }

  const { error: updateErr } = await supabase
    .from('watch_images')
    .update(patch)
    .eq('catalog_watch_id', body.catalog_watch_id)
    .eq('variant', 'primary')
  if (updateErr) {
    console.error('[admin/case-segmentation] update failed:', updateErr)
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  // Audit trail — reuses watch_image_reviews with variant='case-only' so
  // Case Segmentation decisions live alongside background-removal reviews
  // (migration 034 widened the status vocabulary to match).
  const insert = await supabase.from('watch_image_reviews').insert({
    catalog_watch_id: body.catalog_watch_id,
    variant: 'case-only',
    status: body.status,
    notes: body.notes?.trim() ? body.notes.trim() : null,
    tags: [],
    reviewer_id: gate.userId,
  })
  if (insert.error) {
    console.warn('[admin/case-segmentation] audit insert failed (non-fatal):', insert.error.message)
  }

  return NextResponse.json({ ok: true })
}
