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

/**
 * Repack entries into a (potentially smaller) slot count without losing data.
 * In-range entries keep their slot. Out-of-range entries are packed into the
 * lowest unclaimed slots in order. Any that still don't fit retain a slot
 * value beyond the new range — the overflow tile will collect them.
 *
 * Used when shrinking a watchbox: `[W][ ][ ][ ][ ][ ][ ][W]` → 6 slots →
 * `[W][W][ ][ ][ ][ ]`. Same helper works for owned watches and playground
 * entries via the slot getter/setter.
 */
export function packToSlotCount<T>(
  entries: T[],
  newSlotCount: number,
  getSlot: (entry: T, index: number) => number,
  setSlot: (entry: T, slot: number) => T,
): T[] {
  if (newSlotCount <= 0) return entries
  const withSlots = entries.map((entry, index) => ({ entry, slot: getSlot(entry, index) }))
  withSlots.sort((a, b) => a.slot - b.slot)

  const inRange = withSlots.filter(x => x.slot < newSlotCount)
  const outOfRange = withSlots.filter(x => x.slot >= newSlotCount)
  if (outOfRange.length === 0) {
    // Already fits; keep order and slots stable.
    return entries
  }

  const claimed = new Set(inRange.map(x => x.slot))
  const emptySlots: number[] = []
  for (let i = 0; i < newSlotCount; i++) if (!claimed.has(i)) emptySlots.push(i)

  const result: T[] = inRange.map(x => x.entry)
  let emptyIdx = 0
  let overflowSlot = newSlotCount
  for (const { entry } of outOfRange) {
    const newSlot = emptyIdx < emptySlots.length ? emptySlots[emptyIdx++] : overflowSlot++
    result.push(setSlot(entry, newSlot))
  }
  return result
}
