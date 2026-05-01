'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ResolvedOwnedWatch } from '@/types/watch'
import CollectionHeader from '@/components/collection/CollectionHeader'
import CollectionStats from '@/components/collection/CollectionStats'
import SortDropdown from '@/components/collection/SortDropdown'
import CollectionWatchboxSurface from '@/components/collection/CollectionWatchboxSurface'
import ResponsiveSidebarSheet from '@/components/collection/ResponsiveSidebarSheet'
import UnsavedChangesBar, { type DraftChange } from '@/components/collection/UnsavedChangesBar'
import ViewSwitcher from '@/components/collection/ViewSwitcher'
import WatchCard from '@/components/collection/WatchCard'
import WatchSidebar from '@/components/collection/WatchSidebar'
import WatchboxHeader from '@/components/collection/WatchboxHeader'
import { copyProfileDemoUrl } from '@/lib/profileDemo'
import { useCollectionSession } from './CollectionSessionProvider'
import { brand } from '@/lib/brand'

type View = 'watchbox' | 'cards'
type SortMode = 'manual' | 'brand' | 'value' | 'type'

const EMPTY_PENDING_CHANGES: DraftChange[] = []
const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'manual', label: 'Watchbox' },
  { value: 'brand', label: 'Brand' },
  { value: 'value', label: 'Value' },
  { value: 'type', label: 'Type' },
]

export default function CollectionPage() {
  const router = useRouter()
  const {
    collectionWatches,
    selectedWatchId,
    setSelectedWatchId,
    removeFromCollection,
    reorderCollectionWatches,
    showToast,
  } = useCollectionSession()

  const [activeView, setActiveView] = useState<View>('watchbox')
  const [sortBy, setSortBy] = useState<SortMode>('manual')
  const [deleteTarget, setDeleteTarget] = useState<ResolvedOwnedWatch | null>(null)
  const [screenWidth, setScreenWidth] = useState(0)
  const [mobileStatsOpen, setMobileStatsOpen] = useState(true)

  const displayWatches = useMemo(() => {
    if (sortBy === 'manual') return collectionWatches

    const sorted = [...collectionWatches]
    if (sortBy === 'brand') sorted.sort((a, b) => a.brand.localeCompare(b.brand))
    else if (sortBy === 'value') sorted.sort((a, b) => b.estimatedValue - a.estimatedValue)
    else if (sortBy === 'type') sorted.sort((a, b) => a.watchType.localeCompare(b.watchType))
    return sorted
  }, [collectionWatches, sortBy])

  const totalEstimatedValue = collectionWatches.reduce((sum, watch) => sum + watch.estimatedValue, 0)
  const activeSlot = selectedWatchId ? displayWatches.findIndex(watch => watch.id === selectedWatchId) : -1
  const activeWatch = activeSlot >= 0 ? displayWatches[activeSlot] : null
  const isMobile = screenWidth > 0 && screenWidth < 768

  useEffect(() => {
    const updateWidth = () => setScreenWidth(window.innerWidth)
    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  function handleCardSelect(index: number) {
    const watch = displayWatches[index]
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

  async function handleShareCollection() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'My Collection',
          text: 'Take a look inside my collection.',
          url: new URL('/collection', window.location.origin).toString(),
        })
        return
      }

      await copyProfileDemoUrl('/collection')
      showToast('Collection link copied to clipboard.')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return

      await copyProfileDemoUrl('/collection')
      showToast('Collection link copied to clipboard.')
    }
  }

  return (
    <div
      className="collection-section"
      style={{ padding: '0 0 120px', borderTop: `1px solid ${brand.colors.border}` }}
    >
      <div style={{ padding: isMobile ? '28px 20px 0' : '56px 56px 0' }}>
        {isMobile ? (
          <WatchboxHeader
            title="My Collection"
            subtitle="Your collection, wherever you go."
            summary={`${collectionWatches.length} ${collectionWatches.length === 1 ? 'watch' : 'watches'} · ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalEstimatedValue)} est. value`}
            primaryAction={{
              label: 'Add Watch',
              onClick: () => router.push('/collection/add'),
              ariaLabel: 'Add Watch',
              icon: (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M6 2V10M2 6H10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              ),
            }}
            activeView={activeView}
            onViewChange={setActiveView}
            menuItems={[
              {
                label: 'Share Collection',
                onSelect: () => {
                  void handleShareCollection()
                },
              },
            ]}
          />
        ) : (
          <>
            <CollectionHeader
              totalEstValue={totalEstimatedValue}
              pendingChangesCount={0}
              onAddWatch={() => router.push('/collection/add')}
              onOpenPlayground={() => router.push('/playground')}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
              <ViewSwitcher activeView={activeView} setActiveView={setActiveView} />
              <a
                href="#collection-stats"
                style={{
                  fontFamily: brand.font.sans,
                  fontSize: 11,
                  color: brand.colors.muted,
                  textDecoration: 'none',
                  letterSpacing: '0.04em',
                }}
              >
                Stats ↓
              </a>
            </div>
          </>
        )}
      </div>

      <div style={{ padding: `0 ${isMobile ? 20 : 56}px` }}>
        {activeView === 'watchbox' ? (
          <CollectionWatchboxSurface
            watches={displayWatches}
            onEmptySlotClick={() => router.push('/collection/add')}
            onReorder={sortBy === 'manual' ? handleReorder : undefined}
            topToolbar={!isMobile ? (
              <SortDropdown
                value={sortBy}
                options={SORT_OPTIONS}
                onChange={value => setSortBy(value as SortMode)}
              />
            ) : undefined}
          />
        ) : (
          <CardsView
            watches={displayWatches}
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
          mobileStatsOpen ? (
            <div id="collection-stats" style={{ marginTop: 56, paddingTop: 28, borderTop: `1px solid ${brand.colors.border}` }}>
              <CollectionStats watches={collectionWatches} />
            </div>
          ) : null
        ) : (
          <div
            id="collection-stats"
            style={{ marginTop: 72, paddingTop: 48, borderTop: `1px solid ${brand.colors.border}` }}
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
        )}
      </div>

      <UnsavedChangesBar
        pendingChanges={EMPTY_PENDING_CHANGES}
        onSave={() => undefined}
        onDiscard={() => undefined}
      />

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
  watches: ResolvedOwnedWatch[]
  activeWatch: ResolvedOwnedWatch | null
  activeSlot: number | null
  onCardSelect: (index: number) => void
  sortBy: SortMode
  setSortBy: (value: SortMode) => void
  onCloseSidebar: () => void
  onRequestDelete: (watch: ResolvedOwnedWatch) => void
}) {
  return (
    <>
      <div className="collection-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 32, alignItems: 'start' }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
            <div>
              <SortDropdown
                value={sortBy}
                options={SORT_OPTIONS}
                onChange={value => setSortBy(value as SortMode)}
              />
            </div>
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
            onRequestDelete={watch => onRequestDelete(watch as ResolvedOwnedWatch)}
          />
        </ResponsiveSidebarSheet>
      </div>
    </>
  )
}
