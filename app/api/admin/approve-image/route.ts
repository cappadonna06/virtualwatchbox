import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
    console.error('[admin/approve-image] Storage upload failed:', pngUpload.error ?? webpUpload.error)
    return NextResponse.json({ error: 'Storage upload failed' }, { status: 500 })
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

  return NextResponse.json({
    pngUrl: pngUrlData.publicUrl,
    webpUrl: webpUrlData.publicUrl,
  })
}
