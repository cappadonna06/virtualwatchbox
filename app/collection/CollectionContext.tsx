'use client'

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import type { Watch, WatchCondition } from '@/types/watch'
import { watches as catalogWatches } from '@/lib/watches'

const DEFAULT_COLLECTION = catalogWatches.slice(0, 5)

interface PurchaseDetails {
  price?: number
  date?: string
  notes?: string
}

interface ToastState {
  message: string
  opacity: number
}

interface CollectionContextValue {
  collectionWatches: Watch[]
  followedWatchIds: string[]
  addToCollection: (watch: Watch, condition: WatchCondition, details?: PurchaseDetails) => void
  addToFollowed: (watchId: string) => void
  toast: ToastState | null
  showToast: (message: string) => void
}

const CollectionContext = createContext<CollectionContextValue | null>(null)

export function CollectionProvider({ children }: { children: React.ReactNode }) {
  const [collectionWatches, setCollectionWatches] = useState<Watch[]>(DEFAULT_COLLECTION)
  const [followedWatchIds, setFollowedWatchIds] = useState<string[]>([])
  const [toast, setToast] = useState<ToastState | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [])

  const showToast = useCallback((message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ message, opacity: 0 })
    // Fade in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setToast({ message, opacity: 1 })
      })
    })
    // Fade out after 2.5s
    toastTimer.current = setTimeout(() => {
      setToast(prev => prev ? { ...prev, opacity: 0 } : null)
      toastTimer.current = setTimeout(() => setToast(null), 300)
    }, 2650)
  }, [])

  const addToCollection = useCallback((
    watch: Watch,
    condition: WatchCondition,
    details?: PurchaseDetails,
  ) => {
    const newWatch: Watch = {
      ...watch,
      id: `${watch.id}-${Date.now()}`,
      condition,
      ownershipStatus: 'Owned',
      purchasePrice: details?.price ?? 0,
      purchaseDate: details?.date ?? new Date().toISOString().split('T')[0],
      notes: details?.notes ?? '',
    }
    setCollectionWatches(prev => [...prev, newWatch])
  }, [])

  const addToFollowed = useCallback((watchId: string) => {
    setFollowedWatchIds(prev => prev.includes(watchId) ? prev : [...prev, watchId])
  }, [])

  return (
    <CollectionContext.Provider value={{
      collectionWatches, followedWatchIds,
      addToCollection, addToFollowed,
      toast, showToast,
    }}>
      {children}
      {toast && (
        <div
          style={{
            position: 'fixed', bottom: 28, left: '50%',
            transform: 'translateX(-50%)',
            background: '#1A1410', color: '#FAF8F4',
            padding: '10px 22px', borderRadius: 8,
            fontFamily: 'var(--font-dm-sans)', fontSize: 12, fontWeight: 500,
            zIndex: 300, whiteSpace: 'nowrap',
            pointerEvents: 'none',
            opacity: toast.opacity,
            transition: toast.opacity === 1 ? 'opacity 0.15s ease' : 'opacity 0.3s ease',
          }}
        >
          {toast.message}
        </div>
      )}
    </CollectionContext.Provider>
  )
}

export function useCollection(): CollectionContextValue {
  const ctx = useContext(CollectionContext)
  if (!ctx) throw new Error('useCollection must be used within CollectionProvider')
  return ctx
}
