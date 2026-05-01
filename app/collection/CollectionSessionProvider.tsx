'use client'

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { FRAMES, LININGS, SLOT_COUNTS } from '@/lib/frameConfig'
import { syncPublicProfileSnapshot } from '@/lib/profileDemo'
import {
  COLLECTION_SESSION_STORAGE_KEY,
  LEGACY_COLLECTION_SESSION_STORAGE_KEY,
  WATCHBOX_CONFIG_STORAGE_KEY,
} from '@/lib/storageKeys'
import { watches as catalogWatches } from '@/lib/watches'
import { SEEDED_OWNED_WATCHES } from '@/lib/collectionData'
import { createCatalogWatchMap, resolveCatalogWatchId, resolveOwnedWatches } from '@/lib/watchData'
import { getEffectiveSlotCount } from '@/lib/watchboxOverflow'
import type {
  CatalogWatch,
  OwnedWatch,
  OwnershipStatus,
  ResolvedOwnedWatch,
  WatchCondition,
  WatchSavedState,
  WatchStateSource,
  WatchTarget,
} from '@/types/watch'
import { brand } from '@/lib/brand'

const WATCH_CONDITIONS: WatchCondition[] = ['Unworn', 'Like New', 'Excellent', 'Good', 'Fair']
const OWNERSHIP_STATUSES: OwnershipStatus[] = ['Owned', 'For Sale', 'Recently Added', 'Needs Service']

export type WatchboxConfig = {
  frame: string
  lining: string
  slotCount: number
}

const DEFAULT_WATCHBOX_CONFIG: WatchboxConfig = {
  frame: 'light-oak',
  lining: 'cream',
  slotCount: 6,
}

type PurchaseDetails = {
  price?: number
  date?: string
  notes?: string
}

type SessionSnapshot = {
  collectionWatches: OwnedWatch[]
  followedWatchIds: string[]
  nextTargets: WatchTarget[]
  grailWatchId: string | null
  watchboxConfig: WatchboxConfig
}

type LegacyWatchSnapshot = {
  id?: unknown
  watchId?: unknown
  condition?: unknown
  purchaseDate?: unknown
  purchasePrice?: unknown
  notes?: unknown
  ownershipStatus?: unknown
}

type LegacySessionSnapshot = {
  collectionWatches?: unknown
  followedWatchIds?: unknown
  nextTargets?: unknown
  grailWatchId?: unknown
  watchboxConfig?: unknown
}

interface CollectionSessionContextValue {
  collectionWatches: ResolvedOwnedWatch[]
  followedWatchIds: string[]
  followedWatches: CatalogWatch[]
  nextTargets: WatchTarget[]
  nextTargetWatches: { target: WatchTarget; watch: CatalogWatch }[]
  grailWatchId: string | null
  grailWatch: CatalogWatch | null
  selectedWatchId: string | null
  watchboxConfig: WatchboxConfig
  setSelectedWatchId: (watchId: string | null) => void
  addToCollection: (watch: CatalogWatch, condition: WatchCondition, purchaseDetails?: PurchaseDetails) => void
  followWatch: (watchId: string) => void
  unfollowWatch: (watchId: string) => void
  toggleFollowedWatch: (watchId: string) => void
  promoteToNextTarget: (watchId: string) => void
  removeFromNextTargets: (watchId: string) => void
  setGrailWatch: (watchId: string) => void
  clearGrailWatch: () => void
  setWatchSavedState: (
    watchId: string,
    state: WatchSavedState,
    options?: { source?: WatchStateSource },
  ) => { ok: boolean; reason?: 'target_limit' | 'invalid_watch' }
  removeSavedWatchState: (watchId: string, options?: { source?: WatchStateSource }) => void
  removeFromCollection: (watchId: string) => void
  reorderCollectionWatches: (newWatches: ResolvedOwnedWatch[]) => void
  setWatchboxFrame: (frameId: string) => void
  setWatchboxLining: (liningId: string) => void
  setWatchboxSlotCount: (slotCount: number) => void
  isInCollection: (watchId: string) => boolean
  isWatchFollowed: (watchId: string) => boolean
  isWatchTarget: (watchId: string) => boolean
  isWatchGrail: (watchId: string) => boolean
  canSetWatchAsTarget: (watchId: string) => boolean
  getWatchSavedState: (watchId: string) => WatchSavedState | null
  getCatalogWatch: (watchId: string) => CatalogWatch | undefined
  toastMessage: string | null
  toastVisible: boolean
  showToast: (message: string) => void
}

