'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Watch } from '@/types/watch'
import CollectionStats from '@/components/collection/CollectionStats'
import SortControl from '@/components/collection/SortControl'
import CollectionWatchboxSurface from '@/components/collection/CollectionWatchboxSurface'
import UnsavedChangesBar, { type DraftChange } from '@/components/collection/UnsavedChangesBar'
import WatchboxHeader from '@/components/collection/WatchboxHeader'
import WatchCard from '@/components/collection/WatchCard'
import WatchSidebar from '@/components/collection/WatchSidebar'
import ResponsiveSidebarSheet from '@/components/collection/ResponsiveSidebarSheet'
import { useCollectionSession } from './CollectionSessionProvider'
import { brand } from '@/lib/brand'

type View = 'watchbox' | 'cards'
type SortMode = 'recent' | 'price-desc' | 'price-asc' | 'brand' | 'watchbox'

const EMPTY_PENDING_CHANGES: DraftChange[] = []
const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'recent', label: 'Recently Added' },
  { value: 'price-desc', label: 'Price High \u2192 Low' },
  { value: 'price-asc', label: 'Price Low \u2192 High' },
  { value: 'brand', label: 'Brand A \u2192 Z' },
  { value: 'watchbox', label: 'Watch Box' },
]

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}

function sortCollectionWatches(watches: Watch[], sortBy: SortMode) {
  if (sortBy === 'watchbox') return watches

  const sorted = [...watches]

  if (sortBy === 'recent') {
    sorted.sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())
  } else if (sortBy === 'price-desc') {
    sorted.sort((a, b) => b.estimatedValue - a.estimatedValue)
  } else if (sortBy === 'price-asc') {
    sorted.sort((a, b) => a.estimatedValue - b.estimatedValue)
  } else if (sortBy === 'brand') {
    sorted.sort((a, b) => a.brand.localeCompare(b.brand) || a.model.localeCompare(b.model))
  }

  return sorted
}

