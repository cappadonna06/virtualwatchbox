'use client'

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { watches as catalogWatches } from '@/lib/watches'
import type { Watch, WatchCondition } from '@/types/watch'

const DEFAULT_COLLECTION = catalogWatches.slice(0, 5)
const STORAGE_KEY = 'collection-session-v1'

type PurchaseDetails = {
  price?: number
  date?: string
  notes?: string
}

type SessionSnapshot = {
  collectionWatches: Watch[]
  followedWatchIds: string[]
  selectedWatchId: string | null
}

interface CollectionSessionContextValue {
  collectionWatches: Watch[]
  followedWatchIds: string[]
  selectedWatchId: string | null
  setSelectedWatchId: (watchId: string | null) => void
  addToCollection: (watch: Watch, condition: WatchCondition, purchaseDetails?: PurchaseDetails) => void
  followWatch: (watchId: string) => void
  removeFromCollection: (watchId: string) => void
  reorderCollectionWatches: (newWatches: Watch[]) => void
  isInCollection: (watchId: string) => boolean
  toastMessage: string | null
  toastVisible: boolean
}

const CollectionSessionContext = createContext<CollectionSessionContextValue | null>(null)

export function CollectionSessionProvider({ children }: { children: React.ReactNode }) {
  const [collectionWatches, setCollectionWatches] = useState<Watch[]>(DEFAULT_COLLECTION)
  const [followedWatchIds, setFollowedWatchIds] = useState<string[]>([])
  const [selectedWatchId, setSelectedWatchId] = useState<string | null>(null)
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
        }
      }
    } catch {
      // Ignore malformed session data.
    } finally {
      setHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!hydrated) return
    const snapshot: SessionSnapshot = { collectionWatches, followedWatchIds, selectedWatchId }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
  }, [hydrated, collectionWatches, followedWatchIds, selectedWatchId])

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
    setFollowedWatchIds(prev => (prev.includes(watchId) ? prev : [...prev, watchId]))
    showToast('Saved to your Followed Watches')
  }

  function removeFromCollection(watchId: string) {
    setCollectionWatches(prev => prev.filter(w => w.id !== watchId))
    setSelectedWatchId(prev => (prev === watchId ? null : prev))
  }

  function reorderCollectionWatches(newWatches: Watch[]) {
    setCollectionWatches(newWatches)
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
    setSelectedWatchId,
    addToCollection,
    followWatch,
    removeFromCollection,
    reorderCollectionWatches,
    isInCollection: (watchId: string) => ownedCatalogIds.has(watchId),
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
            background: '#1A1410',
            color: '#FAF8F4',
            padding: '10px 22px',
            borderRadius: 8,
            fontFamily: 'var(--font-dm-sans)',
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
