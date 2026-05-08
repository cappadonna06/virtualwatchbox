import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export const maxDuration = 30
export const runtime = 'nodejs'

type ApprovePayload = {
  watchId: string
  pngDataUrl: string
  webpDataUrl: string
  sourceWidth: number
  sourceHeight: number
  processedWidth: number
  processedHeight: number
  backgroundRemovalApplied: boolean
}

export async function POST(request: NextRequest) {
  const gate = await requireAdmin()
  if (!gate.ok) return gate.response
  // Service-role client bypasses storage RLS so admin uploads land regardless
  // of how the bucket policies are configured. requireAdmin() already gates
  // who can hit this route, which is the intended security boundary.
  const supabase = createAdminClient() ?? createClient()

  const body = await request.json() as ApprovePayload
  const { watchId, pngDataUrl, webpDataUrl, sourceWidth, sourceHeight, processedWidth, processedHeight, backgroundRemovalApplied } = body

  if (!watchId || !pngDataUrl || !webpDataUrl) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const pngBuffer = Buffer.from(pngDataUrl.split(',')[1], 'base64')
  const webpBuffer = Buffer.from(webpDataUrl.split(',')[1], 'base64')

  const pngPath = `processed/${watchId}.png`
  const webpPath = `processed/webp/${watchId}.webp`

  const [pngUpload, webpUpload] = await Promise.all([
    supabase.storage.from('watch-images').upload(pngPath, pngBuffer, {
      contentType: 'image/png',
      upsert: true,
    }),
    supabase.storage.from('watch-images').upload(webpPath, webpBuffer, {
      contentType: 'image/webp',
      upsert: true,
    }),
  ])

  if (pngUpload.error || webpUpload.error) {
    const err = pngUpload.error ?? webpUpload.error
    console.error('[admin/approve-image] Storage upload failed:', err)
    // Surface the underlying cause (bucket missing, RLS denied, etc.) so the
    // admin sees something actionable instead of a generic message.
    return NextResponse.json({
      error: 'Storage upload failed',
      detail: err?.message ?? 'unknown',
    }, { status: 500 })
  }

  const { data: pngUrlData } = supabase.storage.from('watch-images').getPublicUrl(pngPath)
  const { data: webpUrlData } = supabase.storage.from('watch-images').getPublicUrl(webpPath)

  const { error: dbError } = await supabase.from('watch_images').upsert({
    watch_id: watchId,
    png_url: pngUrlData.publicUrl,
    webp_url: webpUrlData.publicUrl,
    source_width: sourceWidth,
    source_height: sourceHeight,
    processed_width: processedWidth,
    processed_height: processedHeight,
    background_removal_applied: backgroundRemovalApplied,
    approved_at: new Date().toISOString(),
  }, { onConflict: 'watch_id' })

  if (dbError) {
    console.error('[admin/approve-image] DB insert failed:', dbError)
    return NextResponse.json({ error: 'Database insert failed' }, { status: 500 })
  }

  // Once a curated image lands in `watch_images`, the user-submitted wrist
  // photo on the catalog row is no longer the right thing to render. The
  // wrist shot is already preserved in `user_watch_photos` (registered at
  // submission time), so clearing `catalog_watches.image_url` demotes it to
  // the per-watch gallery and prevents it from leaking back as a fallback if
  // the watch_images lookup ever misses (transient RLS/network). Best-effort:
  // failure here is logged but doesn't fail the request, since the curated
  // image is already saved.
  const { error: clearError } = await supabase
    .from('catalog_watches')
    .update({ image_url: null })
    .eq('id', watchId)
  if (clearError) {
    console.error('[admin/approve-image] Failed to clear catalog image_url:', clearError)
  }

  return NextResponse.json({
    pngUrl: pngUrlData.publicUrl,
    webpUrl: webpUrlData.publicUrl,
  })
}
