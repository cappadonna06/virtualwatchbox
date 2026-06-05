import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import sharp from 'sharp'
import { createClient } from '@/lib/supabase/server'
import { loadOwnStrap, rowToStrap, type StrapRow } from '@/lib/strapDrawer/strapsApi'

export const maxDuration = 60
export const runtime = 'nodejs'

type Params = { params: { id: string } }

export async function POST(request: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const owns = await loadOwnStrap(supabase, params.id, user.id)
  if (!owns.ok) return NextResponse.json({ error: owns.message }, { status: owns.status })

  let form: FormData
  try { form = await request.formData() }
  catch { return NextResponse.json({ error: 'invalid_body' }, { status: 400 }) }

  const file = form.get('image')
  if (!(file instanceof File) || !file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'invalid_file' }, { status: 400 })
  }

  let bytes: Buffer
  try {
    bytes = await sharp(Buffer.from(await file.arrayBuffer()))
      .rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 86 })
      .toBuffer()
  } catch (err) {
    console.error('[user-straps-photo] sharp failed:', err)
    return NextResponse.json({ error: 'process_failed' }, { status: 500 })
  }

  const path = `user-uploads/${user.id}/straps/${crypto.randomUUID()}.jpg`
  const { error: uploadError } = await supabase
    .storage
    .from('watch-photos')
    .upload(path, bytes, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false })
  if (uploadError) {
    console.error('[user-straps-photo] upload failed:', uploadError)
    return NextResponse.json({ error: 'upload_failed' }, { status: 500 })
  }

  const { data: publicUrlData } = supabase.storage.from('watch-photos').getPublicUrl(path)
  const photoUrl = publicUrlData?.publicUrl ?? ''

  const { data: updated, error: updateErr } = await supabase
    .from('user_straps')
    .update({ photo_url: photoUrl })
    .eq('id', params.id)
    .select()
    .single()
  if (updateErr || !updated) {
    await supabase.storage.from('watch-photos').remove([path]).catch(() => {})
    return NextResponse.json({ error: updateErr?.message ?? 'update_failed' }, { status: 500 })
  }

  return NextResponse.json({ strap: rowToStrap(updated as StrapRow) })
}
