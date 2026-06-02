import { SLOT_COUNTS } from '@/lib/frameConfig'
import { DEFAULT_RESOLVED_WATCH_CONDITION } from '@/lib/watchData'
import type {
  CatalogWatch,
  PlaygroundBox,
  PlaygroundBoxEntry,
  PlaygroundWatchOverrides,
  ResolvedOwnedWatch,
  ResolvedWatch,
} from '@/types/watch'

type LegacyPlaygroundBox = {
  id: string
  name: string
  tags?: string[]
  watchIds?: string[]
  entries?: PlaygroundBoxEntry[]
  frame?: string
  lining?: string
  slotCount?: number
  createdAt?: string
}

export type ResolvedPlaygroundWatch = {
  entry: PlaygroundBoxEntry
  sourceWatch: CatalogWatch
  displayWatch: ResolvedWatch
  /** Sparse slot index this resolved watch occupies. */
  slot: number
}

const DEFAULT_FRAME = 'light-oak'
const DEFAULT_LINING = 'cream'
const DEFAULT_SLOT_COUNT = 6

// playground_boxes.id is a Postgres `uuid` column. A box id that isn't a valid
// UUID (the legacy `pg-...` prefix, or the seed's `pg-dream-1` sentinel) makes
// the Supabase upsert fail with an invalid-syntax error — which is why
// playground boxes silently failed to persist across logins.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function isUuid(value: string): boolean {
  return UUID_RE.test(value)
}

function getDefaultSlotCount(entryCount: number) {
  return SLOT_COUNTS.find(slot => slot.n >= Math.max(entryCount, DEFAULT_SLOT_COUNT))?.n
    ?? SLOT_COUNTS[SLOT_COUNTS.length - 1].n
}

export function createPlaygroundEntry(
  watchId: string,
  overrides?: PlaygroundWatchOverrides,
  id?: string,
  slot?: number,
): PlaygroundBoxEntry {
  return {
    id: id ?? `pge-${crypto.randomUUID()}`,
    watchId,
    ...(typeof slot === 'number' ? { slot } : {}),
    ...(overrides ? { overrides } : {}),
  }
}

export function createPlaygroundBox({
  name,
  tags = [],
  entries = [],
  id,
  createdAt,
}: {
  name: string
  tags?: string[]
  entries?: PlaygroundBoxEntry[]
  id?: string
  createdAt?: string
}): PlaygroundBox {
  return {
    id: id && isUuid(id) ? id : crypto.randomUUID(),
    name: name.trim(),
    tags,
    entries,
    frame: DEFAULT_FRAME,
    lining: DEFAULT_LINING,
    slotCount: getDefaultSlotCount(entries.length),
    createdAt: createdAt ?? new Date().toISOString(),
  }
}

/** Returns each entry's slot, falling back to array index for legacy entries. */
export function getEntrySlot(entry: PlaygroundBoxEntry, fallbackIndex: number): number {
  return typeof entry.slot === 'number' ? entry.slot : fallbackIndex
}

/** First slot index not claimed by any entry. Useful when appending without an explicit slot. */
export function getNextFreeSlot(entries: PlaygroundBoxEntry[], slotCount: number): number {
  const claimed = new Set(entries.map((e, i) => getEntrySlot(e, i)))
  for (let i = 0; i < slotCount; i++) if (!claimed.has(i)) return i
  // No free visible slot — append past the visible range so overflow handles it.
  let n = slotCount
  while (claimed.has(n)) n++
  return n
}

export function addWatchToPlaygroundBox(
  boxes: PlaygroundBox[],
  boxId: string,
  watchId: string,
  slot?: number,
) {
  return boxes.map(box => {
    if (box.id !== boxId) return box
    const targetSlot = typeof slot === 'number'
      ? slot
      : getNextFreeSlot(box.entries, box.slotCount)
    return placeEntryAtSlot(box, watchId, targetSlot)
  })
}

export function importCollectionToPlaygroundBox(
  boxes: PlaygroundBox[],
  boxId: string,
  ownedWatches: ResolvedOwnedWatch[],
): PlaygroundBox[] {
  return boxes.map(box => {
    if (box.id !== boxId) return box
    // Preserve the user's collection ordering (their owned-watch sort_order),
    // but pack into 0..N-1 so an imported box never starts with gaps.
    const sorted = [...ownedWatches].sort((a, b) => a.slot - b.slot)
    const entries = sorted.map((owned, index) => {
      const overrides: PlaygroundWatchOverrides = {}
      if (owned.condition) overrides.condition = owned.condition
      if (owned.notes) overrides.notes = owned.notes
      return createPlaygroundEntry(
        owned.watchId,
        Object.keys(overrides).length > 0 ? overrides : undefined,
        undefined,
        index,
      )
    })
    return { ...box, entries }
  })
}

