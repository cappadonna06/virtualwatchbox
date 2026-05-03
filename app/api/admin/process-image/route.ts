import { NextRequest, NextResponse } from 'next/server'
import { processWatchImageBuffer } from '@/lib/imageProcessing'
import { identifyWatchWithVision } from '@/lib/watchVision'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('image') as File | null
  if (!file) return NextResponse.json({ error: 'No image provided' }, { status: 400 })

  const filename = file.name
  const inputBuffer = Buffer.from(await file.arrayBuffer())

  let processed
  try {
    processed = await processWatchImageBuffer(inputBuffer)
  } catch (err) {
    console.error('[admin/process-image] Sharp processing failed:', err)
    return NextResponse.json({ error: 'Image processing failed' }, { status: 422 })
  }

  const identification = await identifyWatchWithVision(inputBuffer, filename)

  return NextResponse.json({
    pngDataUrl: `data:image/png;base64,${processed.pngBuffer.toString('base64')}`,
    webpDataUrl: `data:image/webp;base64,${processed.webpBuffer.toString('base64')}`,
    sourceWidth: processed.sourceWidth,
    sourceHeight: processed.sourceHeight,
    processedWidth: processed.processedWidth,
    processedHeight: processed.processedHeight,
    backgroundRemovalApplied: processed.backgroundRemovalApplied,
    identification,
  })
}
