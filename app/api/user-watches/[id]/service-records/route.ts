import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  assertOwnsWatch,
  parseRecordBody,
  rowToRecord,
  type RecordRow,
} from '@/lib/serviceRoom/serviceRecordsApi'

export const runtime = 'nodejs'

// GET — list this watch's records, most-recent-first.
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('watch_service_records')
    .select('*')
    .eq('watch_id', params.id)
    .order('service_date', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ records: (data ?? []).map(r => rowToRecord(r as RecordRow)) })
}

// POST — create a record.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const owns = await assertOwnsWatch(supabase, params.id, user.id)
  if (!owns.ok) return NextResponse.json({ error: owns.message }, { status: owns.status })

  let body: Record<string, unknown>
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'invalid_body' }, { status: 400 }) }

  const { payload, errors } = parseRecordBody(body, false)
  if (errors.length) return NextResponse.json({ error: 'invalid_fields', fields: errors }, { status: 400 })

  const { data: newRow, error: insertError } = await supabase
    .from('watch_service_records')
    .insert({ ...payload, watch_id: params.id, user_id: user.id })
    .select()
    .single()
  if (insertError || !newRow) {
    return NextResponse.json({ error: insertError?.message ?? 'insert_failed' }, { status: 500 })
  }
  return NextResponse.json({ record: rowToRecord(newRow as RecordRow) })
}
