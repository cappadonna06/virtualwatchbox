'use client'

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { FRAMES, LININGS, SLOT_COUNTS } from '@/lib/frameConfig'
import { watches as catalogWatches } from '@/lib/watches'
import { getEffectiveSlotCount } from '@/lib/watchboxOverflow'
import type { Watch, WatchCondition } from '@/types/watch'
import { brand } from '@/lib/brand'

const DEFAULT_COLLECTION = catalogWatches.slice(0, 5)
const STORAGE_KEY = 'collection-session-v1'
const WATCHBOX_STORAGE_KEY = 'watchbox-config'

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
  collectionWatches: Watch[]
  followedWatchIds: string[]
  selectedWatchId: string | null
  watchboxConfig: WatchboxConfig
}

interface CollectionSessionContextValue {
  collectionWatches: Watch[]
  followedWatchIds: string[]
  selectedWatchId: string | null
  watchboxConfig: WatchboxConfig
  setSelectedWatchId: (watchId: string | null) => void
  addToCollection: (watch: Watch, condition: WatchCondition, purchaseDetails?: PurchaseDetails) => void
  followWatch: (watchId: string) => void
  unfollowWatch: (watchId: string) => void
  toggleFollowedWatch: (watchId: string) => void
  removeFromCollection: (watchId: string) => void
  reorderCollectionWatches: (newWatches: Watch[]) => void
  setWatchboxFrame: (frameId: string) => void
  setWatchboxLining: (liningId: string) => void
  setWatchboxSlotCount: (slotCount: number) => void
  isInCollection: (watchId: string) => boolean
  isWatchFollowed: (watchId: string) => boolean
  toastMessage: string | null
  toastVisible: boolean
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

export function CollectionSessionProvider({ children }: { children: React.ReactNode }) {
  const [collectionWatches, setCollectionWatches] = useState<Watch[]>(DEFAULT_COLLECTION)
  const [followedWatchIds, setFollowedWatchIds] = useState<string[]>([])
  const [selectedWatchId, setSelectedWatchId] = useState<string | null>(null)
  const [watchboxConfig, setWatchboxConfig] = useState<WatchboxConfig>(DEFAULT_WATCHBOX_CONFIG)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [toastVisible, setToastVisible] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as SessionSnapshot
        if (Array.isArray(parsed.collectionWatches) && Array.isArray(parsed.followedWatchIds)) {
          setCollectionWatches(parsed.collectionWatches)
          setFollowedWatchIds(parsed.followedWatchIds)
          setSelectedWatchId(parsed.selectedWatchId ?? null)
          if (isValidWatchboxConfig(parsed.watchboxConfig)) {
            setWatchboxConfig(parsed.watchboxConfig)
          }
        }
      }
    } catch {
      // Ignore malformed session data.
    }

    try {
      const rawConfig = localStorage.getItem(WATCHBOX_STORAGE_KEY)
      if (!rawConfig) return

      const parsedConfig = JSON.parse(rawConfig)
      if (isValidWatchboxConfig(parsedConfig)) {
        setWatchboxConfig(parsedConfig)
      }
    } finally {
      setHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!hydrated) return
    const snapshot: SessionSnapshot = {
      collectionWatches,
      followedWatchIds,
      selectedWatchId,
      watchboxConfig,
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
  }, [hydrated, collectionWatches, followedWatchIds, selectedWatchId, watchboxConfig])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(WATCHBOX_STORAGE_KEY, JSON.stringify(watchboxConfig))
  }, [hydrated, watchboxConfig])

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

  function addToCollection(watch: Watch, condition: WatchCondition, purchaseDetails?: PurchaseDetails) {
    const newWatch: Watch = {
      ...watch,
      id: `${watch.id}-${Date.now()}`,
      condition,
      ownershipStatus: 'Owned',
      purchasePrice: purchaseDetails?.price ?? 0,
      purchaseDate: purchaseDetails?.date ?? new Date().toISOString().split('T')[0],
      notes: purchaseDetails?.notes ?? '',
    }
    setCollectionWatches(prev => [...prev, newWatch])
    setSelectedWatchId(newWatch.id)
    showToast(`${watch.brand} ${watch.model} added to your collection`)
  }

  function followWatch(watchId: string) {
    if (followedWatchIds.includes(watchId)) return
    setFollowedWatchIds(prev => [...prev, watchId])
    showToast('Saved to your Followed Watches')
  }

  function unfollowWatch(watchId: string) {
    if (!followedWatchIds.includes(watchId)) return
    setFollowedWatchIds(prev => prev.filter(id => id !== watchId))
    showToast('Removed from your Followed Watches')
  }

  function toggleFollowedWatch(watchId: string) {
    const isAlreadyFollowed = followedWatchIds.includes(watchId)
    setFollowedWatchIds(prev => (
      isAlreadyFollowed
        ? prev.filter(id => id !== watchId)
        : [...prev, watchId]
    ))
    showToast(isAlreadyFollowed ? 'Removed from your Followed Watches' : 'Saved to your Followed Watches')
  }

  function removeFromCollection(watchId: string) {
    setCollectionWatches(prev => prev.filter(w => w.id !== watchId))
    setSelectedWatchId(prev => (prev === watchId ? null : prev))
  }

  function reorderCollectionWatches(newWatches: Watch[]) {
    setCollectionWatches(newWatches)
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

  const ownedCatalogIds = useMemo(() => {
    const ids = new Set<string>()
    collectionWatches.forEach(w => {
      ids.add(w.id)
      const dashIdx = w.id.lastIndexOf('-')
      if (dashIdx > 0) ids.add(w.id.slice(0, dashIdx))
    })
    return ids
  }, [collectionWatches])

  const value: CollectionSessionContextValue = {
    collectionWatches,
    followedWatchIds,
    selectedWatchId,
    watchboxConfig,
    setSelectedWatchId,
    addToCollection,
    followWatch,
    unfollowWatch,
    toggleFollowedWatch,
    removeFromCollection,
    reorderCollectionWatches,
    setWatchboxFrame,
    setWatchboxLining,
    setWatchboxSlotCount,
    isInCollection: (watchId: string) => ownedCatalogIds.has(watchId),
    isWatchFollowed: (watchId: string) => followedWatchIds.includes(watchId),
    toastMessage,
    toastVisible,
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
            transform: 'translateX(-50%)',
            background: brand.colors.ink,
            color: brand.colors.bg,
            padding: '10px 22px',
            borderRadius: brand.radius.md,
            fontFamily: brand.font.sans,
            fontSize: 12,
            fontWeight: 500,
            zIndex: 300,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            opacity: toastVisible ? 1 : 0,
            transition: `opacity ${toastVisible ? 150 : 300}ms ease`,
          }}
        >
          {toastMessage}
        </div>
      )}
    </CollectionSessionContext.Provider>
  )
}

export function useCollectionSession() {
  const ctx = useContext(CollectionSessionContext)
  if (!ctx) throw new Error('useCollectionSession must be used within CollectionSessionProvider')
  return ctx
}