const CollectionSessionContext = createContext<CollectionSessionContextValue | null>(null)

function isValidWatchboxConfig(value: unknown): value is WatchboxConfig {
  if (!value || typeof value !== 'object') return false

  const config = value as Partial<WatchboxConfig>
  return (
    typeof config.frame === 'string'
    && FRAMES.some(frame => frame.id === config.frame)
    && typeof config.lining === 'string'
    && LININGS.some(lining => lining.id === config.lining)
    && typeof config.slotCount === 'number'
    && SLOT_COUNTS.some(slot => slot.n === config.slotCount)
  )
}

function isWatchCondition(value: unknown): value is WatchCondition {
  return typeof value === 'string' && WATCH_CONDITIONS.includes(value as WatchCondition)
}

function isOwnershipStatus(value: unknown): value is OwnershipStatus {
  return typeof value === 'string' && OWNERSHIP_STATUSES.includes(value as OwnershipStatus)
}

function isWatchTarget(value: unknown): value is WatchTarget {
  if (!value || typeof value !== 'object') return false

  const target = value as Partial<WatchTarget>
  return (
    typeof target.watchId === 'string'
    && isWatchCondition(target.desiredCondition)
    && (target.intent === 'Addition' || target.intent === 'Replacement')
  )
}

function normalizeOwnedWatch(
  rawWatch: LegacyWatchSnapshot,
  catalogIds: string[],
  fallbackDate: string,
): OwnedWatch | null {
  const rawId = typeof rawWatch.id === 'string' ? rawWatch.id : null
  const catalogWatchId = typeof rawWatch.watchId === 'string'
    ? rawWatch.watchId
    : rawId
      ? resolveCatalogWatchId(rawId, catalogIds)
      : null

  if (!rawId || !catalogWatchId || !catalogIds.includes(catalogWatchId)) return null

  return {
    id: rawId,
    watchId: catalogWatchId,
    condition: isWatchCondition(rawWatch.condition) ? rawWatch.condition : 'Excellent',
    purchaseDate: typeof rawWatch.purchaseDate === 'string' ? rawWatch.purchaseDate : fallbackDate,
    purchasePrice: typeof rawWatch.purchasePrice === 'number' ? rawWatch.purchasePrice : 0,
    notes: typeof rawWatch.notes === 'string' ? rawWatch.notes : '',
    ownershipStatus: isOwnershipStatus(rawWatch.ownershipStatus) ? rawWatch.ownershipStatus : 'Owned',
  }
}

function normalizeCollectionWatches(rawValue: unknown, catalogIds: string[]) {
  if (!Array.isArray(rawValue)) return SEEDED_OWNED_WATCHES

  const fallbackDate = new Date().toISOString().split('T')[0]
  return rawValue
    .map(entry => normalizeOwnedWatch(entry as LegacyWatchSnapshot, catalogIds, fallbackDate))
    .filter((watch): watch is OwnedWatch => watch !== null)
}

function normalizeFollowedWatchIds(rawValue: unknown, catalogIds: Set<string>) {
  if (!Array.isArray(rawValue)) return []

  return [...new Set(
    rawValue.filter((watchId): watchId is string => typeof watchId === 'string' && catalogIds.has(watchId)),
  )]
}

