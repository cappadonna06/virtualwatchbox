import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { dialColorToHex, dialMarkerHex, dialHandHex } from '@/lib/dialColors'
import { cropToDialSquare, readBboxFromFormData } from '@/lib/imageCrop'
import type { WatchType } from '@/types/watch'

export const maxDuration = 60
export const runtime = 'nodejs'

const ALLOWED_WATCH_TYPES: WatchType[] = [
  'Diver', 'Dress', 'Sport', 'Chronograph', 'GMT',
  'Pilot', 'Field', 'Integrated Bracelet', 'Vintage',
]

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function normalizeWatchType(v: string): WatchType {
  const direct = ALLOWED_WATCH_TYPES.find(t => t === v)
  return direct ?? 'Sport'
}

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
  const brand = String(formData.get('brand') ?? '').trim()
  const model = String(formData.get('model') ?? '').trim()
  const reference = String(formData.get('reference') ?? '').trim()
  const dialColor = String(formData.get('dialColor') ?? '').trim()
  const watchTypeRaw = String(formData.get('watchType') ?? 'Sport').trim()
  const caseSizeMmRaw = String(formData.get('caseSizeMm') ?? '').trim()
  const caseMaterial = String(formData.get('caseMaterial') ?? '').trim()
  const movement = String(formData.get('movement') ?? '').trim()
  const estimatedValueRaw = String(formData.get('estimatedValue') ?? '').trim()

  if (!brand || !model) {
    return NextResponse.json({ error: 'missing_fields', detail: 'brand and model are required' }, { status: 400 })
  }
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'no_image' }, { status: 400 })
  }

  // Crop to a dial-focused square using the AI's normalized bbox when provided.
  // Falls back to a centered square crop so the watchbox slot is consistent.
  const bbox = readBboxFromFormData(formData)
  let processedBuffer: Buffer
  try {
    processedBuffer = await cropToDialSquare(
      Buffer.from(await file.arrayBuffer()),
      bbox,
    )
  } catch (err) {
    console.error('[create-from-photo] sharp failed:', err)
    return NextResponse.json({ error: 'image_processing_failed' }, { status: 422 })
  }

  // Upload to Supabase Storage at user-uploads/{user_id}/{uuid}.jpg
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
    console.error('[create-from-photo] storage upload failed:', uploadError)
    return NextResponse.json({ error: 'upload_failed', detail: uploadError.message }, { status: 502 })
  }

  const { data: publicUrlData } = supabase
    .storage
    .from('watch-photos')
    .getPublicUrl(photoPath)
  const photoUrl = publicUrlData?.publicUrl ?? ''

  // Build the catalog row. id = brand-model-{ref|dial}-{user-suffix}
  // The user-suffix keeps the row distinct from any later admin-curated row
  // for the same watch; if the admin later approves and consolidates, they
  // can repoint the user's owned-watch row to the canonical id.
  const userSuffix = user.id.slice(0, 8)
  const idBase = [
    slugify(brand),
    slugify(model),
    slugify(reference || dialColor || 'photo'),
    userSuffix,
  ].filter(Boolean).join('-')

  const dialHex = dialColorToHex(dialColor)
  const watchType = normalizeWatchType(watchTypeRaw)

  const caseSizeMm = caseSizeMmRaw ? Number(caseSizeMmRaw) : 0
  const estimatedValue = estimatedValueRaw ? Number(estimatedValueRaw) : 0

  const catalogRow = {
    id: idBase,
    brand,
    model,
    reference: reference || '',
    case_size_mm: Number.isFinite(caseSizeMm) ? caseSizeMm : 0,
    lug_width_mm: null as number | null,
    case_material: caseMaterial,
    dial_color: dialColor,
    movement,
    complications: [] as string[],
    estimated_value: Number.isFinite(estimatedValue) ? estimatedValue : 0,
    watch_type: watchType,
    dial_color_hex: dialHex,
    marker_color_hex: dialMarkerHex(dialHex),
    hand_color_hex: dialHandHex(dialHex),
    source: 'user_photo',
    moderation_status: 'pending',
    submitted_by: user.id,
    image_url: photoUrl,
  }

  const { data: inserted, error: insertError } = await supabase
    .from('catalog_watches')
    .upsert(catalogRow, { onConflict: 'id' })
    .select()
    .single()
  if (insertError || !inserted) {
    console.error('[create-from-photo] catalog insert failed:', insertError)
    // Best-effort cleanup of the uploaded photo
    await supabase.storage.from('watch-photos').remove([photoPath]).catch(() => {})
    return NextResponse.json({ error: 'catalog_insert_failed', detail: insertError?.message }, { status: 502 })
  }

  return NextResponse.json({
    catalogWatch: {
      id: inserted.id,
      brand: inserted.brand,
      model: inserted.model,
      reference: inserted.reference,
      caseSizeMm: Number(inserted.case_size_mm),
      caseMaterial: inserted.case_material ?? '',
      dialColor: inserted.dial_color ?? '',
      movement: inserted.movement ?? '',
      complications: [],
      estimatedValue: Number(inserted.estimated_value ?? 0),
      watchType: inserted.watch_type as WatchType,
      imageUrl: inserted.image_url ?? '',
      dialConfig: {
        dialColor: inserted.dial_color_hex,
        markerColor: inserted.marker_color_hex,
        handColor: inserted.hand_color_hex,
      },
    },
    photoUrl,
  })
}
