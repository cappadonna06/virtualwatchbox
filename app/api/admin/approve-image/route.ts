import { NextRequest, NextResponse } from 'next/server'
import { type SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { screenProcessedImage } from '@/lib/imageProcessing/screener'
import { llmScreenImage } from '@/lib/imageProcessing/llmScreener'

export const maxDuration = 30
export const runtime = 'nodejs'

// Auto-screen a freshly approved primary image and, if it looks off (rotated,
// dial-only, arm in shot, wrong subject, etc.), write a watch_image_reviews row
// flagging it as 'needs_reprocess' so it surfaces in /admin/image-review. We
// never auto-delete here — flagging keeps the image visible for human review.
// Best-effort: any failure is logged and swallowed so it can't block approval.
async function autoScreenAndFlag(
  supabase: SupabaseClient,
  watchId: string,
  pngBuffer: Buffer,
): Promise<{ flagged: boolean; tags: string[] }> {
  try {
    const tags = new Set<string>()
    const reasons: string[] = []

    const rules = await screenProcessedImage(pngBuffer)
    rules.tags.forEach(t => tags.add(t))
    rules.reasons.forEach(r => reasons.push(`[rule] ${r}`))

    // The LLM pass catches wrong-subject cases the rules can't (arm/hand in
    // frame, watch in a display box, subtle wrong orientation). Only runs when
    // an OpenAI key is configured; skipped silently otherwise.
    if (process.env.OPENAI_API_KEY) {
      try {
        const llm = await llmScreenImage(pngBuffer)
        if (!llm.isClean) {
          llm.tags.forEach(t => tags.add(t))
          if (llm.reason) reasons.push(`[llm] ${llm.reason}`)
        }
      } catch (err) {
        console.warn('[admin/approve-image] LLM screen failed (non-fatal):', err)
      }
    }

    if (tags.size === 0) return { flagged: false, tags: [] }

    const tagList = Array.from(tags)
    const notes = `[auto-screener] ${reasons.join(' | ')}`.slice(0, 1000)
    const { error } = await supabase.from('watch_image_reviews').insert({
      catalog_watch_id: watchId,
      variant: 'primary',
      status: 'needs_reprocess',
      tags: tagList,
      notes,
      reviewer_id: null,
    })
    if (error) console.warn('[admin/approve-image] auto-flag insert failed:', error.message)
    return { flagged: true, tags: tagList }
  } catch (err) {
    console.warn('[admin/approve-image] auto-screen failed (non-fatal):', err)
    return { flagged: false, tags: [] }
  }
}

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

  // Migration 014 renamed watch_id → catalog_watch_id, added a `variant`
  // discriminator, and replaced the old UNIQUE(watch_id) with a unique index
  // on (catalog_watch_id, variant, sort_order). Re-approving a watch's primary
  // photo must update that one row, so we conflict-target all three columns
  // with the fixed (primary, 0) coordinates this curated upload always writes.
  const { error: dbError } = await supabase.from('watch_images').upsert({
    catalog_watch_id: watchId,
    variant: 'primary',
    sort_order: 0,
    png_url: pngUrlData.publicUrl,
    webp_url: webpUrlData.publicUrl,
    source_width: sourceWidth,
    source_height: sourceHeight,
    processed_width: processedWidth,
    processed_height: processedHeight,
    background_removal_applied: backgroundRemovalApplied,
    approved_at: new Date().toISOString(),
  }, { onConflict: 'catalog_watch_id,variant,sort_order' })

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

  const screen = await autoScreenAndFlag(supabase, watchId, pngBuffer)

  return NextResponse.json({
    pngUrl: pngUrlData.publicUrl,
    webpUrl: webpUrlData.publicUrl,
    flagged: screen.flagged,
    flaggedTags: screen.tags,
  })
}
