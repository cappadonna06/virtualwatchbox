'use client'

import { useEffect, useState } from 'react'
import type { CatalogWatch } from '@/types/watch'
import { personalizeHash } from '@/lib/discover'

type Payload = { read: string; leadInsight: string }

type Args = {
  collection: CatalogWatch[]
  slotCount: number
  grailWatchId: string | null
  gapType: string | null
  gapLabel: string | null
  leadPick: { brand: string; model: string; reference: string; type: string } | null
  fallbackRead: string
  brandReadHint: string
  enabled: boolean
}

const CACHE_KEY = 'vwb-discover-personalize'

type CacheEntry = { hash: string; generatedAt: number; payload: Payload }

function readCache(): CacheEntry | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CacheEntry
    if (!parsed.hash || !parsed.payload?.read || !parsed.payload?.leadInsight) return null
    return parsed
  } catch {
    return null
  }
}

function writeCache(entry: CacheEntry) {
  if (typeof window === 'undefined') return
  try { window.localStorage.setItem(CACHE_KEY, JSON.stringify(entry)) }
  catch { /* quota or private-mode — drop silently */ }
}

export function usePersonalizedInsight(args: Args): Payload {
  const { collection, slotCount, grailWatchId, gapType, gapLabel, leadPick, fallbackRead, brandReadHint, enabled } = args

  const hash = personalizeHash({
    watchIds: collection.map(w => w.id),
    slotCount,
    grailWatchId,
    gapType,
  })

  const [state, setState] = useState<Payload>(() => {
    const cached = typeof window !== 'undefined' ? readCache() : null
    if (cached && cached.hash === hash) return cached.payload
    return { read: fallbackRead, leadInsight: '' }
  })

  useEffect(() => {
    if (!enabled) return
    if (collection.length === 0) return

    const cached = readCache()
    if (cached && cached.hash === hash) {
      setState(cached.payload)
      return
    }

    const controller = new AbortController()
    let alive = true

    fetch('/api/discover/personalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        collection: collection.slice(0, 20).map(w => ({
          brand: w.brand,
          model: w.model,
          type: w.watchType ?? null,
          dialColor: w.dialColor ?? null,
          value: w.estimatedValue ?? null,
        })),
        gap: gapType && gapLabel ? { type: gapType, gapLabel } : null,
        leadPick,
        brandRead: brandReadHint,
      }),
    })
      .then(r => r.ok ? r.json() : null)
      .then((data: { ok: boolean; read?: string; leadInsight?: string } | null) => {
        if (!alive || !data || !data.ok || !data.read || !data.leadInsight) return
        const payload: Payload = { read: data.read, leadInsight: data.leadInsight }
        setState(payload)
        writeCache({ hash, generatedAt: Date.now(), payload })
      })
      .catch(() => { /* silent fallback */ })

    return () => { alive = false; controller.abort() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash, enabled])

  return state
}
