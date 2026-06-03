import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { createClient } from '@/lib/supabase/server'
import type { PhotoType } from '@/types/watch'

export const maxDuration = 60
export const runtime = 'nodejs'

const PHOTO_TYPES: PhotoType[] = [
  'wrist_shot', 'dial', 'case_back', 'macro', 'lifestyle',
  'receipt', 'warranty_card', 'service_record', 'box_papers', 'appraisal', 'manual',
  'other',
]

// Coerce an arbitrary value to a valid PhotoType, or null when absent/invalid.
function coercePhotoType(value: unknown): PhotoType | null {
  return typeof value === 'string' && PHOTO_TYPES.includes(value as PhotoType)
    ? (value as PhotoType) : null
}

type PhotoRow = {
  id: string
  watch_id: string
  user_id: string
  photo_url: string
  caption: string | null
  sort_order: number
  is_primary: boolean
  created_at: string
  photo_type: string | null
}

function rowToPhoto(row: PhotoRow) {
  return {
    id: row.id,
    watchId: row.watch_id,
    photoUrl: row.photo_url,
    caption: row.caption,
    sortOrder: row.sort_order,
    isPrimary: row.is_primary,
    createdAt: row.created_at,
    photoType: (row.photo_type ?? undefined) as PhotoType | undefined,
  }
}

// GET /api/user-watches/[id]/photos — list all photos for a watch the caller owns.
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('user_watch_photos')
    .select('*')
    .eq('watch_id', params.id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ photos: (data ?? []).map(rowToPhoto) })
}

// POST /api/user-watches/[id]/photos — multipart, accepts one or many `image` files.
// Resizes each to max 1600px JPEG (preserves aspect, no aggressive cropping —
// these are personal records). Inserts a row per file. The first uploaded photo
// for a watch with zero photos auto-gets is_primary=true.
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // Confirm the user actually owns this watch — RLS would catch the insert
  // anyway but failing fast gives a better error.
  const { data: ownedRow, error: ownedErr } = await supabase
    .from('watches')
    .select('id, user_id')
    .eq('id', params.id)
    .maybeSingle()
  if (ownedErr) return NextResponse.json({ error: ownedErr.message }, { status: 500 })
  if (!ownedRow || ownedRow.user_id !== user.id) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  // Two body modes:
  //  - multipart/form-data with one or many `image` files → upload + insert
  //  - application/json with `{ photoUrl }` → register an already-uploaded URL.
  //    Used by the AI photo flow which uploads server-side via a different
  //    route and just needs to associate the result with this owned watch.
  const contentType = request.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    let body: { photoUrl?: unknown; caption?: unknown; photoType?: unknown }
    try { body = await request.json() }
    catch { return NextResponse.json({ error: 'invalid_body' }, { status: 400 }) }

    const photoUrl = typeof body.photoUrl === 'string' ? body.photoUrl.trim() : ''
    if (!photoUrl) return NextResponse.json({ error: 'no_photo_url' }, { status: 400 })
    const photoType = coercePhotoType(body.photoType)

    const { data: existingRows } = await supabase
      .from('user_watch_photos')
      .select('id, sort_order, is_primary')
      .eq('watch_id', params.id)
    const hasAnyPrimary = (existingRows ?? []).some(p => p.is_primary)
    const startSort = (existingRows ?? []).reduce((max, p) => Math.max(max, p.sort_order ?? 0), -1) + 1

    const { data: newRow, error: insertError } = await supabase
      .from('user_watch_photos')
      .insert({
        watch_id: params.id,
        user_id: user.id,
        photo_url: photoUrl,
        caption: typeof body.caption === 'string' ? body.caption : null,
        sort_order: startSort,
        is_primary: !hasAnyPrimary,
        photo_type: photoType,
      })
      .select()
      .single()
    if (insertError || !newRow) {
      return NextResponse.json({ error: insertError?.message ?? 'insert_failed' }, { status: 500 })
    }
    return NextResponse.json({ photos: [rowToPhoto(newRow as PhotoRow)] })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'invalid_form' }, { status: 400 })
  }

  const files = formData.getAll('image').filter((v): v is File => v instanceof File && v.size > 0)
  if (files.length === 0) {
    return NextResponse.json({ error: 'no_image' }, { status: 400 })
  }

  // Optional photo classification applied to every file in this upload.
  const photoType = coercePhotoType(formData.get('photoType'))

  // Discover existing photo count + max sort_order so new photos append cleanly.
  const { data: existing, error: existingErr } = await supabase
    .from('user_watch_photos')
    .select('id, sort_order, is_primary')
    .eq('watch_id', params.id)
  if (existingErr) return NextResponse.json({ error: existingErr.message }, { status: 500 })

  const hasAnyPrimary = (existing ?? []).some(p => p.is_primary)
  const startSort = (existing ?? []).reduce((max, p) => Math.max(max, p.sort_order ?? 0), -1) + 1

  const inserted: PhotoRow[] = []
  for (let i = 0; i < files.length; i += 1) {
    const file = files[i]
    let processed: Buffer
    try {
      processed = await sharp(Buffer.from(await file.arrayBuffer()))
        .rotate()
        .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 86 })
        .toBuffer()
    } catch (err) {
      console.error('[user-watch-photos] sharp failed:', err)
      continue
    }

    const filename = `${crypto.randomUUID()}.jpg`
    const path = `user-uploads/${user.id}/gallery/${filename}`
    const { error: uploadError } = await supabase
      .storage
      .from('watch-photos')
      .upload(path, processed, {
        contentType: 'image/jpeg',
        cacheControl: '31536000',
        upsert: false,
      })
    if (uploadError) {
      console.error('[user-watch-photos] upload failed:', uploadError)
      continue
    }

    const { data: publicUrlData } = supabase
      .storage
      .from('watch-photos')
      .getPublicUrl(path)
    const photoUrl = publicUrlData?.publicUrl ?? ''

    // First photo on a watch with no existing primary becomes primary.
    const isPrimary = !hasAnyPrimary && inserted.length === 0

    const { data: newRow, error: insertError } = await supabase
      .from('user_watch_photos')
      .insert({
        watch_id: params.id,
        user_id: user.id,
        photo_url: photoUrl,
        caption: null,
        sort_order: startSort + i,
        is_primary: isPrimary,
        photo_type: photoType,
      })
      .select()
      .single()
    if (insertError || !newRow) {
      console.error('[user-watch-photos] insert failed:', insertError)
      // Best-effort cleanup of orphaned storage object.
      await supabase.storage.from('watch-photos').remove([path]).catch(() => {})
      continue
    }
    inserted.push(newRow as PhotoRow)
  }

  if (inserted.length === 0) {
    return NextResponse.json({ error: 'all_uploads_failed' }, { status: 502 })
  }

  return NextResponse.json({ photos: inserted.map(rowToPhoto) })
}
