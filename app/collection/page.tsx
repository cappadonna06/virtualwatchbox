'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ResolvedOwnedWatch } from '@/types/watch'
import CollectionHeader from '@/components/collection/CollectionHeader'
import CollectionStats from '@/components/collection/CollectionStats'
import StrapDrawerSummary from '@/components/collection/StrapDrawerSummary'
import SortDropdown from '@/components/collection/SortDropdown'
import CollectionPhotoView from '@/components/collection/CollectionPhotoView'
import CollectionEmptyState from '@/components/collection/CollectionEmptyState'
import CollectionWatchboxSurface from '@/components/collection/CollectionWatchboxSurface'
import SyncRibbon from '@/components/collection/SyncRibbon'
import EditWatchModal from '@/components/collection/EditWatchModal'
import ResponsiveSidebarSheet from '@/components/collection/ResponsiveSidebarSheet'
import ShareBoxModal, { type ShareFlags } from '@/components/collection/ShareBoxModal'
import UnsavedChangesBar, { type DraftChange } from '@/components/collection/UnsavedChangesBar'
import ViewSwitcher from '@/components/collection/ViewSwitcher'
import WatchCard from '@/components/collection/WatchCard'
import WatchSidebar from '@/components/collection/WatchSidebar'
import WatchboxHeader from '@/components/collection/WatchboxHeader'
import { useAuth } from '@/lib/auth/AuthProvider'
import {
  buildAbsoluteProfileDemoUrl,
  buildBoxShareUrl,
  copyProfileDemoUrl,
  getCollectionBoxSlug,
  getProfileDemoState,
} from '@/lib/profileDemo'
import { useCollectionSession } from './CollectionSessionProvider'
import { brand } from '@/lib/brand'

