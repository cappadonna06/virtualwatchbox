import { SLOT_COUNTS } from '@/lib/frameConfig'

const SUPPORTED_SLOT_COUNTS = SLOT_COUNTS.map(slot => slot.n).sort((a, b) => a - b)
const MAX_WATCHBOX_SLOTS = SUPPORTED_SLOT_COUNTS[SUPPORTED_SLOT_COUNTS.length - 1] ?? 10

export type OverflowItem<T> = {
  item: T
  index: number
}

export function getEffectiveSlotCount(currentSlotCount: number, itemCount: number): number {
  if (itemCount <= currentSlotCount) return currentSlotCount
  return SUPPORTED_SLOT_COUNTS.find(slotCount => slotCount >= itemCount) ?? MAX_WATCHBOX_SLOTS
}

export function getWatchboxOverflow<T>(items: T[], slotCount: number) {
  const hasOverflow = items.length > slotCount
  const visibleSlots = hasOverflow ? Math.max(slotCount - 1, 0) : slotCount
  const visibleItems = items.slice(0, visibleSlots)
  const hiddenItems = items.slice(visibleSlots).map((item, index) => ({
    item,
    index: visibleSlots + index,
  }))

  return {
    hasOverflow,
    visibleSlots,
    visibleItems,
    hiddenItems,
    overflowCount: hiddenItems.length,
    maxSlotCount: MAX_WATCHBOX_SLOTS,
  }
}

export function getOverflowSummary(slotCount: number, overflowCount: number): string | null {
  if (overflowCount <= 0) return null
  return `${slotCount} shown · ${overflowCount} more in overflow`
}
