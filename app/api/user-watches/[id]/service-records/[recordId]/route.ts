import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  parseRecordBody,
  rowToRecord,
  type RecordRow,
} from '@/lib/serviceRoom/serviceRecordsApi'

export const runtime = 'nodejs'

type Params = { params: { id: string; recordId: string } }

// Confirm the record exists, belongs to the caller, and to the watch in the URL.
async function loadOwnRecord(
  supabase: ReturnType<typeof createClient>,
  recordId: string,
  watchId: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from('watch_service_records')
    .select('id, watch_id, user_id')
    .eq('id', recordId)
    .maybeSingle()
  if (error) return { ok: false as const, status: 500, message: error.message }
  if (!data || data.user_id !== userId || data.watch_id !== watchId) {
    return { ok: false as const, status: 404, message: 'not_found' }
  }
  return { ok: true as const }
}

// PATCH — update a record.
export async function PATCH(request: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const owns = await loadOwnRecord(supabase, params.recordId, params.id, user.id)
  if (!owns.ok) return NextResponse.json({ error: owns.message }, { status: owns.status })

  let body: Record<string, unknown>
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'invalid_body' }, { status: 400 }) }

  const { payload, errors } = parseRecordBody(body, true)
  if (errors.length) return NextResponse.json({ error: 'invalid_fields', fields: errors }, { status: 400 })
  if (Object.keys(payload).length === 0) return NextResponse.json({ error: 'no_fields' }, { status: 400 })

  const { data: updated, error: updateErr } = await supabase
    .from('watch_service_records')
    .update(payload)
    .eq('id', params.recordId)
    .select()
    .single()
  if (updateErr || !updated) {
    return NextResponse.json({ error: updateErr?.message ?? 'update_failed' }, { status: 500 })
  }
  return NextResponse.json({ record: rowToRecord(updated as RecordRow) })
}

// DELETE — remove a record.
export async function DELETE(_request: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const owns = await loadOwnRecord(supabase, params.recordId, params.id, user.id)
  if (!owns.ok) return NextResponse.json({ error: owns.message }, { status: owns.status })

  const { error: delErr } = await supabase
    .from('watch_service_records')
    .delete()
    .eq('id', params.recordId)
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
