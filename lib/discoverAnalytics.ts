'use client'

import { createClient } from '@/lib/supabase/client'

export type DiscoverEventType =
  | 'impression'
  | 'click'
  | 'refresh'
  | 'target'
  | 'follow'
  | 'grail'
  | 'market_click'

export type DiscoverSection = 'upgrade' | 'hero' | 'next_slot'

export type DiscoverEvent = {
  eventType: DiscoverEventType
  section: DiscoverSection
  seedKey?: string | null
  catalogWatchId?: string | null
  slotIndex?: number | null
  refreshOffset?: number | null
}

// Fire-and-forget insert against public.discover_events. Errors are swallowed
// so a network blip never trips up the UI. RLS allows anonymous inserts with
// a null user_id; signed-in inserts get the auth.uid() automatically.
export function logDiscoverEvent(event: DiscoverEvent): void {
  if (typeof window === 'undefined') return
  try {
    const supabase = createClient()
    void supabase.auth.getUser().then(({ data }) => {
      const row = {
        user_id: data.user?.id ?? null,
        event_type: event.eventType,
        section: event.section,
        seed_key: event.seedKey ?? null,
        catalog_watch_id: event.catalogWatchId ?? null,
        slot_index: event.slotIndex ?? null,
        refresh_offset: event.refreshOffset ?? 0,
      }
      void supabase.from('discover_events').insert(row).then(() => undefined, () => undefined)
    }, () => undefined)
  } catch {
    // Never block on analytics.
  }
}
