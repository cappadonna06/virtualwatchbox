'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Watch } from '@/types/watch'
import CollectionHeader from '@/components/collection/CollectionHeader'
import CollectionStats from '@/components/collection/CollectionStats'
import CollectionWatchboxSurface from '@/components/collection/CollectionWatchboxSurface'
import UnsavedChangesBar, { type DraftChange } from '@/components/collection/UnsavedChangesBar'
import ViewSwitcher from '@/components/collection/ViewSwitcher'
import WatchCard from '@/components/collection/WatchCard'
import { useCollectionSession } from './CollectionSessionProvider'
import { brand } from '@/lib/brand'

type View = 'watchbox' | 'cards'
type SortMode = 'manual' | 'brand' | 'value' | 'type'

const EMPTY_PENDING_CHANGES: DraftChange[] = []

export default function CollectionPage() {
  const router = useRouter()
  const {
    collectionWatches,
    selectedWatchId,
    setSelectedWatchId,
    reorderCollectionWatches,
  } = useCollectionSession()

  const [activeView, setActiveView] = useState<View>('watchbox')
  const [sortBy, setSortBy] = useState<SortMode>('manual')

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
            <select
              value={sortBy}
              onChange={event => setSortBy(event.target.value as SortMode)}
              style={{
                fontFamily: brand.font.sans,
                fontSize: 11,
                color: brand.colors.muted,
                border: `1px solid ${brand.colors.borderLight}`,
                borderRadius: brand.radius.btn,
                padding: '4px 10px',
                background: 'transparent',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="manual">Sort: Manual</option>
              <option value="brand">Brand</option>
              <option value="value">Value</option>
              <option value="type">Type</option>
            </select>
          }
        />
      ) : (
        <CardsView
          watches={displayWatches}
          activeSlot={activeSlot >= 0 ? activeSlot : null}
          onCardSelect={handleCardSelect}
          sortBy={sortBy}
          setSortBy={setSortBy}
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
    </div>
  )
}

function CardsView({
  watches,
  activeSlot,
  onCardSelect,
  sortBy,
  setSortBy,
}: {
  watches: Watch[]
  activeSlot: number | null
  onCardSelect: (index: number) => void
  sortBy: SortMode
  setSortBy: (value: SortMode) => void
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <select
          value={sortBy}
          onChange={event => setSortBy(event.target.value as SortMode)}
          style={{
            fontFamily: brand.font.sans,
            fontSize: 11,
            color: brand.colors.muted,
            border: `1px solid ${brand.colors.borderLight}`,
            borderRadius: brand.radius.btn,
            padding: '6px 12px',
            background: brand.colors.white,
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <option value="manual">Sort: Manual</option>
          <option value="brand">Brand</option>
          <option value="value">Value</option>
          <option value="type">Type</option>
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18 }}>
        {watches.map((watch, index) => (
          <WatchCard
            key={watch.id}
            watch={watch}
            isActive={activeSlot === index}
            onSelect={() => onCardSelect(index)}
          />
        ))}
      </div>
    </div>
  )
}
