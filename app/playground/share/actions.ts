'use server'

import { decodePlaygroundShare } from '@/lib/playgroundShare'
import { loadPlaygroundShareCatalog } from '@/lib/playgroundShareCatalog'

export async function preparePlaygroundShare(token: string) {
  const share = decodePlaygroundShare(token)
  if (!share) return { status: 'invalid' } as const

  try {
    const { watches, estimates } = await loadPlaygroundShareCatalog(share, true)
    if (share.entries.some(entry => !watches.has(entry.watchId))) {
      return { status: 'unavailable' } as const
    }

    const values = share.entries.map(entry => estimates.get(entry.watchId))
    const total = values.every(value => value !== undefined)
      ? Math.round(values.reduce((sum, value) => sum + value, 0))
      : undefined
    return {
      status: 'ready',
      watches: share.entries.map(({ watchId, slot }) => {
        const { brand, model, reference } = watches.get(watchId)!
        return { slot, brand, model, reference }
      }),
      total: Number.isSafeInteger(total) ? total : undefined,
    } as const
  } catch {
    return { status: 'retry' } as const
  }
}
