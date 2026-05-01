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

type WatchIntentAvailability = {
  isOwned: boolean
  isFollowed: boolean
  canFollow: boolean
  canSetTarget: boolean
  canSetGrail: boolean
  canSetJewel: boolean
}

type SessionSnapshot = {
  collectionWatches: OwnedWatch[]
  followedWatchIds: string[]
  nextTargets: WatchTarget[]
  grailWatchId: string | null
  collectionJewelWatchId: string | null
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
  collectionJewelWatchId?: unknown
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
  collectionJewelWatchId: string | null
  collectionJewelWatch: CatalogWatch | null
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
  setCollectionJewelWatch: (watchId: string) => void
  clearCollectionJewelWatch: () => void
  setWatchSavedState: (
    watchId: string,
    state: WatchSavedState,
    options?: { source?: WatchStateSource },
  ) => { ok: boolean; reason?: 'target_limit' | 'invalid_watch' | 'owned_watch' | 'not_in_collection' }
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
  isWatchJewel: (watchId: string) => boolean
  canSetWatchAsTarget: (watchId: string) => boolean
  canSetWatchAsGrail: (watchId: string) => boolean
  canSetWatchAsJewel: (watchId: string) => boolean
  getWatchIntentAvailability: (watchId: string) => WatchIntentAvailability | null
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
  const collectionJewelWatchId = typeof snapshot.collectionJewelWatchId === 'string' ? snapshot.collectionJewelWatchId : null
  const collectionWatchIds = new Set(collectionWatches.map(watch => watch.watchId))

  const followedFromSnapshot = normalizeFollowedWatchIds(snapshot.followedWatchIds, catalogIdSet)
  const followedWatchIds = [...new Set([
    ...followedFromSnapshot,
    ...nextTargets.map(target => target.watchId).filter(watchId => catalogIdSet.has(watchId)),
    ...(grailWatchId && catalogIdSet.has(grailWatchId) ? [grailWatchId] : []),
  ])]

  const followedSet = new Set(followedWatchIds)
  const normalizedTargets = nextTargets
    .filter(target => followedSet.has(target.watchId) && !collectionWatchIds.has(target.watchId))
    .slice(0, 3)
  const normalizedGrailWatchId = grailWatchId && followedSet.has(grailWatchId) && !collectionWatchIds.has(grailWatchId)
    ? grailWatchId
    : null
  const normalizedCollectionJewelWatchId = collectionJewelWatchId && collectionWatchIds.has(collectionJewelWatchId)
    ? collectionJewelWatchId
    : null

  return {
    collectionWatches,
    followedWatchIds,
    nextTargets: normalizedTargets,
    grailWatchId: normalizedGrailWatchId,
    collectionJewelWatchId: normalizedCollectionJewelWatchId,
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
  const [collectionJewelWatchId, setCollectionJewelWatchId] = useState<string | null>(null)
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
  const collectionJewelWatch = useMemo(
    () => (collectionJewelWatchId ? catalogWatchMap.get(collectionJewelWatchId) ?? null : null),
    [catalogWatchMap, collectionJewelWatchId],
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
        setCollectionJewelWatchId(normalized.collectionJewelWatchId)
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
      collectionJewelWatchId,
      watchboxConfig,
    }

    sessionStorage.setItem(COLLECTION_SESSION_STORAGE_KEY, JSON.stringify(snapshot))
  }, [hydrated, collectionEntries, followedWatchIds, nextTargets, grailWatchId, collectionJewelWatchId, watchboxConfig])

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
      collectionJewelWatch,
      watchboxConfig,
    })
  }, [hydrated, collectionWatches, followedWatches, nextTargets, grailWatch, collectionJewelWatch, watchboxConfig])

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

  function isOwnedWatch(watchId: string) {
    return collectionEntries.some(watch => watch.watchId === watchId)
  }

  function getWatchIntentAvailability(watchId: string): WatchIntentAvailability | null {
    if (!catalogIdSet.has(watchId)) return null

    const isOwned = isOwnedWatch(watchId)
    const isFollowed = followedWatchIds.includes(watchId)

    return {
      isOwned,
      isFollowed,
      canFollow: true,
      canSetTarget: !isOwned && isFollowed,
      canSetGrail: !isOwned && isFollowed,
      canSetJewel: isOwned,
    }
  }

  function removeFollowedState(watchId: string) {
    setFollowedWatchIds(prev => prev.filter(id => id !== watchId))
    setNextTargets(prev => prev.filter(target => target.watchId !== watchId))
    setGrailWatchId(prev => (prev === watchId ? null : prev))
  }

  function removeCurrentWatchState(watchId: string) {
    const currentState = getSavedState(watchId)

    if (currentState === 'followed') {
      removeFollowedState(watchId)
      return
    }

    if (currentState === 'target') {
      setNextTargets(prev => prev.filter(target => target.watchId !== watchId))
      return
    }

    if (currentState === 'grail') {
      setGrailWatchId(prev => (prev === watchId ? null : prev))
      return
    }

    if (currentState === 'jewel') {
      setCollectionJewelWatchId(prev => (prev === watchId ? null : prev))
    }
  }

  function getSavedState(watchId: string): WatchSavedState | null {
    if (collectionJewelWatchId === watchId) return 'jewel'
    if (grailWatchId === watchId) return 'grail'
    if (nextTargets.some(target => target.watchId === watchId)) return 'target'
    if (followedWatchIds.includes(watchId)) return 'followed'
    return null
  }

  function canTargetWatch(watchId: string) {
    const intent = getWatchIntentAvailability(watchId)
    if (!intent || intent.isOwned) return false

    return nextTargets.some(target => target.watchId === watchId) || nextTargets.length < 3
  }

  function canSetGrail(watchId: string) {
    const intent = getWatchIntentAvailability(watchId)
    return Boolean(intent && !intent.isOwned)
  }

  function canSetJewel(watchId: string) {
    const intent = getWatchIntentAvailability(watchId)
    return Boolean(intent?.canSetJewel)
  }

  function addToCollection(watch: CatalogWatch, condition: WatchCondition, purchaseDetails?: PurchaseDetails) {
    const wasTarget = nextTargets.some(target => target.watchId === watch.id)
    const wasGrail = grailWatchId === watch.id
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
    setNextTargets(prev => prev.filter(target => target.watchId !== watch.id))
    setGrailWatchId(prev => (prev === watch.id ? null : prev))
    setSelectedWatchId(newWatch.id)
    showToast(
      wasTarget || wasGrail
        ? 'Aspirational notes cleared now that it is in your collection.'
        : `${watch.brand} ${watch.model} added to your collection`,
    )
  }

  function followWatch(watchId: string) {
    if (!catalogIdSet.has(watchId) || followedWatchIds.includes(watchId)) return
    setFollowedWatchIds(prev => [...prev, watchId])
    showToast('Saved to your followed watches.')
  }

  function unfollowWatch(watchId: string) {
    if (!followedWatchIds.includes(watchId)) return

    removeFollowedState(watchId)
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
    if (isOwnedWatch(watchId)) {
      showToast('Owned watches can be marked as your Jewel instead.')
      return
    }

    if (nextTargets.length >= 3) {
      showToast("You've reached your 3 target limit.")
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
    if (isOwnedWatch(watchId)) {
      showToast('Owned watches can be marked as your Jewel instead.')
      return
    }

    setFollowedWatchIds(prev => (prev.includes(watchId) ? prev : [...prev, watchId]))
    setNextTargets(prev => prev.filter(target => target.watchId !== watchId))
    setGrailWatchId(watchId)
  }

  function clearGrailWatch() {
    if (!grailWatchId) return
    setGrailWatchId(null)
  }

  function setCollectionJewelWatch(watchId: string) {
    if (!catalogIdSet.has(watchId)) return
    if (collectionJewelWatchId === watchId) return
    if (!isOwnedWatch(watchId)) {
      showToast('Only watches in your collection can be marked as your Jewel.')
      return
    }

    setCollectionJewelWatchId(watchId)
  }

  function clearCollectionJewelWatch() {
    if (!collectionJewelWatchId) return
    setCollectionJewelWatchId(null)
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
      setCollectionJewelWatchId(prev => (prev === watchId ? null : prev))
      showToast('Saved to your followed watches.')
      return { ok: true as const }
    }

    if (state === 'target') {
      if (isOwnedWatch(watchId)) {
        showToast('Owned watches can be marked as your Jewel instead.')
        return { ok: false as const, reason: 'owned_watch' as const }
      }

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

    if (state === 'grail') {
      if (!canSetGrail(watchId)) {
        showToast('Owned watches can be marked as your Jewel instead.')
        return { ok: false as const, reason: 'owned_watch' as const }
      }

      setFollowedWatchIds(prev => (prev.includes(watchId) ? prev : [...prev, watchId]))
      setNextTargets(prev => prev.filter(target => target.watchId !== watchId))
      setGrailWatchId(watchId)
      return { ok: true as const }
    }

    if (!canSetJewel(watchId)) {
      showToast('Only watches in your collection can be marked as your Jewel.')
      return { ok: false as const, reason: 'not_in_collection' as const }
    }

    setCollectionJewelWatchId(watchId)
    return { ok: true as const }
  }

  function removeSavedWatchState(
    watchId: string,
    _options?: { source?: WatchStateSource },
  ) {
    removeCurrentWatchState(watchId)
  }

  function removeFromCollection(watchId: string) {
    const removedWatch = collectionEntries.find(watch => watch.id === watchId) ?? null
    if (removedWatch?.watchId) {
      const hasAnotherOwnedCopy = collectionEntries.some(watch => watch.id !== watchId && watch.watchId === removedWatch.watchId)
      if (!hasAnotherOwnedCopy) {
        setCollectionJewelWatchId(prev => (prev === removedWatch.watchId ? null : prev))
      }
    }
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
    collectionJewelWatchId,
    collectionJewelWatch,
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
    setCollectionJewelWatch,
    clearCollectionJewelWatch,
    setWatchSavedState,
    removeSavedWatchState,
    removeFromCollection,
    reorderCollectionWatches,
    setWatchboxFrame,
    setWatchboxLining,
    setWatchboxSlotCount,
    isInCollection: (watchId: string) => isOwnedWatch(watchId),
    isWatchFollowed: (watchId: string) => followedWatchIds.includes(watchId),
    isWatchTarget: (watchId: string) => nextTargets.some(target => target.watchId === watchId),
    isWatchGrail: (watchId: string) => grailWatchId === watchId,
    isWatchJewel: (watchId: string) => collectionJewelWatchId === watchId,
    canSetWatchAsTarget: (watchId: string) => canTargetWatch(watchId),
    canSetWatchAsGrail: (watchId: string) => canSetGrail(watchId),
    canSetWatchAsJewel: (watchId: string) => canSetJewel(watchId),
    getWatchIntentAvailability,
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