function normalizeNextTargets(rawValue: unknown) {
  if (!Array.isArray(rawValue)) return []

  return rawValue
    .filter(isWatchTarget)
    .slice(0, 3)
}

function normalizeSessionSnapshot(rawValue: unknown, catalogIds: string[], catalogIdSet: Set<string>): SessionSnapshot | null {
  if (!rawValue || typeof rawValue !== 'object') return null

  const snapshot = rawValue as LegacySessionSnapshot
  const collectionWatches = normalizeCollectionWatches(snapshot.collectionWatches, catalogIds)
  const nextTargets = normalizeNextTargets(snapshot.nextTargets)
  const grailWatchId = typeof snapshot.grailWatchId === 'string' ? snapshot.grailWatchId : null

  const followedFromSnapshot = normalizeFollowedWatchIds(snapshot.followedWatchIds, catalogIdSet)
  const followedWatchIds = [...new Set([
    ...followedFromSnapshot,
    ...nextTargets.map(target => target.watchId).filter(watchId => catalogIdSet.has(watchId)),
    ...(grailWatchId && catalogIdSet.has(grailWatchId) ? [grailWatchId] : []),
  ])]

  const followedSet = new Set(followedWatchIds)
  const normalizedTargets = nextTargets.filter(target => followedSet.has(target.watchId)).slice(0, 3)
  const normalizedGrailWatchId = grailWatchId && followedSet.has(grailWatchId) ? grailWatchId : null

  return {
    collectionWatches,
    followedWatchIds,
    nextTargets: normalizedTargets,
    grailWatchId: normalizedGrailWatchId,
    watchboxConfig: isValidWatchboxConfig(snapshot.watchboxConfig) ? snapshot.watchboxConfig : DEFAULT_WATCHBOX_CONFIG,
  }
}

