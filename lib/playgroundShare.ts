import { isValidCatalogId } from '@/lib/catalogId'
import { FRAMES, LININGS, SLOT_COUNTS } from '@/lib/frameConfig'
import { getEntrySlot } from '@/lib/playground'
import type { CatalogWatch, PlaygroundBox } from '@/types/watch'

export const PLAYGROUND_SHARE_PATH = '/playground/share'

const MAX_TOKEN_LENGTH = 6000
const MAX_CATALOG_ID_LENGTH = 128
const TOKEN_PATTERN = /^[A-Za-z0-9_-]+$/
const currency = new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', maximumFractionDigits: 0,
})

export type SharedCatalogWatch = Pick<CatalogWatch, 'brand' | 'model' | 'reference' | 'dialConfig' | 'imageUrl'>

export type PlaygroundShare = {
  frame: string
  lining: string
  slotCount: number
  entries: Array<{ slot: number; watchId: string }>
  total?: number
}

export function formatPlaygroundShareTotal(total: number) {
  return currency.format(total)
}

export function createPlaygroundShare(box: PlaygroundBox): PlaygroundShare {
  return {
    frame: (FRAMES.find(frame => frame.id === box.frame) ?? FRAMES[0]).id,
    lining: (LININGS.find(lining => lining.id === box.lining) ?? LININGS[0]).id,
    slotCount: (SLOT_COUNTS.find(layout => layout.n === box.slotCount) ?? SLOT_COUNTS[1]).n,
    entries: box.entries.map((entry, index) => ({
      slot: getEntrySlot(entry, index),
      watchId: entry.watchId,
    })).sort((a, b) => a.slot - b.slot),
  }
}

export function encodePlaygroundShare(share: PlaygroundShare): string | null {
  const payload = [
    1, share.frame, share.lining, share.slotCount,
    share.entries.map(({ slot, watchId }) => [slot, watchId]),
  ]
  if (share.total !== undefined) payload.push(share.total)
  try {
    const token = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    return decodePlaygroundShare(token) ? token : null
  } catch {
    return null
  }
}

export function decodePlaygroundShare(token: string | string[] | undefined | null): PlaygroundShare | null {
  if (typeof token !== 'string' || token.length > MAX_TOKEN_LENGTH || !TOKEN_PATTERN.test(token)) return null

  try {
    const payload: unknown = JSON.parse(atob(token.replace(/-/g, '+').replace(/_/g, '/')))
    if (!Array.isArray(payload) || (payload.length !== 5 && payload.length !== 6)) return null
    const [version, frame, lining, slotCount, entries, total] = payload
    if (version !== 1 || !FRAMES.some(option => option.id === frame) ||
        !LININGS.some(option => option.id === lining) || !SLOT_COUNTS.some(option => option.n === slotCount) ||
        !Array.isArray(entries) || entries.length === 0 ||
        (payload.length === 6 && (!Number.isSafeInteger(total) || total < 0))) return null

    const slots = new Set<number>()
    const watches: PlaygroundShare['entries'] = []
    for (const entry of entries) {
      if (!Array.isArray(entry) || entry.length !== 2) return null
      const [slot, watchId] = entry
      if (!Number.isSafeInteger(slot) || slot < 0 || slots.has(slot) ||
          typeof watchId !== 'string' || watchId.length > MAX_CATALOG_ID_LENGTH || !isValidCatalogId(watchId)) return null
      slots.add(slot)
      watches.push({ slot, watchId })
    }

    return {
      frame, lining, slotCount,
      entries: watches.sort((a, b) => a.slot - b.slot),
      ...(payload.length === 6 ? { total } : {}),
    }
  } catch {
    return null
  }
}

export function playgroundSharePath(token: string) {
  return `${PLAYGROUND_SHARE_PATH}?box=${token}`
}

export function playgroundShareCardPath(token: string) {
  return `${PLAYGROUND_SHARE_PATH}/card?box=${token}`
}
