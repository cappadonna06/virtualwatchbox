import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { loadOwnStrap, parseStrapBody, rowToStrap, type StrapRow } from '@/lib/strapDrawer/strapsApi'

type Params = { params: { id: string } }

export async function PATCH(request: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const owns = await loadOwnStrap(supabase, params.id, user.id)
  if (!owns.ok) return NextResponse.json({ error: owns.message }, { status: owns.status })

  let body: Record<string, unknown>
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'invalid_body' }, { status: 400 }) }

  const { payload, errors } = parseStrapBody(body, true)
  if (errors.length) return NextResponse.json({ error: 'invalid_fields', fields: errors }, { status: 400 })
  if (Object.keys(payload).length === 0) return NextResponse.json({ error: 'no_fields' }, { status: 400 })

  const { data: updated, error: updateErr } = await supabase
    .from('user_straps')
    .update(payload)
    .eq('id', params.id)
    .select()
    .single()
  if (updateErr || !updated) {
    return NextResponse.json({ error: updateErr?.message ?? 'update_failed' }, { status: 500 })
  }
  return NextResponse.json({ strap: rowToStrap(updated as StrapRow) })
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const owns = await loadOwnStrap(supabase, params.id, user.id)
  if (!owns.ok) return NextResponse.json({ error: owns.message }, { status: owns.status })

  // strap_watch_overrides cascade via FK on delete.
  const { error: delErr } = await supabase
    .from('user_straps')
    .delete()
    .eq('id', params.id)
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
