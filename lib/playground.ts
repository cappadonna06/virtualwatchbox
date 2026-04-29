import { SLOT_COUNTS } from '@/lib/frameConfig'
import type { PlaygroundBox, PlaygroundBoxEntry, PlaygroundWatchOverrides, Watch } from '@/types/watch'

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
  sourceWatch: Watch
  displayWatch: Watch
}

const DEFAULT_FRAME = 'light-oak'
const DEFAULT_LINING = 'cream'
const DEFAULT_SLOT_COUNT = 6

function getDefaultSlotCount(entryCount: number) {
  return SLOT_COUNTS.find(slot => slot.n >= Math.max(entryCount, DEFAULT_SLOT_COUNT))?.n
    ?? SLOT_COUNTS[SLOT_COUNTS.length - 1].n
}

export function createPlaygroundEntry(watchId: string, overrides?: PlaygroundWatchOverrides, id?: string): PlaygroundBoxEntry {
  return {
    id: id ?? `pge-${crypto.randomUUID()}`,
    watchId,
    ...(overrides ? { overrides } : {}),
  }
}

export function migratePlaygroundBox(raw: LegacyPlaygroundBox): PlaygroundBox | null {
  if (!raw || typeof raw !== 'object' || !raw.id || !raw.name) return null

  const rawEntries = Array.isArray(raw.entries)
    ? raw.entries
    : Array.isArray(raw.watchIds)
      ? raw.watchIds.map(watchId => createPlaygroundEntry(watchId))
      : []

  const entries = rawEntries
    .filter(entry => entry && typeof entry.watchId === 'string' && entry.watchId.length > 0)
    .map(entry => ({
      id: typeof entry.id === 'string' && entry.id.length > 0 ? entry.id : `pge-${crypto.randomUUID()}`,
      watchId: entry.watchId,
      ...(entry.overrides ? { overrides: entry.overrides } : {}),
    }))

  return {
    id: raw.id,
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

export function resolvePlaygroundWatch(entry: PlaygroundBoxEntry, catalog: Watch[]): ResolvedPlaygroundWatch | null {
  const sourceWatch = catalog.find(watch => watch.id === entry.watchId)
  if (!sourceWatch) return null

  const displayWatch: Watch = {
    ...sourceWatch,
    id: entry.id,
    ...entry.overrides,
  }

  return {
    entry,
    sourceWatch,
    displayWatch,
  }
}

export function resolvePlaygroundWatches(entries: PlaygroundBoxEntry[], catalog: Watch[]): ResolvedPlaygroundWatch[] {
  return entries
    .map(entry => resolvePlaygroundWatch(entry, catalog))
    .filter((watch): watch is ResolvedPlaygroundWatch => watch !== null)
}
