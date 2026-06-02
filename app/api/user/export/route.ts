import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type StateRow = { catalog_watch_id: string; state: string; metadata: Record<string, unknown> | null }

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const [watchesRes, statesRes, configRes, photosRes, boxesRes] = await Promise.all([
    supabase.from('watches').select('*').eq('user_id', user.id).order('sort_order'),
    supabase.from('watch_states').select('catalog_watch_id, state, metadata').eq('user_id', user.id),
    supabase.from('watchbox_config').select('*').eq('user_id', user.id).maybeSingle(),
    supabase
      .from('user_watch_photos')
      .select('id, watch_id, photo_url, caption, is_primary, photo_type, sort_order, taken_at, created_at')
      .eq('user_id', user.id),
    supabase.from('playground_boxes').select('*').eq('user_id', user.id).order('sort_order'),
  ])

  const states: StateRow[] = statesRes.data ?? []

  const nextTargets = states
    .filter(s => s.state === 'target')
    .map(s => {
      const meta = s.metadata ?? {}
      return {
        watchId: s.catalog_watch_id,
        desiredCondition: typeof meta.desiredCondition === 'string' ? meta.desiredCondition : 'Excellent',
        intent: meta.intent === 'Replacement' ? 'Replacement' : 'Addition',
        targetPrice: typeof meta.targetPrice === 'number' ? meta.targetPrice : undefined,
        notes: typeof meta.notes === 'string' ? meta.notes : undefined,
        targetDate: typeof meta.targetDate === 'string' ? meta.targetDate : undefined,
      }
    })

  const grailWatchId = states.find(s => s.state === 'grail')?.catalog_watch_id ?? null
  const collectionJewelWatchId = states.find(s => s.state === 'jewel')?.catalog_watch_id ?? null

  const payload = {
    exportedAt: new Date().toISOString(),
    userId: user.id,
    collection: watchesRes.data ?? [],
    watchStates: states,
    watchboxConfig: configRes.data ?? null,
    playgroundBoxes: boxesRes.data ?? [],
    nextTargets,
    grailWatchId,
    collectionJewelWatchId,
    photos: photosRes.data ?? [],
  }

  const date = new Date().toISOString().split('T')[0]
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="virtualwatchbox-export-${date}.json"`,
    },
  })
}