/**
 * Sparse-slot drop: place a watch at exactly the given slot.
 * If a different entry already occupies that slot it is removed (replace).
 * Gaps between filled slots are preserved.
 */
export function placeWatchInPlaygroundSlot(
  boxes: PlaygroundBox[],
  boxId: string,
  slotIndex: number,
  watchId: string,
): PlaygroundBox[] {
  return boxes.map(box => box.id === boxId ? placeEntryAtSlot(box, watchId, slotIndex) : box)
}

function placeEntryAtSlot(box: PlaygroundBox, watchId: string, slotIndex: number): PlaygroundBox {
  const stripped = box.entries.filter((e, i) => getEntrySlot(e, i) !== slotIndex)
  const newEntry = createPlaygroundEntry(watchId, undefined, undefined, slotIndex)
  return { ...box, entries: [...stripped, newEntry] }
}

export type TrayDropOutcome =
  | { kind: 'placed'; boxes: PlaygroundBox[] }
  | { kind: 'grown'; boxes: PlaygroundBox[]; newSlotCount: number; placedSlot: number }
  | { kind: 'rejected' }

/**
 * Tray drop decision: place at the target slot (empty), replace at the target
 * slot (occupied but other slots are empty so the user could have aimed
 * elsewhere — treat as intent to replace), grow the box and add to the next
 * slot (occupied and box is full), or refuse (occupied, full, already at max).
 *
 * The "grow" case is what stops a tray drop from silently destroying a watch
 * just because the user happened to drop on an occupied slot.
 */
export function tryAddOrGrowPlaygroundBox(
  boxes: PlaygroundBox[],
  boxId: string,
  targetSlot: number,
  watchId: string,
  supportedSlotCounts: number[],
): TrayDropOutcome {
  const box = boxes.find(b => b.id === boxId)
  if (!box) return { kind: 'placed', boxes }

  const slots = new Map<number, PlaygroundBoxEntry>()
  box.entries.forEach((e, i) => slots.set(getEntrySlot(e, i), e))
  const occupiedAtTarget = slots.has(targetSlot)

  if (!occupiedAtTarget) {
    return { kind: 'placed', boxes: placeWatchInPlaygroundSlot(boxes, boxId, targetSlot, watchId) }
  }

  // Target is occupied. Are there empty slots elsewhere in the visible range?
  let hasOtherEmpty = false
  for (let i = 0; i < box.slotCount; i++) {
    if (i !== targetSlot && !slots.has(i)) { hasOtherEmpty = true; break }
  }
  if (hasOtherEmpty) {
    // User had other empty slots they could have targeted; treat as intent
    // to replace at the chosen slot.
    return { kind: 'placed', boxes: placeWatchInPlaygroundSlot(boxes, boxId, targetSlot, watchId) }
  }

  // Box is full in the visible range. Try to grow.
  const sortedCounts = [...supportedSlotCounts].sort((a, b) => a - b)
  const nextCount = sortedCounts.find(n => n > box.slotCount)
  if (nextCount === undefined) {
    // Already at max — refuse rather than destroy a watch.
    return { kind: 'rejected' }
  }

  // Place at the first slot in the newly-available range (typically the old
  // slotCount value).
  const newSlot = box.slotCount
  const newEntry = createPlaygroundEntry(watchId, undefined, undefined, newSlot)
  const grownBoxes = boxes.map(b => b.id === boxId
    ? { ...b, slotCount: nextCount, entries: [...b.entries, newEntry] }
    : b,
  )
  return { kind: 'grown', boxes: grownBoxes, newSlotCount: nextCount, placedSlot: newSlot }
}

/** Move/swap an entry from one slot to another. If the destination is occupied, the two swap. */
export function moveEntryToSlot(
  boxes: PlaygroundBox[],
  boxId: string,
  fromSlot: number,
  toSlot: number,
): PlaygroundBox[] {
  if (fromSlot === toSlot) return boxes
  return boxes.map(box => {
    if (box.id !== boxId) return box
    const entries = box.entries.map((e, i) => {
      const slot = getEntrySlot(e, i)
      if (slot === fromSlot) return { ...e, slot: toSlot }
      if (slot === toSlot) return { ...e, slot: fromSlot }
      return { ...e, slot }
    })
    return { ...box, entries }
  })
}