type View = 'watchbox' | 'cards' | 'photo'
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
  const { user } = useAuth()
  const {
    collectionWatches,
    selectedWatchId,
    setSelectedWatchId,
    removeFromCollection,
    updateCollectionWatch,
    swapCollectionSlots,
    showToast,
    watchboxPhotoUrl,
    watchboxPhotoCrop,
    setWatchboxPhoto,
    watchboxConfig,
    straps,
  } = useCollectionSession()

  const [activeView, setActiveView] = useState<View>('watchbox')
  const [sortBy, setSortBy] = useState<SortMode>('manual')
  const [deleteTarget, setDeleteTarget] = useState<ResolvedOwnedWatch | null>(null)
  const [editTarget, setEditTarget] = useState<ResolvedOwnedWatch | null>(null)
  const [screenWidth, setScreenWidth] = useState(0)
  const [mobileStatsOpen, setMobileStatsOpen] = useState(true)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [collectionConfigOpen, setCollectionConfigOpen] = useState(false)
  const [displayName, setDisplayName] = useState<string>('')

  useEffect(() => {
    setDisplayName(getProfileDemoState().displayName ?? '')
  }, [shareModalOpen])

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

  function handleReorder(fromSlot: number, toSlot: number) {
    swapCollectionSlots(fromSlot, toSlot)
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
      className="collection-page-section"
      style={{ padding: '0 0 120px', borderTop: `1px solid ${brand.colors.border}` }}
    >
      <div style={{ padding: isMobile ? '24px 16px 0' : '56px 56px 0' }}>
        {isMobile ? (
          <WatchboxHeader
            title="My Collection"
            subtitle="Your collection, wherever you go."
            summary={
              collectionWatches.length === 0
                ? 'A virtual home for what you wear, what you want, and what’s next.'
                : `${collectionWatches.length} ${collectionWatches.length === 1 ? 'watch' : 'watches'} · ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalEstimatedValue)} est. value`
            }
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
                label: 'Customize Watchbox',
                onSelect: () => setCollectionConfigOpen(true),
              },
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
              watchCount={collectionWatches.length}
              totalEstValue={totalEstimatedValue}
              strapCount={straps.length}
              pendingChangesCount={0}
              onAddWatch={() => router.push('/collection/add')}
              onJumpStats={() => document.getElementById('collection-stats')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            />

            <div
              className="collection-toolbar-row"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                marginBottom: 20,
                flexWrap: 'wrap',
                paddingRight: isMobile ? 0 : 332,
              }}
            >
              <ViewSwitcher activeView={activeView} setActiveView={setActiveView} />
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              {activeView === 'cards' ? (
                <SortDropdown
                  value={sortBy}
                  options={SORT_OPTIONS}
                  onChange={value => setSortBy(value as SortMode)}
                />
              ) : null}
              <button
                onClick={() => setShareModalOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  fontFamily: brand.font.sans,
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  padding: '7px 14px',
                  background: brand.colors.white,
                  color: brand.colors.muted,
                  border: `1px solid ${brand.colors.border}`,
                  borderRadius: brand.radius.sm,
                  cursor: 'pointer',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M10.5 5V2.5h-2.5" />
                  <line x1="10.5" y1="2.5" x2="6" y2="7" />
                  <path d="M10.5 8.5v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-5.5a1 1 0 0 1 1-1H6" />
                </svg>
                Share Box
              </button>
              </div>
            </div>
          </>
        )}
      </div>

      <div style={{ padding: `0 ${isMobile ? 10 : 56}px` }}>
        {activeView === 'watchbox' ? (
          <>
            <SyncRibbon />
            <CollectionWatchboxSurface
              watches={collectionWatches}
              onEmptySlotClick={slot => router.push(`/collection/add?slot=${slot}`)}
              onReorder={handleReorder}
              configOpen={collectionConfigOpen}
              onConfigOpenChange={setCollectionConfigOpen}
            />
            {collectionWatches.length === 0 ? (
              <CollectionEmptyState variant="collection" />
            ) : null}
          </>
        ) : activeView === 'photo' ? (
          <CollectionPhotoView
            photoUrl={watchboxPhotoUrl}
            photoCrop={watchboxPhotoCrop}
            onPhotoChange={setWatchboxPhoto}
            isSignedIn={Boolean(user)}
            screenWidth={screenWidth}
          />
        ) : (
          <CardsView
            watches={displayWatches}
            activeWatch={activeWatch}
            activeSlot={activeSlot >= 0 ? activeSlot : null}
            onCardSelect={handleCardSelect}
            onCloseSidebar={() => setSelectedWatchId(null)}
            onRequestDelete={watch => setDeleteTarget(watch)}
            onRequestEdit={watch => setEditTarget(watch)}
          />
        )}
        {collectionWatches.length > 0 ? (
          <div style={{ marginTop: isMobile ? 48 : 64, paddingTop: isMobile ? 28 : 40, borderTop: `1px solid ${brand.colors.border}` }}>
            <StrapDrawerSummary />
          </div>
        ) : null}

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
            <CollectionStats watches={collectionWatches} />
          </div>
        )}
      </div>

      {(() => {
        const handle = (displayName.trim() || user?.email?.split('@')[0] || 'collector')
        const brandCount = new Set(collectionWatches.map(w => w.brand).filter(Boolean)).size
        const data = {
          handle,
          watchCount: collectionWatches.length,
          totalValue: totalEstimatedValue,
          brandCount,
          slotCount: watchboxConfig.slotCount,
          // Sparse image array: index = slot, null at empty slots. Keeps the
          // OG image and share URL preview rendering gaps the same way the
          // owner sees them.
          watchImageUrls: Array.from({ length: watchboxConfig.slotCount }, (_, i) => {
            const w = collectionWatches.find(x => x.slot === i)
            return w?.imageUrl ?? null
          }),
        }
        const buildShareUrl = (flags: ShareFlags) =>
          buildAbsoluteProfileDemoUrl(buildBoxShareUrl(getCollectionBoxSlug(), 'collection', data, flags))
        return (
          <ShareBoxModal
            open={shareModalOpen}
            onClose={() => setShareModalOpen(false)}
            watches={collectionWatches.map(w => ({ id: w.id, brand: w.brand, model: w.model, imageUrl: w.imageUrl ?? null, estimatedValue: w.estimatedValue }))}
            totalValue={totalEstimatedValue}
            handle={handle}
            shareUrl={buildShareUrl({ showCount: true, showValue: true, showBrands: true })}
            buildShareUrl={buildShareUrl}
            slotCount={watchboxConfig.slotCount}
          />
        )
      })()}

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

      {editTarget && (
        <EditWatchModal
          watch={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={updates => {
            updateCollectionWatch(editTarget.id, updates)
            setEditTarget(null)
            showToast('Watch details updated.')
          }}
        />
      )}
    </div>
  )
}

function CardsView({
  watches,
  activeWatch,
  activeSlot,
  onCardSelect,
  onCloseSidebar,
  onRequestDelete,
  onRequestEdit,
}: {
  watches: ResolvedOwnedWatch[]
  activeWatch: ResolvedOwnedWatch | null
  activeSlot: number | null
  onCardSelect: (index: number) => void
  onCloseSidebar: () => void
  onRequestDelete: (watch: ResolvedOwnedWatch) => void
  onRequestEdit: (watch: ResolvedOwnedWatch) => void
}) {
  return (
    <>
      <div className="collection-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 32, alignItems: 'start' }}>
        <div>
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
            onRequestEdit={watch => onRequestEdit(watch as ResolvedOwnedWatch)}
          />
        </ResponsiveSidebarSheet>
      </div>
    </>
  )
}
