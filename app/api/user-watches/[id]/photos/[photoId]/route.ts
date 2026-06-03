import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { PhotoType } from '@/types/watch'

export const runtime = 'nodejs'

type Params = { params: { id: string; photoId: string } }

const PHOTO_TYPES: PhotoType[] = [
  'wrist_shot', 'dial', 'case_back', 'macro', 'lifestyle',
  'receipt', 'warranty_card', 'service_record', 'box_papers', 'appraisal', 'manual',
  'other',
]

// PATCH /api/user-watches/[id]/photos/[photoId] — update caption and/or primary.
// When isPrimary: true is set, atomically clear is_primary on every other photo
// for the same watch first.
export async function PATCH(request: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: { caption?: string | null; isPrimary?: boolean; photoType?: string | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  // Confirm photo exists, belongs to caller, and to the watch in the URL.
  const { data: photoRow, error: photoErr } = await supabase
    .from('user_watch_photos')
    .select('id, watch_id, user_id')
    .eq('id', params.photoId)
    .maybeSingle()
  if (photoErr) return NextResponse.json({ error: photoErr.message }, { status: 500 })
  if (!photoRow || photoRow.user_id !== user.id || photoRow.watch_id !== params.id) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  // If promoting to primary, demote others first. We can't do this in a single
  // statement under PostgREST, but the partial unique index guarantees we can't
  // end up with two primaries at rest.
  if (body.isPrimary === true) {
    const { error: clearErr } = await supabase
      .from('user_watch_photos')
      .update({ is_primary: false })
      .eq('watch_id', params.id)
      .neq('id', params.photoId)
    if (clearErr) return NextResponse.json({ error: clearErr.message }, { status: 500 })
  }

  const updates: Record<string, unknown> = {}
  if (body.caption !== undefined) updates.caption = body.caption
  if (body.isPrimary !== undefined) updates.is_primary = body.isPrimary
  if (body.photoType !== undefined) {
    // null clears the classification; otherwise must be a valid PhotoType.
    if (body.photoType === null) updates.photo_type = null
    else if (typeof body.photoType === 'string' && PHOTO_TYPES.includes(body.photoType as PhotoType)) {
      updates.photo_type = body.photoType
    } else {
      return NextResponse.json({ error: 'invalid_photo_type' }, { status: 400 })
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true })
  }

  const { data: updated, error: updateErr } = await supabase
    .from('user_watch_photos')
    .update(updates)
    .eq('id', params.photoId)
    .select()
    .single()
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  return NextResponse.json({
    photo: {
      id: updated.id,
      watchId: updated.watch_id,
      photoUrl: updated.photo_url,
      caption: updated.caption,
      sortOrder: updated.sort_order,
      isPrimary: updated.is_primary,
      createdAt: updated.created_at,
      photoType: updated.photo_type ?? undefined,
    },
  })
}

// DELETE /api/user-watches/[id]/photos/[photoId] — remove the row + storage object.
// If the deleted photo was primary and others remain, promote the oldest remaining
// photo to primary.
export async function DELETE(_request: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: photoRow, error: fetchErr } = await supabase
    .from('user_watch_photos')
    .select('id, watch_id, user_id, photo_url, is_primary')
    .eq('id', params.photoId)
    .maybeSingle()
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  if (!photoRow || photoRow.user_id !== user.id || photoRow.watch_id !== params.id) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const wasPrimary = photoRow.is_primary

  const { error: delErr } = await supabase
    .from('user_watch_photos')
    .delete()
    .eq('id', params.photoId)
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

  // Best-effort: extract the storage object path from the public URL and remove it.
  // Public URL shape: https://{project}.supabase.co/storage/v1/object/public/watch-photos/{path}
  try {
    const m = (photoRow.photo_url ?? '').match(/\/storage\/v1\/object\/public\/watch-photos\/(.+)$/)
    if (m && m[1]) {
      await supabase.storage.from('watch-photos').remove([m[1]])
    }
  } catch (err) {
    console.warn('[user-watch-photos] storage cleanup failed (non-fatal):', err)
  }

  // Promote next photo to primary if needed.
  if (wasPrimary) {
    const { data: next } = await supabase
      .from('user_watch_photos')
      .select('id')
      .eq('watch_id', params.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (next?.id) {
      await supabase
        .from('user_watch_photos')
        .update({ is_primary: true })
        .eq('id', next.id)
    }
  }

  return NextResponse.json({ ok: true })
}