export default function CollectionPage() {
  const router = useRouter()
  const {
    collectionWatches,
    selectedWatchId,
    setSelectedWatchId,
    removeFromCollection,
    reorderCollectionWatches,
  } = useCollectionSession()

  const [activeView, setActiveView] = useState<View>('watchbox')
  const [sortBy, setSortBy] = useState<SortMode>('recent')
  const [deleteTarget, setDeleteTarget] = useState<Watch | null>(null)
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null)
  const [mobileStatsOpen, setMobileStatsOpen] = useState(true)
  const [screenWidth, setScreenWidth] = useState(0)

  const cardsWatches = useMemo(
    () => sortCollectionWatches(collectionWatches, sortBy),
    [collectionWatches, sortBy],
  )

  const totalEstimatedValue = collectionWatches.reduce((sum, watch) => sum + watch.estimatedValue, 0)
  const activeSlot = selectedWatchId ? cardsWatches.findIndex(watch => watch.id === selectedWatchId) : -1
  const activeWatch = activeSlot >= 0 ? cardsWatches[activeSlot] : null
  const isMobile = screenWidth > 0 && screenWidth < 768

  useEffect(() => {
    const updateWidth = () => setScreenWidth(window.innerWidth)
    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  useEffect(() => {
    if (!feedbackToast) return
    const timeoutId = window.setTimeout(() => setFeedbackToast(null), 2500)
    return () => window.clearTimeout(timeoutId)
  }, [feedbackToast])

  function handleCardSelect(index: number) {
    const watch = cardsWatches[index]
    if (!watch) return
    setSelectedWatchId(selectedWatchId === watch.id ? null : watch.id)
  }

  function handleReorder(from: number, to: number) {
    const next = [...collectionWatches]
    ;[next[from], next[to]] = [next[to], next[from]]
    reorderCollectionWatches(next)
  }

  function handleDeleteWatch() {
    if (!deleteTarget) return
    removeFromCollection(deleteTarget.id)
    setSelectedWatchId(null)
    setDeleteTarget(null)
  }

  function handleShareCollection() {
    const url = `${window.location.origin}/collection`

    navigator.clipboard.writeText(url)
      .then(() => setFeedbackToast('Collection link copied to clipboard'))
      .catch(() => setFeedbackToast('Unable to copy collection link'))
  }

  return (
    <div
      className="collection-section"
      style={{ padding: '0 0 120px', borderTop: `1px solid ${brand.colors.border}` }}
    >
      <div style={{ padding: '32px 32px 0' }}>
        <WatchboxHeader
          title="My Collection"
          subtitle="Your collection, wherever you go."
          summary={`${fmt(totalEstimatedValue)} est. value · ${collectionWatches.length} ${collectionWatches.length === 1 ? 'watch' : 'watches'}`}
          primaryAction={{
            label: 'Add Watch',
            onClick: () => router.push('/collection/add'),
            ariaLabel: 'Add Watch',
            icon: (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 2V10M2 6H10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            ),
          }}
          activeView={activeView}
          onViewChange={setActiveView}
          menuItems={[
            {
              label: 'Import from Photo',
              onSelect: () => setFeedbackToast('Photo import is coming soon'),
            },
            {
              label: 'Share Collection',
              onSelect: handleShareCollection,
            },
          ]}
        />
      </div>

      <div style={{ padding: '0 32px' }}>
        {activeView === 'watchbox' ? (
          <CollectionWatchboxSurface
            watches={collectionWatches}
            onEmptySlotClick={() => router.push('/collection/add')}
            onReorder={handleReorder}
          />
        ) : (
          <CardsView
            watches={cardsWatches}
            activeWatch={activeWatch}
            activeSlot={activeSlot >= 0 ? activeSlot : null}
            onCardSelect={handleCardSelect}
            sortBy={sortBy}
            setSortBy={setSortBy}
            onCloseSidebar={() => setSelectedWatchId(null)}
            onRequestDelete={watch => setDeleteTarget(watch)}
          />
        )}

        {isMobile ? (
          <div style={{ marginTop: 22 }}>
            <button
              type="button"
              onClick={() => setMobileStatsOpen(open => !open)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'transparent',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                fontFamily: brand.font.sans,
                fontSize: 11,
                color: brand.colors.muted,
                letterSpacing: '0.04em',
              }}
            >
              <span>Collection Stats</span>
              <svg
                width="11"
                height="7"
                viewBox="0 0 11 7"
                fill="none"
                aria-hidden="true"
                style={{
                  transform: mobileStatsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: `transform ${brand.transition.base}`,
                }}
              >
                <path d="M1 1.25L5.5 5.75L10 1.25" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {mobileStatsOpen ? (
              <div style={{ marginTop: 18, paddingTop: 24, borderTop: `1px solid ${brand.colors.border}` }}>
                <CollectionStats watches={collectionWatches} />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {!isMobile ? (
        <div
          id="collection-stats"
          style={{ marginTop: 72, padding: '48px 32px 0', borderTop: `1px solid ${brand.colors.border}` }}
        >
          <div style={{ marginBottom: 32 }}>
            <h2
              style={{
                fontFamily: brand.font.serif,
                fontSize: 36,
                fontWeight: 400,
                color: brand.colors.ink,
                margin: '0 0 6px',
                lineHeight: 1.1,
              }}
            >
              Collection Stats
            </h2>
            <p
              style={{
                fontFamily: brand.font.sans,
                fontSize: 13,
                color: brand.colors.muted,
                margin: 0,
              }}
            >
              A factual breakdown of what you own.
            </p>
          </div>
          <CollectionStats watches={collectionWatches} />
        </div>
      ) : null}

      <UnsavedChangesBar
        pendingChanges={EMPTY_PENDING_CHANGES}
        onSave={() => undefined}
        onDiscard={() => undefined}
      />

      {feedbackToast ? (
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
            zIndex: 300,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          {feedbackToast}
        </div>
      ) : null}

      {deleteTarget && (
        <>
          <div
            onClick={() => setDeleteTarget(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(26,20,16,0.45)',
              zIndex: 210,
              backdropFilter: 'blur(2px)',
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '90vw',
              maxWidth: 420,
              background: brand.colors.white,
              border: `1px solid ${brand.colors.border}`,
              borderRadius: brand.radius.xl,
              boxShadow: brand.shadow.lg,
              zIndex: 211,
              padding: 18,
            }}
          >
            <div style={{ fontFamily: brand.font.sans, fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: brand.colors.muted, marginBottom: 6 }}>
              Remove Watch
            </div>
            <div style={{ fontFamily: brand.font.serif, fontSize: 28, color: brand.colors.ink, lineHeight: 1.1, marginBottom: 8 }}>
              Delete from My Collection?
            </div>
            <p style={{ margin: '0 0 16px', fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.muted, lineHeight: 1.5 }}>
              {deleteTarget.brand} {deleteTarget.model} will be removed from your collection list.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
                onClick={() => setDeleteTarget(null)}
                style={{
                  fontFamily: brand.font.sans,
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  padding: '9px 12px',
                  background: 'transparent',
                  color: brand.colors.ink,
                  border: `1px solid ${brand.colors.borderLight}`,
                  borderRadius: brand.radius.sm,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteWatch}
                style={{
                  fontFamily: brand.font.sans,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  padding: '9px 12px',
                  background: brand.colors.ink,
                  color: brand.colors.bg,
                  border: 'none',
                  borderRadius: brand.radius.sm,
                  cursor: 'pointer',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function CardsView({
  watches,
  activeWatch,
  activeSlot,
  onCardSelect,
  sortBy,
  setSortBy,
  onCloseSidebar,
  onRequestDelete,
}: {
  watches: Watch[]
  activeWatch: Watch | null
  activeSlot: number | null
  onCardSelect: (index: number) => void
  sortBy: SortMode
  setSortBy: (value: SortMode) => void
  onCloseSidebar: () => void
  onRequestDelete: (watch: Watch) => void
}) {
  return (
    <>
      <div className="collection-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 32, alignItems: 'start' }}>
        <div>
          <div style={{ marginBottom: 10 }}>
            <SortControl
              value={sortBy}
              options={SORT_OPTIONS}
              onChange={value => setSortBy(value as SortMode)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18 }}>
            {watches.map((watch, index) => (
              <div key={watch.id}>
                <WatchCard
                  watch={watch}
                  isActive={activeSlot === index}
                  onSelect={() => onCardSelect(index)}
                />
              </div>
            ))}
          </div>
        </div>

        <ResponsiveSidebarSheet active={Boolean(activeWatch)} onClose={onCloseSidebar}>
          <WatchSidebar
            watch={activeWatch}
            sticky={false}
            onRequestDelete={onRequestDelete}
          />
        </ResponsiveSidebarSheet>
      </div>
    </>
  )
}
