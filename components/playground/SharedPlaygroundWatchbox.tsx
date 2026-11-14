'use client'

import WatchBox from '@/components/collection/WatchBox'
import type { PlaygroundShare, SharedCatalogWatch } from '@/lib/playgroundShare'

export default function SharedPlaygroundWatchbox({
  frame, lining, slotCount, watches,
}: Pick<PlaygroundShare, 'frame' | 'lining' | 'slotCount'> & {
  watches: Array<SharedCatalogWatch & { slot: number; watchId: string }>
}) {
  const watchBySlot = new Map(watches.map(({ slot, ...watch }) => [slot, { ...watch, id: String(slot) }]))
  return (
    <WatchBox
      watches={[...watchBySlot.values()]}
      watchBySlot={watchBySlot}
      activeSlot={null}
      frame={frame}
      lining={lining}
      slotCount={slotCount}
      mode="playground"
      readonly
    />
  )
}
