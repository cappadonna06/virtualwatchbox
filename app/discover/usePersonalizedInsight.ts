'use client'

import { useEffect, useState } from 'react'
import type { CatalogWatch } from '@/types/watch'
import { personalizeHash } from '@/lib/discover'

export type UpgradePairForCopy = {
  fromWatchId: string
  fromBrand: string
  fromModel: string
  fromType: string
  toWatchId: string
  toBrand: string
  toModel: string
  toType: string
  upgradeDeltaUsd: number
}

type Payload = {
  read: string
  leadInsight: string
  upgradeRationales: Record<string, string>
}

type Args = {
  collection: CatalogWatch[]
  slotCount: number
  grailWatchId: string | null
  gapType: string | null
  gapLabel: string | null
  leadPick: { brand: string; model: string; reference: string; type: string; value?: number } | null
  heroLead: { toWatchId: string; brand: string; model: string; type: string } | null
  upgradePairs: UpgradePairForCopy[]
  fallbackRead: string
  brandReadHint: string
  priceTarget: number | null
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
    if (!parsed.hash) return null
    // Backfill missing fields from older cache entries.
    if (!parsed.payload) return null
    if (typeof parsed.payload.read !== 'string') return null
    if (typeof parsed.payload.leadInsight !== 'string') return null
    if (!parsed.payload.upgradeRationales || typeof parsed.payload.upgradeRationales !== 'object') {
      parsed.payload.upgradeRationales = {}
    }
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

// Stable, order-independent fingerprint of the visible pair set. Without
// this, every refresh would re-fetch even if the previous response already
// covered the new pair.
function pairsFingerprint(pairs: UpgradePairForCopy[]): string {
  return [...pairs.map(p => `${p.fromWatchId}|${p.toWatchId}`)].sort().join(',')
}

export function usePersonalizedInsight(args: Args) {
  const {
    collection,
    slotCount,
    grailWatchId,
    gapType,
    gapLabel,
    leadPick,
    heroLead,
    upgradePairs,
    fallbackRead,
    brandReadHint,
    priceTarget,
    enabled,
  } = args

  const baseHash = personalizeHash({
    watchIds: collection.map(w => w.id),
    slotCount,
    grailWatchId,
    gapType,
  })
  // Extend hash with the visible pair set so refresh advances re-fetch only
  // when the pair set actually changes.
  const hash = `${baseHash}::pairs=${pairsFingerprint(upgradePairs)}::hero=${heroLead?.toWatchId ?? ''}`

  const [state, setState] = useState<Payload>(() => {
    const cached = typeof window !== 'undefined' ? readCache() : null
    if (cached && cached.hash === hash) return cached.payload
    return { read: fallbackRead, leadInsight: '', upgradeRationales: {} }
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
        priceTarget,
        upgradePairs,
        heroLead,
      }),
    })
      .then(r => r.ok ? r.json() : null)
      .then((data: { ok: boolean; read?: string; leadInsight?: string; upgradeRationales?: Record<string, string> } | null) => {
        if (!alive || !data) return
        const payload: Payload = {
          read: typeof data.read === 'string' && data.read ? data.read : fallbackRead,
          leadInsight: typeof data.leadInsight === 'string' ? data.leadInsight : '',
          upgradeRationales: data.upgradeRationales && typeof data.upgradeRationales === 'object' ? data.upgradeRationales : {},
        }
        // Don't overwrite local state with empty hero copy if cache had real
        // copy and the route fell back (e.g. no API key while building pair
        // batches). Merge instead.
        setState(prev => ({
          read: payload.read || prev.read,
          leadInsight: payload.leadInsight || prev.leadInsight,
          upgradeRationales: { ...prev.upgradeRationales, ...payload.upgradeRationales },
        }))
        if (payload.read && payload.leadInsight) {
          writeCache({ hash, generatedAt: Date.now(), payload })
        }
      })
      .catch(() => { /* silent fallback */ })

    return () => { alive = false; controller.abort() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash, enabled])

  function rationaleFor(fromId: string, toId: string): string | null {
    return state.upgradeRationales[`${fromId}|${toId}`] ?? null
  }

  return {
    read: state.read,
    leadInsight: state.leadInsight,
    upgradeRationales: state.upgradeRationales,
    rationaleFor,
  }
}
