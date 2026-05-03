import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function generateId(brand: string, model: string, reference: string) {
  return [slugify(brand), slugify(model), slugify(reference)].filter(Boolean).join('-')
}

export async function GET() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('catalog_watches')
    .select('*')
    .order('brand')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ watches: data })
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const id = body.id || generateId(body.brand ?? '', body.model ?? '', body.reference ?? '')

  const { data, error } = await supabase
    .from('catalog_watches')
    .upsert({ ...body, id }, { onConflict: 'id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ watch: data })
}
