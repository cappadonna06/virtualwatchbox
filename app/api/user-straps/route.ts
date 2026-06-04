import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseStrapBody, rowToStrap, type StrapRow } from '@/lib/strapDrawer/strapsApi'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('user_straps')
    .select('*')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ straps: (data ?? []).map(r => rowToStrap(r as StrapRow)) })
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'invalid_body' }, { status: 400 }) }

  const { payload, errors } = parseStrapBody(body, false)
  if (errors.length) return NextResponse.json({ error: 'invalid_fields', fields: errors }, { status: 400 })

  // New straps get the highest sort_order so "Recently added" (sort_order desc)
  // surfaces them first.
  if (payload.sort_order === undefined) {
    const { data: maxRow } = await supabase
      .from('user_straps')
      .select('sort_order')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()
    payload.sort_order = ((maxRow?.sort_order as number | undefined) ?? -1) + 1
  }

  const { data: newRow, error: insertError } = await supabase
    .from('user_straps')
    .insert({ ...payload, user_id: user.id })
    .select()
    .single()
  if (insertError || !newRow) {
    return NextResponse.json({ error: insertError?.message ?? 'insert_failed' }, { status: 500 })
  }
  return NextResponse.json({ strap: rowToStrap(newRow as StrapRow) })
}
