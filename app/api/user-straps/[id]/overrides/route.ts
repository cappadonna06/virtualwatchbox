import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { loadOwnStrap, rowToOverride, type OverrideRow } from '@/lib/strapDrawer/strapsApi'

type Params = { params: { id: string } }

export async function GET(_request: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const owns = await loadOwnStrap(supabase, params.id, user.id)
  if (!owns.ok) return NextResponse.json({ error: owns.message }, { status: owns.status })

  const { data, error } = await supabase
    .from('strap_watch_overrides')
    .select('*')
    .eq('strap_id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ overrides: (data ?? []).map(r => rowToOverride(r as OverrideRow)) })
}

export async function POST(request: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const owns = await loadOwnStrap(supabase, params.id, user.id)
  if (!owns.ok) return NextResponse.json({ error: owns.message }, { status: owns.status })

  let body: { watchId?: unknown; override?: unknown }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'invalid_body' }, { status: 400 }) }

  const watchId = typeof body.watchId === 'string' ? body.watchId : ''
  const override = body.override
  if (!watchId) return NextResponse.json({ error: 'invalid_fields', fields: ['watchId'] }, { status: 400 })
  if (override !== 'fits' && override !== 'excluded') {
    return NextResponse.json({ error: 'invalid_fields', fields: ['override'] }, { status: 400 })
  }

  // Confirm the watch is owned by the caller (FK + RLS would catch it, but a
  // clean 404 beats a constraint error).
  const { data: watch, error: watchErr } = await supabase
    .from('watches')
    .select('id, user_id')
    .eq('id', watchId)
    .maybeSingle()
  if (watchErr) return NextResponse.json({ error: watchErr.message }, { status: 500 })
  if (!watch || watch.user_id !== user.id) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const { data: row, error } = await supabase
    .from('strap_watch_overrides')
    .upsert(
      { user_id: user.id, strap_id: params.id, watch_id: watchId, override },
      { onConflict: 'strap_id,watch_id' },
    )
    .select()
    .single()
  if (error || !row) return NextResponse.json({ error: error?.message ?? 'upsert_failed' }, { status: 500 })

  return NextResponse.json({ override: rowToOverride(row as OverrideRow) })
}
