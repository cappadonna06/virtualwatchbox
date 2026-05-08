import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cropToDialSquare, readBboxFromFormData } from '@/lib/imageCrop'

export const maxDuration = 30
export const runtime = 'nodejs'

// Stores a user's uploaded watch photo to Supabase Storage and returns the
// public URL. Used when the user matches an in-catalog watch but the catalog
// row has no curated image — we keep their photo so the watchbox renders it
// instead of the SVG dial fallback.
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'invalid_form' }, { status: 400 })
  }

  const file = formData.get('image')
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'no_image' }, { status: 400 })
  }

  // Crop to a dial-focused square using the AI's normalized bbox if provided.
  // Falls back to a centered square crop when no bbox is available so the
  // watchbox slot still shows a balanced image.
  const bbox = readBboxFromFormData(formData)
  let processedBuffer: Buffer
  try {
    processedBuffer = await cropToDialSquare(
      Buffer.from(await file.arrayBuffer()),
      bbox,
    )
  } catch (err) {
    console.error('[upload-photo] sharp failed:', err)
    return NextResponse.json({ error: 'image_processing_failed' }, { status: 422 })
  }

  const photoFilename = `${crypto.randomUUID()}.jpg`
  const photoPath = `user-uploads/${user.id}/${photoFilename}`
  const { error: uploadError } = await supabase
    .storage
    .from('watch-photos')
    .upload(photoPath, processedBuffer, {
      contentType: 'image/jpeg',
      cacheControl: '31536000',
      upsert: false,
    })
  if (uploadError) {
    console.error('[upload-photo] storage upload failed:', uploadError)
    return NextResponse.json({ error: 'upload_failed', detail: uploadError.message }, { status: 502 })
  }

  const { data: publicUrlData } = supabase
    .storage
    .from('watch-photos')
    .getPublicUrl(photoPath)
  const photoUrl = publicUrlData?.publicUrl ?? ''

  return NextResponse.json({ photoUrl })
}