export function CollectionSessionProvider({ children }: { children: React.ReactNode }) {
  const catalogWatchMap = useMemo(() => createCatalogWatchMap(catalogWatches), [])
  const catalogIds = useMemo(() => catalogWatches.map(watch => watch.id), [])
  const catalogIdSet = useMemo(() => new Set(catalogIds), [catalogIds])

  const [collectionEntries, setCollectionEntries] = useState<OwnedWatch[]>(SEEDED_OWNED_WATCHES)
  const [followedWatchIds, setFollowedWatchIds] = useState<string[]>([])
  const [nextTargets, setNextTargets] = useState<WatchTarget[]>([])
  const [grailWatchId, setGrailWatchId] = useState<string | null>(null)
  const [selectedWatchId, setSelectedWatchId] = useState<string | null>(null)
  const [watchboxConfig, setWatchboxConfig] = useState<WatchboxConfig>(DEFAULT_WATCHBOX_CONFIG)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [toastVisible, setToastVisible] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const collectionWatches = useMemo(
    () => resolveOwnedWatches(collectionEntries, catalogWatchMap),
    [collectionEntries, catalogWatchMap],
  )
  const followedWatches = useMemo(
    () => followedWatchIds
      .map(watchId => catalogWatchMap.get(watchId))
      .filter((watch): watch is CatalogWatch => watch !== undefined),
    [catalogWatchMap, followedWatchIds],
  )
  const nextTargetWatches = useMemo(
    () => nextTargets
      .map(target => {
        const watch = catalogWatchMap.get(target.watchId)
        return watch ? { target, watch } : null
      })
      .filter((item): item is { target: WatchTarget; watch: CatalogWatch } => item !== null),
    [catalogWatchMap, nextTargets],
  )
  const grailWatch = useMemo(
    () => (grailWatchId ? catalogWatchMap.get(grailWatchId) ?? null : null),
    [catalogWatchMap, grailWatchId],
  )

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(COLLECTION_SESSION_STORAGE_KEY)
      const legacyRaw = sessionStorage.getItem(LEGACY_COLLECTION_SESSION_STORAGE_KEY)
      const normalized = normalizeSessionSnapshot(
        raw ? JSON.parse(raw) : legacyRaw ? JSON.parse(legacyRaw) : null,
        catalogIds,
        catalogIdSet,
      )

      if (normalized) {
        setCollectionEntries(normalized.collectionWatches)
        setFollowedWatchIds(normalized.followedWatchIds)
        setNextTargets(normalized.nextTargets)
        setGrailWatchId(normalized.grailWatchId)
        setWatchboxConfig(normalized.watchboxConfig)
      }
    } catch {
      // Ignore malformed session data.
    }

    try {
      const rawConfig = localStorage.getItem(WATCHBOX_CONFIG_STORAGE_KEY)
      if (!rawConfig) return

      const parsedConfig = JSON.parse(rawConfig)
      if (isValidWatchboxConfig(parsedConfig)) {
        setWatchboxConfig(parsedConfig)
      }
    } finally {
      setHydrated(true)
    }
  }, [catalogIdSet, catalogIds])

  useEffect(() => {
    if (!hydrated) return

    const snapshot: SessionSnapshot = {
      collectionWatches: collectionEntries,
      followedWatchIds,
      nextTargets,
      grailWatchId,
      watchboxConfig,
    }

    sessionStorage.setItem(COLLECTION_SESSION_STORAGE_KEY, JSON.stringify(snapshot))
  }, [hydrated, collectionEntries, followedWatchIds, nextTargets, grailWatchId, watchboxConfig])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(WATCHBOX_CONFIG_STORAGE_KEY, JSON.stringify(watchboxConfig))
  }, [hydrated, watchboxConfig])

  useEffect(() => {
    if (!hydrated) return

    syncPublicProfileSnapshot({
      collectionWatches,
      followedWatches,
      nextTargets,
      grailWatch,
      watchboxConfig,
    })
  }, [hydrated, collectionWatches, followedWatches, nextTargets, grailWatch, watchboxConfig])

  useEffect(() => {
    setWatchboxConfig(prev => {
      const effectiveSlotCount = getEffectiveSlotCount(prev.slotCount, collectionWatches.length)
      return effectiveSlotCount === prev.slotCount
        ? prev
        : { ...prev, slotCount: effectiveSlotCount }
    })
  }, [collectionWatches.length])

  useEffect(() => {
    return () => {
      if (showTimer.current) clearTimeout(showTimer.current)
      if (hideTimer.current) clearTimeout(hideTimer.current)
    }
  }, [])

  function showToast(message: string) {
    if (showTimer.current) clearTimeout(showTimer.current)
    if (hideTimer.current) clearTimeout(hideTimer.current)

    setToastMessage(message)
    setToastVisible(true)

    showTimer.current = setTimeout(() => {
      setToastVisible(false)
      hideTimer.current = setTimeout(() => setToastMessage(null), 300)
    }, 2500)
  }

  function silentlyRemoveSavedState(watchId: string) {
    setFollowedWatchIds(prev => prev.filter(id => id !== watchId))
    setNextTargets(prev => prev.filter(target => target.watchId !== watchId))
    setGrailWatchId(prev => (prev === watchId ? null : prev))
  }

  function getSavedState(watchId: string): WatchSavedState | null {
    if (grailWatchId === watchId) return 'grail'
    if (nextTargets.some(target => target.watchId === watchId)) return 'target'
    if (followedWatchIds.includes(watchId)) return 'followed'
    return null
  }

  function canTargetWatch(watchId: string) {
    return nextTargets.some(target => target.watchId === watchId) || nextTargets.length < 3
  }

  function addToCollection(watch: CatalogWatch, condition: WatchCondition, purchaseDetails?: PurchaseDetails) {
    const wasTarget = nextTargets.some(target => target.watchId === watch.id)
    const newWatch: OwnedWatch = {
      id: `owned-${crypto.randomUUID()}`,
      watchId: watch.id,
      condition,
      ownershipStatus: 'Owned',
      purchasePrice: purchaseDetails?.price ?? 0,
      purchaseDate: purchaseDetails?.date ?? new Date().toISOString().split('T')[0],
      notes: purchaseDetails?.notes ?? '',
    }

    setCollectionEntries(prev => [...prev, newWatch])
    if (wasTarget) {
      setNextTargets(prev => prev.filter(target => target.watchId !== watch.id))
    }
    setSelectedWatchId(newWatch.id)
    showToast(wasTarget ? 'Target acquired — welcome to the box.' : `${watch.brand} ${watch.model} added to your collection`)
  }

  function followWatch(watchId: string) {
    if (!catalogIdSet.has(watchId) || followedWatchIds.includes(watchId)) return
    setFollowedWatchIds(prev => [...prev, watchId])
    showToast('Saved to your followed watches.')
  }

  function unfollowWatch(watchId: string) {
    if (!followedWatchIds.includes(watchId)) return

    silentlyRemoveSavedState(watchId)
  }

  function toggleFollowedWatch(watchId: string) {
    if (followedWatchIds.includes(watchId)) {
      unfollowWatch(watchId)
      return
    }

    followWatch(watchId)
  }

  function promoteToNextTarget(watchId: string) {
    if (!catalogIdSet.has(watchId)) return
    if (nextTargets.some(target => target.watchId === watchId)) return

    if (nextTargets.length >= 3) {
      return
    }

    setFollowedWatchIds(prev => (prev.includes(watchId) ? prev : [...prev, watchId]))
    setGrailWatchId(prev => (prev === watchId ? null : prev))
    setNextTargets(prev => [
      ...prev,
      {
        watchId,
        desiredCondition: 'Excellent',
        intent: 'Addition',
      },
    ])
    showToast('Added to your next targets.')
  }

  function removeFromNextTargets(watchId: string) {
    if (!nextTargets.some(target => target.watchId === watchId)) return
    setNextTargets(prev => prev.filter(target => target.watchId !== watchId))
  }

  function setGrailWatch(watchId: string) {
    if (!catalogIdSet.has(watchId)) return
    if (grailWatchId === watchId) return

    setFollowedWatchIds(prev => (prev.includes(watchId) ? prev : [...prev, watchId]))
    setNextTargets(prev => prev.filter(target => target.watchId !== watchId))
    setGrailWatchId(watchId)
  }

  function clearGrailWatch() {
    if (!grailWatchId) return
    setGrailWatchId(null)
  }

  function setWatchSavedState(
    watchId: string,
    state: WatchSavedState,
    _options?: { source?: WatchStateSource },
  ) {
    if (!catalogIdSet.has(watchId)) {
      return { ok: false as const, reason: 'invalid_watch' as const }
    }

    if (state === 'followed') {
      setFollowedWatchIds(prev => (prev.includes(watchId) ? prev : [...prev, watchId]))
      setNextTargets(prev => prev.filter(target => target.watchId !== watchId))
      setGrailWatchId(prev => (prev === watchId ? null : prev))
      showToast('Saved to your followed watches.')
      return { ok: true as const }
    }

    if (state === 'target') {
      if (!canTargetWatch(watchId)) {
        return { ok: false as const, reason: 'target_limit' as const }
      }

      setFollowedWatchIds(prev => (prev.includes(watchId) ? prev : [...prev, watchId]))
      setGrailWatchId(prev => (prev === watchId ? null : prev))
      setNextTargets(prev => (
        prev.some(target => target.watchId === watchId)
          ? prev
          : [
              ...prev,
              {
                watchId,
                desiredCondition: 'Excellent',
                intent: 'Addition',
              },
            ]
      ))
      showToast('Added to your next targets.')
      return { ok: true as const }
    }

    setFollowedWatchIds(prev => (prev.includes(watchId) ? prev : [...prev, watchId]))
    setNextTargets(prev => prev.filter(target => target.watchId !== watchId))
    setGrailWatchId(watchId)
    return { ok: true as const }
  }

  function removeSavedWatchState(
    watchId: string,
    _options?: { source?: WatchStateSource },
  ) {
    silentlyRemoveSavedState(watchId)
  }

  function removeFromCollection(watchId: string) {
    setCollectionEntries(prev => prev.filter(watch => watch.id !== watchId))
    setSelectedWatchId(prev => (prev === watchId ? null : prev))
  }

  function reorderCollectionWatches(newWatches: ResolvedOwnedWatch[]) {
    setCollectionEntries(prev => {
      const byId = new Map(prev.map(watch => [watch.id, watch]))
      const next = newWatches
        .map(watch => byId.get(watch.id))
        .filter((watch): watch is OwnedWatch => watch !== undefined)

      return next.length === prev.length ? next : prev
    })
  }

  function setWatchboxFrame(frameId: string) {
    if (!FRAMES.some(frame => frame.id === frameId)) return
    setWatchboxConfig(prev => ({ ...prev, frame: frameId }))
  }

  function setWatchboxLining(liningId: string) {
    if (!LININGS.some(lining => lining.id === liningId)) return
    setWatchboxConfig(prev => ({ ...prev, lining: liningId }))
  }

  function setWatchboxSlotCount(slotCount: number) {
    if (!SLOT_COUNTS.some(slot => slot.n === slotCount)) return
    setWatchboxConfig(prev => ({ ...prev, slotCount }))
  }

  const value: CollectionSessionContextValue = {
    collectionWatches,
    followedWatchIds,
    followedWatches,
    nextTargets,
    nextTargetWatches,
    grailWatchId,
    grailWatch,
    selectedWatchId,
    watchboxConfig,
    setSelectedWatchId,
    addToCollection,
    followWatch,
    unfollowWatch,
    toggleFollowedWatch,
    promoteToNextTarget,
    removeFromNextTargets,
    setGrailWatch,
    clearGrailWatch,
    setWatchSavedState,
    removeSavedWatchState,
    removeFromCollection,
    reorderCollectionWatches,
    setWatchboxFrame,
    setWatchboxLining,
    setWatchboxSlotCount,
    isInCollection: (watchId: string) => collectionEntries.some(watch => watch.watchId === watchId),
    isWatchFollowed: (watchId: string) => followedWatchIds.includes(watchId),
    isWatchTarget: (watchId: string) => nextTargets.some(target => target.watchId === watchId),
    isWatchGrail: (watchId: string) => grailWatchId === watchId,
    canSetWatchAsTarget: (watchId: string) => canTargetWatch(watchId),
    getWatchSavedState: (watchId: string) => getSavedState(watchId),
    getCatalogWatch: (watchId: string) => catalogWatchMap.get(watchId),
    toastMessage,
    toastVisible,
    showToast,
  }

  return (
    <CollectionSessionContext.Provider value={value}>
      {children}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: 28,
            left: '50%',
            transform: `translateX(-50%) translateY(${toastVisible ? '0' : '12px'})`,
            padding: '11px 16px',
            borderRadius: brand.radius.md,
            background: brand.colors.ink,
            color: brand.colors.bg,
            fontFamily: brand.font.sans,
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.04em',
            boxShadow: brand.shadow.xl,
            opacity: toastVisible ? 1 : 0,
            transition: `opacity ${brand.transition.base}, transform ${brand.transition.base}`,
            zIndex: 320,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
          aria-live="polite"
        >
          {toastMessage}
        </div>
      )}
    </CollectionSessionContext.Provider>
  )
}

export function useCollectionSession() {
  const ctx = useContext(CollectionSessionContext)
  if (!ctx) {
    throw new Error('useCollectionSession must be used within CollectionSessionProvider')
  }
  return ctx
}
