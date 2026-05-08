import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// POST /api/user-watches/[id]/photos/reorder
// Body: { orderedIds: string[] } — the new desired sort order.
// Validates every id belongs to the same watch and the caller, then writes
// sort_order = i for each.
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: { orderedIds?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }
  const orderedIds = Array.isArray(body.orderedIds)
    ? body.orderedIds.filter((v): v is string => typeof v === 'string')
    : []
  if (orderedIds.length === 0) {
    return NextResponse.json({ error: 'empty_order' }, { status: 400 })
  }

  // Pull every photo for this watch and confirm orderedIds is exactly that set.
  const { data: existing, error: existingErr } = await supabase
    .from('user_watch_photos')
    .select('id, user_id, watch_id')
    .eq('watch_id', params.id)
  if (existingErr) return NextResponse.json({ error: existingErr.message }, { status: 500 })
  const rows = existing ?? []

  const isOwner = rows.every(r => r.user_id === user.id)
  if (!isOwner) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const existingIds = new Set(rows.map(r => r.id))
  const orderedSet = new Set(orderedIds)
  const sameSet =
    existingIds.size === orderedSet.size
    && [...existingIds].every(id => orderedSet.has(id))
  if (!sameSet) {
    return NextResponse.json({ error: 'order_mismatch' }, { status: 400 })
  }

  // Apply the new order. We update one row at a time — for V1 sizes (typically
  // <20 photos per watch) this is fine; if galleries grow large we can move to
  // a Postgres function.
  for (let i = 0; i < orderedIds.length; i += 1) {
    const { error } = await supabase
      .from('user_watch_photos')
      .update({ sort_order: i })
      .eq('id', orderedIds[i])
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
