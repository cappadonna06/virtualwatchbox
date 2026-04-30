'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Watch } from '@/types/watch'
import CollectionHeader from '@/components/collection/CollectionHeader'
import CollectionStats from '@/components/collection/CollectionStats'
import SortDropdown from '@/components/collection/SortDropdown'
import CollectionWatchboxSurface from '@/components/collection/CollectionWatchboxSurface'
import UnsavedChangesBar, { type DraftChange } from '@/components/collection/UnsavedChangesBar'
import ViewSwitcher from '@/components/collection/ViewSwitcher'
import WatchCard from '@/components/collection/WatchCard'
import WatchSidebar from '@/components/collection/WatchSidebar'
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
  } = useCollectionSession()

  const [activeView, setActiveView] = useState<View>('watchbox')
  const [sortBy, setSortBy] = useState<SortMode>('manual')
  const [deleteTarget, setDeleteTarget] = useState<Watch | null>(null)

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

  return (
    <div
      className="collection-section"
      style={{ padding: '56px 56px 120px', borderTop: `1px solid ${brand.colors.border}` }}
    >
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

      {activeView === 'watchbox' ? (
        <CollectionWatchboxSurface
          watches={displayWatches}
          onEmptySlotClick={() => router.push('/collection/add')}
          onReorder={sortBy === 'manual' ? handleReorder : undefined}
          topToolbar={
            <SortDropdown
              value={sortBy}
              options={SORT_OPTIONS}
              onChange={value => setSortBy(value as SortMode)}
            />
          }
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
      <div
        className={`sidebar-backdrop ${activeWatch ? 'is-active' : ''}`}
        onClick={onCloseSidebar}
      />

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

        <div
          className={`sidebar-sheet ${activeWatch ? 'is-active' : ''}`}
          style={{
            alignSelf: 'start',
            position: 'sticky',
            top: 84,
          }}
        >
          <div className="sidebar-drag-pill" style={{ display: 'none', justifyContent: 'center', padding: '12px 0 4px' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: brand.colors.borderLight }} />
          </div>
          <button
            className="sidebar-close-btn"
            onClick={onCloseSidebar}
            style={{
              display: 'none',
              position: 'absolute',
              top: 14,
              right: 16,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: brand.colors.muted,
              fontSize: 18,
              lineHeight: 1,
              padding: 4,
            }}
          >
            ✕
          </button>
          <div className="sidebar-content">
            <WatchSidebar
              watch={activeWatch}
              sticky={false}
              onRequestDelete={onRequestDelete}
            />
          </div>
        </div>
      </div>
    </>
  )
}