export function migratePlaygroundBox(raw: LegacyPlaygroundBox): PlaygroundBox | null {
  if (!raw || typeof raw !== 'object' || !raw.id || !raw.name) return null

  const rawEntries = Array.isArray(raw.entries)
    ? raw.entries
    : Array.isArray(raw.watchIds)
      ? raw.watchIds.map(watchId => createPlaygroundEntry(watchId))
      : []

  // Backfill `slot` from array position for legacy entries; trust explicit
  // values where present.
  const entries: PlaygroundBoxEntry[] = rawEntries
    .filter(entry => entry && typeof entry.watchId === 'string' && entry.watchId.length > 0)
    .map((entry, index) => ({
      id: typeof entry.id === 'string' && entry.id.length > 0 ? entry.id : `pge-${crypto.randomUUID()}`,
      watchId: entry.watchId,
      slot: typeof entry.slot === 'number' && Number.isFinite(entry.slot) ? entry.slot : index,
      ...(entry.overrides ? { overrides: entry.overrides } : {}),
    }))

  return {
    id: isUuid(raw.id) ? raw.id : crypto.randomUUID(),
    name: raw.name,
    tags: Array.isArray(raw.tags) ? raw.tags.filter(Boolean) : [],
    entries,
    frame: raw.frame ?? DEFAULT_FRAME,
    lining: raw.lining ?? DEFAULT_LINING,
    slotCount: SLOT_COUNTS.some(slot => slot.n === raw.slotCount)
      ? (raw.slotCount as number)
      : getDefaultSlotCount(entries.length),
    createdAt: raw.createdAt ?? new Date().toISOString(),
  }
}

export function normalizePlaygroundBoxes(raw: unknown, fallback: PlaygroundBox[]): PlaygroundBox[] {
  if (!Array.isArray(raw)) return fallback

  const migrated = raw
    .map(box => migratePlaygroundBox(box as LegacyPlaygroundBox))
    .filter((box): box is PlaygroundBox => box !== null)

  return migrated.length > 0 ? migrated : fallback
}

export function resolvePlaygroundWatch(
  entry: PlaygroundBoxEntry,
  catalog: CatalogWatch[],
  fallbackIndex: number,
): ResolvedPlaygroundWatch | null {
  const sourceWatch = catalog.find(watch => watch.id === entry.watchId)
  if (!sourceWatch) return null

  const displayWatch: ResolvedWatch = {
    ...sourceWatch,
    id: entry.id,
    watchId: sourceWatch.id,
    reference: entry.overrides?.reference ?? sourceWatch.reference,
    caseSizeMm: entry.overrides?.caseSizeMm ?? sourceWatch.caseSizeMm,
    caseMaterial: entry.overrides?.caseMaterial ?? sourceWatch.caseMaterial,
    dialColor: entry.overrides?.dialColor ?? sourceWatch.dialColor,
    movement: entry.overrides?.movement ?? sourceWatch.movement,
    complications: entry.overrides?.complications ?? sourceWatch.complications,
    estimatedValue: entry.overrides?.estimatedValue ?? sourceWatch.estimatedValue,
    watchType: entry.overrides?.watchType ?? sourceWatch.watchType,
    condition: entry.overrides?.condition ?? DEFAULT_RESOLVED_WATCH_CONDITION,
    notes: entry.overrides?.notes ?? '',
  }

  return {
    entry,
    sourceWatch,
    displayWatch,
    slot: getEntrySlot(entry, fallbackIndex),
  }
}

export function resolvePlaygroundWatches(entries: PlaygroundBoxEntry[], catalog: CatalogWatch[]): ResolvedPlaygroundWatch[] {
  return entries
    .map((entry, index) => resolvePlaygroundWatch(entry, catalog, index))
    .filter((watch): watch is ResolvedPlaygroundWatch => watch !== null)
    .sort((a, b) => a.slot - b.slot)
}

/** Build a slot → resolved watch lookup for WatchBox. */
export function buildSlotMap(resolved: ResolvedPlaygroundWatch[]): Map<number, ResolvedPlaygroundWatch> {
  const map = new Map<number, ResolvedPlaygroundWatch>()
  for (const r of resolved) map.set(r.slot, r)
  return map
}
