'use client'

import { useMemo, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { CatalogWatch, ResolvedOwnedWatch } from '@/types/watch'
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
    followedWatches,
    nextTargetWatches,
    grailWatch,
    selectedWatchId,
    setSelectedWatchId,
    removeFromCollection,
    reorderCollectionWatches,
  } = useCollectionSession()

  const [activeView, setActiveView] = useState<View>('watchbox')
  const [sortBy, setSortBy] = useState<SortMode>('manual')
  const [deleteTarget, setDeleteTarget] = useState<ResolvedOwnedWatch | null>(null)

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

      <div style={{ marginTop: 56 }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GrailModule grailWatch={grailWatch} />
          <NextTargetsPanel nextTargetWatches={nextTargetWatches} followedCount={followedWatches.length} />
        </div>
      </div>

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
              onRequestDelete={watch => onRequestDelete(watch as ResolvedOwnedWatch)}
            />
          </div>
        </div>
      </div>
    </>
  )
}

function marketHref(watch: CatalogWatch) {
  return `https://www.chrono24.com/search/index.htm?query=${encodeURIComponent(`${watch.brand} ${watch.model}`)}`
}

function moduleShellStyle(): CSSProperties {
  return {
    background: brand.colors.white,
    border: `1px solid ${brand.colors.border}`,
    borderRadius: brand.radius.xl,
    padding: 24,
    boxShadow: brand.shadow.xs,
    height: '100%',
  }
}

function emptyCopyStyle(): CSSProperties {
  return {
    fontFamily: brand.font.sans,
    fontSize: 12,
    color: brand.colors.muted,
    lineHeight: 1.6,
    margin: 0,
  }
}

function GrailModule({ grailWatch }: { grailWatch: CatalogWatch | null }) {
  return (
    <section style={moduleShellStyle()}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ color: brand.colors.gold, display: 'inline-flex' }}>
          <svg width="14" height="14" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M2 9.25h8l-.72-4.45-2.08 1.52L6 2.35 4.8 6.32 2.72 4.8 2 9.25z" fill="currentColor" stroke="currentColor" strokeLinejoin="round" strokeWidth="0.35" />
          </svg>
        </span>
        <span style={{ fontFamily: brand.font.sans, fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: brand.colors.gold }}>
          Grail
        </span>
      </div>

      {grailWatch ? (
        <>
          <div style={{ fontFamily: brand.font.sans, fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: brand.colors.muted, marginBottom: 6 }}>
            {grailWatch.brand}
          </div>
          <h3 style={{ fontFamily: brand.font.serif, fontSize: 32, fontWeight: 400, color: brand.colors.ink, lineHeight: 1.05, margin: '0 0 6px' }}>
            {grailWatch.model}
          </h3>
          <div style={{ fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.muted, marginBottom: 18 }}>
            Ref. {grailWatch.reference}
          </div>
          <div style={{ fontFamily: brand.font.serif, fontSize: 28, color: brand.colors.gold, marginBottom: 16 }}>
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(grailWatch.estimatedValue)}
          </div>
          <a
            href={marketHref(grailWatch)}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px 16px',
              borderRadius: brand.radius.btn,
              background: brand.colors.ink,
              color: brand.colors.bg,
              fontFamily: brand.font.sans,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              textDecoration: 'none',
            }}
          >
            Find on Market ↗
          </a>
        </>
      ) : (
        <>
          <h3 style={{ fontFamily: brand.font.serif, fontSize: 28, fontWeight: 400, color: brand.colors.ink, lineHeight: 1.05, margin: '0 0 10px' }}>
            Your north star is still open.
          </h3>
          <p style={emptyCopyStyle()}>
            Follow a watch, then mark one as your Grail from the detail page or sidebar.
          </p>
        </>
      )}
    </section>
  )
}

function NextTargetsPanel({
  nextTargetWatches,
  followedCount,
}: {
  nextTargetWatches: { target: { watchId: string }; watch: CatalogWatch }[]
  followedCount: number
}) {
  return (
    <section style={moduleShellStyle()}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
        <div>
          <div style={{ fontFamily: brand.font.sans, fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: brand.colors.muted, marginBottom: 6 }}>
            Next Targets
          </div>
          <h3 style={{ fontFamily: brand.font.serif, fontSize: 30, fontWeight: 400, color: brand.colors.ink, lineHeight: 1.05, margin: 0 }}>
            The shortlist.
          </h3>
        </div>
        <Link
          href="/followed"
          style={{
            fontFamily: brand.font.sans,
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: brand.colors.gold,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          View Followed →
        </Link>
      </div>

      {nextTargetWatches.length > 0 ? (
        <div style={{ display: 'grid', gap: 12 }}>
          {nextTargetWatches.map(({ watch }) => (
            <div
              key={watch.id}
              style={{
                border: `1px solid ${brand.colors.borderMid}`,
                borderRadius: brand.radius.lg,
                padding: '14px 16px',
                background: brand.colors.slot,
              }}
            >
              <div style={{ fontFamily: brand.font.sans, fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: brand.colors.gold, marginBottom: 4 }}>
                {watch.brand}
              </div>
              <div style={{ fontFamily: brand.font.serif, fontSize: 22, color: brand.colors.ink, lineHeight: 1.05, marginBottom: 4 }}>
                {watch.model}
              </div>
              <div style={{ fontFamily: brand.font.sans, fontSize: 11, color: brand.colors.muted, marginBottom: 10 }}>
                Ref. {watch.reference}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: brand.font.serif, fontSize: 22, color: brand.colors.ink }}>
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(watch.estimatedValue)}
                </span>
                <a
                  href={marketHref(watch)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontFamily: brand.font.sans,
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: brand.colors.gold,
                    textDecoration: 'none',
                  }}
                >
                  Track Listings ↗
                </a>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p style={emptyCopyStyle()}>
          You have {followedCount} followed {followedCount === 1 ? 'watch' : 'watches'}, but no Next Targets yet. Promote up to three from Followed Watches when you want a tighter acquisition plan.
        </p>
      )}
    </section>
  )
}
