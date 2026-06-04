import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: { orderedIds?: unknown }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'invalid_body' }, { status: 400 }) }

  const orderedIds = Array.isArray(body.orderedIds)
    ? body.orderedIds.filter((v): v is string => typeof v === 'string')
    : []
  if (orderedIds.length === 0) return NextResponse.json({ error: 'empty_order' }, { status: 400 })

  const { data: existing, error: existingErr } = await supabase
    .from('user_straps')
    .select('id')
    .eq('user_id', user.id)
  if (existingErr) return NextResponse.json({ error: existingErr.message }, { status: 500 })

  const existingIds = new Set((existing ?? []).map(r => r.id as string))
  const orderedSet = new Set(orderedIds)
  const sameSet =
    existingIds.size === orderedSet.size
    && [...existingIds].every(id => orderedSet.has(id))
  if (!sameSet) return NextResponse.json({ error: 'order_mismatch' }, { status: 400 })

  for (let i = 0; i < orderedIds.length; i += 1) {
    const { error } = await supabase
      .from('user_straps')
      .update({ sort_order: i })
      .eq('id', orderedIds[i])
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
