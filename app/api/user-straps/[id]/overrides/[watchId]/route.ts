import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { loadOwnStrap } from '@/lib/strapDrawer/strapsApi'

type Params = { params: { id: string; watchId: string } }

export async function DELETE(_request: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const owns = await loadOwnStrap(supabase, params.id, user.id)
  if (!owns.ok) return NextResponse.json({ error: owns.message }, { status: owns.status })

  const { error } = await supabase
    .from('strap_watch_overrides')
    .delete()
    .eq('strap_id', params.id)
    .eq('watch_id', params.watchId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
