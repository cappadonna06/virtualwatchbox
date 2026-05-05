'use client'

import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { PlaygroundBox, PlaygroundBoxEntry, ResolvedWatch } from '@/types/watch'
import { FRAMES, LININGS, SLOT_COUNTS } from '@/lib/frameConfig'
import {
  copyProfileDemoUrl,
  getBoxSharePath,
  getPlaygroundBoxSlug,
  syncPublicProfileSnapshot,
} from '@/lib/profileDemo'
import { watches as catalogWatches } from '@/lib/watches'
import { createPlaygroundBox, normalizePlaygroundBoxes, resolvePlaygroundWatches, type ResolvedPlaygroundWatch } from '@/lib/playground'
import { SEEDED_PLAYGROUND_BOXES } from '@/lib/playgroundData'
import { PLAYGROUND_BOXES_STORAGE_KEY } from '@/lib/storageKeys'
import { getEffectiveSlotCount, getOverflowSummary, getWatchboxOverflow } from '@/lib/watchboxOverflow'
import WatchBox from '@/components/collection/WatchBox'
import ResponsiveSidebarSheet from '@/components/collection/ResponsiveSidebarSheet'
import WatchSidebar from '@/components/collection/WatchSidebar'
import SortDropdown from '@/components/collection/SortDropdown'
import ViewSwitcher from '@/components/collection/ViewSwitcher'
import WatchCard from '@/components/collection/WatchCard'
import CollectionStats from '@/components/collection/CollectionStats'
import WatchboxHeader from '@/components/collection/WatchboxHeader'
import { brand } from '@/lib/brand'

const WB_W_PAD = 64
const WB_H_PAD = 72
const WB_GAP = 6
const PV_W_PAD = 38
const PV_H_PAD = 45
const PV_GAP = 5
const ROWS = 2

const TAG_OPTIONS = [
  'Dream Box',
  'Under $10K',
  'Travel',
  'Dress',
  'GMT Only',
  'Vintage',
  'Color Study',
  'Upgrade Path',
  'Lottery Box',
]

// View is widened to share the My Collection type, but the playground only
// surfaces the watchbox/cards tabs via availableViews — 'photo' is never
// reached at runtime here.
type View = 'watchbox' | 'cards' | 'photo'
type SortMode = 'manual' | 'brand' | 'value' | 'type'
const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'manual', label: 'Watchbox' },
  { value: 'brand', label: 'Brand' },
  { value: 'value', label: 'Value' },
  { value: 'type', label: 'Type' },
]

function calcSlotPx(
  containerW: number,
  maxH: number,
  cols: number,
  wPad: number,
  hPad: number,
  gap: number,
): number {
  const slotFromW = (containerW - wPad - (cols - 1) * gap) / cols
  const slotFromH = (maxH - hPad) * 3 / (4 * ROWS)
  return Math.max(16, Math.min(slotFromW, slotFromH))
}

export default function PlaygroundPage() {
  return (
    <Suspense>
      <PlaygroundPageInner />
    </Suspense>
  )
}

function PlaygroundPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestedBoxId = searchParams.get('boxId')
  const requestedEntryId = searchParams.get('entryId')

  const [boxes, setBoxes] = useState<PlaygroundBox[]>(SEEDED_PLAYGROUND_BOXES)
  const [activeBoxId, setActiveBoxId] = useState<string>(SEEDED_PLAYGROUND_BOXES[0].id)
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null)
  const [activeView, setActiveView] = useState<View>('watchbox')
  const [sortBy, setSortBy] = useState<SortMode>('manual')
  const [newBoxModalOpen, setNewBoxModalOpen] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deleteEntryTarget, setDeleteEntryTarget] = useState<ResolvedPlaygroundWatch | null>(null)
  const [shareToast, setShareToast] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [editingNameValue, setEditingNameValue] = useState('')
  const [renameModalOpen, setRenameModalOpen] = useState(false)
  const [mobileStatsOpen, setMobileStatsOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [screenW, setScreenW] = useState(0)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PLAYGROUND_BOXES_STORAGE_KEY)
      const normalized = normalizePlaygroundBoxes(raw ? JSON.parse(raw) : null, SEEDED_PLAYGROUND_BOXES)
      setBoxes(normalized)

      const initialBoxId = normalized.some(box => box.id === requestedBoxId) ? requestedBoxId! : normalized[0]?.id
      setActiveBoxId(initialBoxId ?? SEEDED_PLAYGROUND_BOXES[0].id)

      if (requestedEntryId) setSelectedEntryId(requestedEntryId)
    } catch {
      setBoxes(SEEDED_PLAYGROUND_BOXES)
    } finally {
      setHydrated(true)
    }
  }, [requestedBoxId, requestedEntryId])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(PLAYGROUND_BOXES_STORAGE_KEY, JSON.stringify(boxes))
  }, [boxes, hydrated])

  useEffect(() => {
    if (!hydrated) return
    syncPublicProfileSnapshot({ playgroundBoxes: boxes })
  }, [boxes, hydrated])

  useLayoutEffect(() => {
    const update = () => setScreenW(window.innerWidth)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const activeBox = boxes.find(box => box.id === activeBoxId) ?? boxes[0]
  const boxOptions = useMemo(
    () => boxes.map(box => ({ value: box.id, label: `${box.name} · ${box.entries.length}` })),
    [boxes],
  )
  const resolvedEntries = useMemo(
    () => resolvePlaygroundWatches(activeBox?.entries ?? [], catalogWatches),
    [activeBox],
  )
  const sortedEntries = useMemo(() => {
    if (sortBy === 'manual') return resolvedEntries
    const sorted = [...resolvedEntries]
    if (sortBy === 'brand') sorted.sort((a, b) => a.displayWatch.brand.localeCompare(b.displayWatch.brand))
    else if (sortBy === 'value') sorted.sort((a, b) => b.displayWatch.estimatedValue - a.displayWatch.estimatedValue)
    else if (sortBy === 'type') sorted.sort((a, b) => a.displayWatch.watchType.localeCompare(b.displayWatch.watchType))
    return sorted
  }, [resolvedEntries, sortBy])
  const displayWatches = sortedEntries.map(item => item.displayWatch)
  const selectedItem = sortedEntries.find(item => item.entry.id === selectedEntryId) ?? null
  const activeSlot = selectedEntryId
    ? sortedEntries.findIndex(item => item.entry.id === selectedEntryId)
    : -1

  const sc = SLOT_COUNTS.find(slot => slot.n === (activeBox?.slotCount ?? 6)) ?? SLOT_COUNTS[1]
  const overflowSummary = getOverflowSummary(
    sc.n,
    getWatchboxOverflow(displayWatches, sc.n).overflowCount,
  )
  const isMobile = screenW > 0 && screenW < 768
  const watchboxContainerW = isMobile ? screenW - 40 : Math.max(200, screenW - 444)
  const watchboxMaxH = isMobile ? 300 : 480
  const watchboxSlotPx = screenW > 0
    ? Math.floor(calcSlotPx(watchboxContainerW, watchboxMaxH, sc.cols, WB_W_PAD, WB_H_PAD, WB_GAP))
    : undefined
  const watchboxMaxW = watchboxSlotPx !== undefined
    ? WB_W_PAD + (sc.cols - 1) * WB_GAP + sc.cols * watchboxSlotPx
    : undefined

  function updateActiveBox(mutator: (box: PlaygroundBox) => PlaygroundBox) {
    setBoxes(prev => prev.map(box => (box.id === activeBoxId ? mutator(box) : box)))
  }

  function handleSlotClick(index: number) {
    const item = sortedEntries[index]
    if (!item) return
    setSelectedEntryId(prev => (prev === item.entry.id ? null : item.entry.id))
  }

  function handleCardSelect(index: number) {
    const item = sortedEntries[index]
    if (!item) return
    setSelectedEntryId(prev => (prev === item.entry.id ? null : item.entry.id))
  }

  function reorderBoxEntries(boxId: string, newEntries: PlaygroundBoxEntry[]) {
    setBoxes(prev => prev.map(box => box.id === boxId ? { ...box, entries: newEntries } : box))
  }

  async function handleShareBox() {
    if (!activeBox) return

    await copyProfileDemoUrl(
      getBoxSharePath(getPlaygroundBoxSlug(activeBox)),
    )
    setShareToast(true)
    setTimeout(() => setShareToast(false), 2500)
  }

  function handleRenameBox(newName: string) {
    updateActiveBox(box => ({ ...box, name: newName.trim() || box.name }))
    setEditingName(false)
    setRenameModalOpen(false)
  }

  function handleCreateBox(name: string, tags: string[]) {
    const newBox: PlaygroundBox = createPlaygroundBox({ name, tags, entries: [] })
    setBoxes(prev => [...prev, newBox])
    setActiveBoxId(newBox.id)
    setSelectedEntryId(null)
    setActiveView('watchbox')
    setNewBoxModalOpen(false)
  }

  function handleDeleteBox() {
    if (!deleteConfirmId) return
    const remaining = boxes.filter(box => box.id !== deleteConfirmId)
    setBoxes(remaining.length > 0 ? remaining : SEEDED_PLAYGROUND_BOXES)
    const next = remaining[0] ?? SEEDED_PLAYGROUND_BOXES[0]
    setActiveBoxId(next.id)
    setSelectedEntryId(null)
    setDeleteConfirmId(null)
  }

  function handleDeleteEntry() {
    if (!deleteEntryTarget) return
    updateActiveBox(box => ({
      ...box,
      entries: box.entries.filter(entry => entry.id !== deleteEntryTarget.entry.id),
    }))
    setSelectedEntryId(null)
    setDeleteEntryTarget(null)
  }

  function handleBoxConfigChange(field: 'frame' | 'lining' | 'slotCount', value: string | number) {
    updateActiveBox(box => ({
      ...box,
      [field]: value,
    }))
  }

  useEffect(() => {
    if (!activeBox) return
    const effective = getEffectiveSlotCount(activeBox.slotCount, displayWatches.length)
    if (effective !== activeBox.slotCount) {
      updateActiveBox(box => ({ ...box, slotCount: effective }))
    }
  }, [activeBox, displayWatches.length])

  function startEditing() {
    setEditingNameValue(activeBox?.name ?? '')
    setEditingName(true)
    setTimeout(() => nameInputRef.current?.focus(), 0)
  }

  function openRenameModal() {
    setEditingNameValue(activeBox?.name ?? '')
    setRenameModalOpen(true)
  }

  function switchBox(id: string) {
    setActiveBoxId(id)
    setSelectedEntryId(null)
    setEditingName(false)
    setRenameModalOpen(false)
    setDeleteConfirmId(null)
    setDeleteEntryTarget(null)
    setSortBy('manual')
  }

  return (
    <div
      className="collection-section"
      style={{ padding: '0 0 120px', borderTop: `1px solid ${brand.colors.border}` }}
    >
      {isMobile ? (
        <div style={{ padding: '28px 20px 0' }}>
          <WatchboxHeader
            title="Playground"
            subtitle="Build your dream collection. No limits."
            selector={{
              value: activeBoxId,
              options: boxOptions,
              onChange: switchBox,
            }}
            summary={activeBox?.tags.length ? activeBox.tags.join(' · ') : undefined}
            activeView={activeView}
            onViewChange={setActiveView}
            availableViews={['watchbox', 'cards']}
            menuItems={[
              {
                label: 'New Box',
                onSelect: () => setNewBoxModalOpen(true),
              },
              {
                label: 'Rename Box',
                onSelect: openRenameModal,
              },
              {
                label: mobileStatsOpen ? 'Hide Box Stats' : 'Show Box Stats',
                onSelect: () => setMobileStatsOpen(open => !open),
              },
              {
                label: 'Share Box',
                onSelect: () => {
                  void handleShareBox()
                },
              },
              ...(boxes.length > 1 ? [{
                label: 'Delete Box',
                onSelect: () => setDeleteConfirmId(activeBoxId),
                destructive: true,
              }] : []),
            ]}
          />
        </div>
      ) : (
        <>
          <div style={{ padding: '56px 56px 0' }}>
            <h1 style={{ fontFamily: brand.font.serif, fontSize: 36, fontWeight: 400, color: brand.colors.ink, margin: 0, lineHeight: 1.1 }}>
              Playground
            </h1>
            <p style={{ fontFamily: brand.font.sans, fontSize: 13, color: brand.colors.muted, marginTop: 4, marginBottom: 0 }}>
              Build your dream collection. No limits.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 6, padding: '20px 56px 0', overflowX: 'auto', borderBottom: `1px solid ${brand.colors.border}` }}>
            {boxes.map(box => {
              const isActive = box.id === activeBoxId
              return (
                <button
                  key={box.id}
                  onClick={() => switchBox(box.id)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px 8px 0 0',
                    fontFamily: brand.font.sans,
                    fontSize: 12,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    border: isActive ? `1px solid ${brand.colors.border}` : '1px solid transparent',
                    borderBottom: isActive ? `1px solid ${brand.colors.bg}` : '1px solid transparent',
                    background: isActive ? brand.colors.bg : 'transparent',
                    color: isActive ? brand.colors.ink : brand.colors.muted,
                    fontWeight: isActive ? 500 : 400,
                    transition: 'all 0.15s',
                  }}
                >
                  {box.name} · {box.entries.length}
                </button>
              )
            })}
            <button
              onClick={() => setNewBoxModalOpen(true)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px 8px 0 0',
                fontFamily: brand.font.sans,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                border: '1px solid transparent',
                background: 'transparent',
                color: brand.colors.gold,
                transition: 'all 0.15s',
              }}
            >
              +
            </button>
          </div>
        </>
      )}

      <div style={{ padding: `${isMobile ? 24 : 24}px ${isMobile ? 20 : 32}px 32px` }}>
        {!isMobile ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, gap: 20, flexWrap: 'wrap' }}>
          <div>
            {editingName ? (
              <input
                ref={nameInputRef}
                value={editingNameValue}
                onChange={e => setEditingNameValue(e.target.value)}
                onBlur={() => handleRenameBox(editingNameValue)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleRenameBox(editingNameValue)
                  if (e.key === 'Escape') setEditingName(false)
                }}
                style={{
                  fontFamily: 'var(--font-cormorant)',
                  fontSize: 24,
                  color: '#1A1410',
                  border: 'none',
                  borderBottom: '1.5px solid #C9A84C',
                  background: 'transparent',
                  outline: 'none',
                  minWidth: 180,
                }}
              />
            ) : (
              <div
                onClick={startEditing}
                style={{ fontFamily: 'var(--font-cormorant)', fontSize: 24, color: '#1A1410', cursor: 'text', display: 'inline-block' }}
              >
                {activeBox?.name}
              </div>
            )}

            {activeBox && activeBox.tags.length > 0 && (
              <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                {activeBox.tags.map(tag => (
                  <span
                    key={tag}
                    style={{
                      fontSize: 9,
                      padding: '2px 8px',
                      borderRadius: 20,
                      border: '1px solid #EAE5DC',
                      color: '#A89880',
                      fontFamily: 'var(--font-dm-sans)',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, paddingTop: 4 }}>
            <button
              onClick={handleShareBox}
              style={{
                fontSize: 10,
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid #EAE5DC',
                color: '#A89880',
                background: 'transparent',
                cursor: 'pointer',
                fontFamily: 'var(--font-dm-sans)',
              }}
            >
              Share Box
            </button>

            {boxes.length > 1 && deleteConfirmId !== activeBoxId && (
              <button
                onClick={() => setDeleteConfirmId(activeBoxId)}
                style={{
                  fontSize: 10,
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: '1px solid #EAE5DC',
                  color: '#C4A882',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-dm-sans)',
                }}
              >
                Delete Box
              </button>
            )}

            {deleteConfirmId === activeBoxId && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 11, color: '#A89880' }}>
                  Delete this box?
                </span>
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  style={{
                    fontSize: 10,
                    padding: '4px 10px',
                    borderRadius: 5,
                    border: '1px solid #EAE5DC',
                    color: '#A89880',
                    background: 'transparent',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-dm-sans)',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteBox}
                  style={{
                    fontSize: 10,
                    padding: '4px 10px',
                    borderRadius: 5,
                    border: 'none',
                    color: '#FAF8F4',
                    background: '#1A1410',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-dm-sans)',
                  }}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
          </div>
        ) : null}

        {!isMobile ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
          <ViewSwitcher activeView={activeView} setActiveView={setActiveView} availableViews={['watchbox', 'cards']} />
          <a
            href="#playground-stats"
            style={{
              fontFamily: 'var(--font-dm-sans)',
              fontSize: 11,
              color: '#A89880',
              textDecoration: 'none',
              letterSpacing: '0.04em',
            }}
          >
            Stats ↓
          </a>
          </div>
        ) : null}

        <div
          className="collection-grid"
          style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 32, alignItems: 'start' }}
        >
          <div>
            {activeView === 'watchbox' ? (
              <WatchboxView
                box={activeBox}
                watches={displayWatches}
                activeSlot={activeSlot >= 0 ? activeSlot : null}
                onSlotClick={handleSlotClick}
                watchboxSlotPx={watchboxSlotPx}
                watchboxMaxW={watchboxMaxW}
                screenW={screenW}
                onEmptySlotClick={() => router.push(`/collection/add?dest=playground&boxId=${activeBoxId}`)}
                onFrameChange={value => handleBoxConfigChange('frame', value)}
                onLiningChange={value => handleBoxConfigChange('lining', value)}
                onSlotCountChange={value => handleBoxConfigChange('slotCount', value)}
                overflowSummary={overflowSummary}
                onReorder={sortBy === 'manual' ? (from, to) => {
                  const entries = [...(activeBox?.entries ?? [])]
                  ;[entries[from], entries[to]] = [entries[to], entries[from]]
                  reorderBoxEntries(activeBoxId, entries)
                } : undefined}
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
          </div>

          <ResponsiveSidebarSheet active={Boolean(selectedItem)} onClose={() => setSelectedEntryId(null)}>
            <WatchSidebar
              watch={selectedItem?.displayWatch ?? null}
              sticky={false}
              catalogWatchId={selectedItem?.sourceWatch.id ?? null}
              mode="playground"
              onRequestDelete={() => setDeleteEntryTarget(selectedItem)}
              onRequestEdit={() => {
                if (!selectedItem) return
                router.push(`/playground/edit/${activeBoxId}/${selectedItem.entry.id}`)
              }}
            />
          </ResponsiveSidebarSheet>
        </div>
      </div>

      {isMobile && !mobileStatsOpen ? null : (
      <div id="playground-stats" style={{ marginTop: isMobile ? 56 : 72, padding: `${isMobile ? 28 : 48}px 32px 0`, borderTop: `1px solid ${brand.colors.border}` }}>
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
            Box Stats
          </h2>
          <p style={{ fontFamily: brand.font.sans, fontSize: 13, color: brand.colors.muted, margin: 0 }}>
            A market-only breakdown of this playground box.
          </p>
        </div>
        <CollectionStats watches={displayWatches} mode="playground" />
      </div>
      )}

      {newBoxModalOpen && (
        <NewBoxModal
          onClose={() => setNewBoxModalOpen(false)}
          onCreate={handleCreateBox}
        />
      )}

      {renameModalOpen ? (
        <RenameBoxModal
          value={editingNameValue}
          onChange={setEditingNameValue}
          onClose={() => setRenameModalOpen(false)}
          onSubmit={() => handleRenameBox(editingNameValue)}
        />
      ) : null}

      {isMobile && deleteConfirmId === activeBoxId ? (
        <DeleteBoxConfirmModal
          onClose={() => setDeleteConfirmId(null)}
          onConfirm={handleDeleteBox}
        />
      ) : null}

      {shareToast && (
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
            zIndex: 300,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          Link copied to clipboard
        </div>
      )}

      {deleteEntryTarget && (
        <>
          <div
            onClick={() => setDeleteEntryTarget(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(26,20,16,0.45)', zIndex: 210, backdropFilter: 'blur(2px)' }}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '90vw',
              maxWidth: 420,
              background: '#FFFFFF',
              border: '1px solid #EAE5DC',
              borderRadius: 12,
              boxShadow: '0 20px 60px rgba(26,20,16,0.2)',
              zIndex: 211,
              padding: 18,
            }}
          >
            <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A89880', marginBottom: 6 }}>
              Remove Watch
            </div>
            <div style={{ fontFamily: 'var(--font-cormorant)', fontSize: 28, color: '#1A1410', lineHeight: 1.1, marginBottom: 8 }}>
              Delete from Playground?
            </div>
            <p style={{ margin: '0 0 16px', fontFamily: 'var(--font-dm-sans)', fontSize: 12, color: '#A89880', lineHeight: 1.5 }}>
              {deleteEntryTarget.displayWatch.brand} {deleteEntryTarget.displayWatch.model} will be removed from this box.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
                onClick={() => setDeleteEntryTarget(null)}
                style={{
                  fontFamily: 'var(--font-dm-sans)',
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  padding: '9px 12px',
                  background: 'transparent',
                  color: '#1A1410',
                  border: '1px solid #D4CBBF',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteEntry}
                style={{
                  fontFamily: 'var(--font-dm-sans)',
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  padding: '9px 12px',
                  background: '#1A1410',
                  color: '#FAF8F4',
                  border: 'none',
                  borderRadius: 6,
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

function RenameBoxModal({
  value,
  onChange,
  onClose,
  onSubmit,
}: {
  value: string
  onChange: (value: string) => void
  onClose: () => void
  onSubmit: () => void
}) {
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(26,20,16,0.4)',
          backdropFilter: 'blur(2px)',
          zIndex: 200,
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: brand.colors.bg,
          borderRadius: brand.radius.xl,
          padding: 28,
          width: 380,
          maxWidth: '90vw',
          boxShadow: brand.shadow.xl,
          zIndex: 201,
        }}
      >
        <div style={{ fontFamily: brand.font.serif, fontSize: 22, color: brand.colors.ink, marginBottom: 20 }}>
          Rename Box
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: brand.colors.muted, fontFamily: brand.font.sans, marginBottom: 8 }}>
            Box Name
          </div>
          <input
            value={value}
            onChange={event => onChange(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter' && value.trim()) onSubmit()
            }}
            autoFocus
            style={{
              width: '100%',
              padding: '9px 12px',
              border: `1px solid ${brand.colors.borderLight}`,
              borderRadius: brand.radius.sm,
              fontFamily: brand.font.sans,
              fontSize: 13,
              color: brand.colors.ink,
              background: brand.colors.white,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button
            onClick={onClose}
            style={{
              fontFamily: brand.font.sans,
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              padding: '10px 12px',
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
            onClick={onSubmit}
            disabled={!value.trim()}
            style={{
              fontFamily: brand.font.sans,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              padding: '10px 12px',
              background: value.trim() ? brand.colors.ink : brand.colors.borderLight,
              color: brand.colors.bg,
              border: 'none',
              borderRadius: brand.radius.sm,
              cursor: value.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            Save
          </button>
        </div>
      </div>
    </>
  )
}

function DeleteBoxConfirmModal({
  onClose,
  onConfirm,
}: {
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(26,20,16,0.45)',
          backdropFilter: 'blur(2px)',
          zIndex: 210,
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
          Delete Box
        </div>
        <div style={{ fontFamily: brand.font.serif, fontSize: 28, color: brand.colors.ink, lineHeight: 1.1, marginBottom: 8 }}>
          Remove this box?
        </div>
        <p style={{ margin: '0 0 16px', fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.muted, lineHeight: 1.5 }}>
          This removes the current playground box and its watch list.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button
            onClick={onClose}
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
            onClick={onConfirm}
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
  )
}

interface WatchboxViewProps {
  box: PlaygroundBox
  watches: ResolvedWatch[]
  activeSlot: number | null
  onSlotClick: (index: number) => void
  watchboxSlotPx: number | undefined
  watchboxMaxW: number | undefined
  screenW: number
  onEmptySlotClick: () => void
  onFrameChange: (value: string) => void
  onLiningChange: (value: string) => void
  onSlotCountChange: (value: number) => void
  overflowSummary: string | null
  onReorder?: (from: number, to: number) => void
}

function WatchboxView({
  box,
  watches,
  activeSlot,
  onSlotClick,
  watchboxSlotPx,
  watchboxMaxW,
  screenW,
  onEmptySlotClick,
  onFrameChange,
  onLiningChange,
  onSlotCountChange,
  overflowSummary,
  onReorder,
}: WatchboxViewProps) {
  const [customizerOpen, setCustomizerOpen] = useState(false)
  const [configOpen, setConfigOpen] = useState(false)

  const fr = FRAMES.find(frame => frame.id === box.frame) ?? FRAMES[0]
  const ln = LININGS.find(lining => lining.id === box.lining) ?? LININGS[0]
  const sc = SLOT_COUNTS.find(slot => slot.n === box.slotCount) ?? SLOT_COUNTS[1]

  const previewContainerW = Math.min(screenW > 0 ? screenW - 40 : 320, 400)
  const previewSlotPx = Math.floor(calcSlotPx(previewContainerW, 140, sc.cols, PV_W_PAD, PV_H_PAD, PV_GAP))
  const previewMaxW = PV_W_PAD + (sc.cols - 1) * PV_GAP + sc.cols * previewSlotPx

  return (
    <div>
      <div
        style={{
          position: 'relative',
          paddingTop: 12,
          ...(watchboxMaxW !== undefined ? { maxWidth: watchboxMaxW, width: '100%', margin: '0 auto' } : {}),
        }}
      >
        <WatchBox
          watches={watches}
          activeSlot={activeSlot}
          onSlotClick={onSlotClick}
          onEmptySlotClick={onEmptySlotClick}
          onReorder={onReorder}
          frame={box.frame}
          lining={box.lining}
          slotCount={box.slotCount}
          slotWidth={watchboxSlotPx}
          mode="playground"
        />

        <div className="configurator-wrap" style={{ marginTop: 10, position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 10, color: '#A89880' }}>
              {fr.label} · {ln.label} · {sc.n} slots
              {overflowSummary ? ` · ${overflowSummary}` : ''}
            </span>
            <button
              onClick={() => setCustomizerOpen(value => !value)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontFamily: 'var(--font-dm-sans)',
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: '0.06em',
                padding: '5px 12px',
                background: '#FFFFFF',
                color: '#A89880',
                border: '1px solid #EAE5DC',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                <path d="M1 9.5V11h1.5l4.42-4.42-1.5-1.5L1 9.5zm7.07-5.07c.2-.2.2-.51 0-.71L6.99 2.64a.5.5 0 00-.71 0L5.13 3.79l1.5 1.5 1.44-1.44z" fill="#A89880" />
              </svg>
              Customize Watchbox
            </button>
          </div>

          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              zIndex: 20,
              marginTop: 4,
              border: '1px solid #EAE5DC',
              borderRadius: 8,
              background: '#FFFFFF',
              boxShadow: '0 4px 20px rgba(26,20,16,0.1)',
              overflow: 'hidden',
              opacity: customizerOpen ? 1 : 0,
              transform: customizerOpen ? 'translateY(0) scale(1)' : 'translateY(-4px) scale(0.98)',
              transformOrigin: 'top right',
              pointerEvents: customizerOpen ? 'auto' : 'none',
              transition: 'opacity 0.18s ease, transform 0.18s ease',
            }}
          >
            <div style={{ padding: '9px 12px', borderBottom: '1px solid #F0EBE3', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A89880', flexShrink: 0, width: 48 }}>
                Slots
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                {SLOT_COUNTS.map(slot => (
                  <button
                    key={slot.n}
                    onClick={() => onSlotCountChange(slot.n)}
                    style={{
                      fontFamily: 'var(--font-dm-sans)',
                      fontSize: 10,
                      fontWeight: 500,
                      padding: '3px 9px',
                      borderRadius: 4,
                      border: box.slotCount === slot.n ? '1px solid #C9A84C' : '1px solid #E0DAD0',
                      background: box.slotCount === slot.n ? 'rgba(201,168,76,0.06)' : 'transparent',
                      color: box.slotCount === slot.n ? '#C9A84C' : '#A89880',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {slot.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ padding: '9px 12px', borderBottom: '1px solid #F0EBE3', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A89880', flexShrink: 0, width: 48 }}>
                Frame
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 24px)', gap: 7 }}>
                {FRAMES.map(frame => (
                  <div key={frame.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div
                      onClick={() => onFrameChange(frame.id)}
                      title={frame.label}
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: frame.swatchColor,
                        cursor: 'pointer',
                        border: box.frame === frame.id ? '2px solid #C9A84C' : '2px solid transparent',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                        transition: 'border-color 0.15s',
                      }}
                    />
                    <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 8, color: box.frame === frame.id ? '#1A1410' : '#A89880', fontWeight: box.frame === frame.id ? 700 : 400, textAlign: 'center', marginTop: 6 }}>
                      {frame.label.split(' ')[0]}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A89880', flexShrink: 0, width: 48 }}>
                Lining
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 24px)', gap: 7 }}>
                {LININGS.map(lining => (
                  <div key={lining.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div
                      onClick={() => onLiningChange(lining.id)}
                      title={lining.label}
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: lining.color,
                        cursor: 'pointer',
                        border: box.lining === lining.id ? '2px solid #C9A84C' : lining.id === 'cream' ? '2px solid #e0dbd0' : '2px solid transparent',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                        transition: 'border-color 0.15s',
                      }}
                    />
                    <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 8, color: box.lining === lining.id ? '#1A1410' : '#A89880', fontWeight: box.lining === lining.id ? 700 : 400, textAlign: 'center', marginTop: 6 }}>
                      {lining.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <button
        className="edit-box-btn"
        onClick={() => setConfigOpen(true)}
        style={{
          display: 'none',
          margin: '14px auto 0',
          width: 'fit-content',
          fontFamily: 'var(--font-dm-sans)',
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          padding: '10px 20px',
          background: '#FFFFFF',
          color: '#A89880',
          border: '1px solid #E0DAD0',
          borderRadius: 8,
          cursor: 'pointer',
        }}
      >
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
          <path d="M1 9.5V11h1.5l4.42-4.42-1.5-1.5L1 9.5zm7.07-5.07c.2-.2.2-.51 0-.71L6.99 2.64a.5.5 0 00-.71 0L5.13 3.79l1.5 1.5 1.44-1.44z" fill="#A89880" />
        </svg>
        Customize Watchbox
      </button>

      {configOpen && (
        <div
          onClick={() => setConfigOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(26,20,16,0.45)', zIndex: 200, backdropFilter: 'blur(2px)' }}
        />
      )}

      {configOpen && (
        <div
          className="config-modal"
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 201,
            background: '#FAFAF8',
            borderRadius: '20px 20px 0 0',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E0DAD0' }} />
          </div>
          <div style={{ padding: '12px 20px 0', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A89880' }}>
                Customize Watchbox
              </span>
              <button
                onClick={() => setConfigOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A89880', fontSize: 18, lineHeight: 1, padding: 4 }}
              >
                ✕
              </button>
            </div>
          </div>
          <div style={{ padding: '0 20px 16px', flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: '100%', maxWidth: previewMaxW }}>
              <div style={{ borderRadius: 10, padding: '12px 12px 14px', background: fr.css, boxShadow: fr.shadow, transition: 'background 0.4s ease, box-shadow 0.4s ease' }}>
                <div style={{ background: ln.color, borderRadius: 5, padding: 7, boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)', transition: 'background 0.4s ease' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${sc.cols}, ${previewSlotPx}px)`, gap: PV_GAP }}>
                    {Array.from({ length: sc.n }).map((_, index) => (
                      <div key={index} style={{ width: previewSlotPx, height: Math.round(previewSlotPx * 4 / 3), borderRadius: 3, background: ln.slotBg, transition: 'background 0.4s ease' }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div style={{ padding: '0 20px 32px', background: '#FFFFFF', flexShrink: 0 }}>
            <div style={{ padding: '14px 0', borderBottom: '1px solid #F0EBE3' }}>
              <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A89880', marginBottom: 10 }}>
                Slots
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {SLOT_COUNTS.map(slot => (
                  <button
                    key={slot.n}
                    onClick={() => onSlotCountChange(slot.n)}
                    style={{
                      flex: 1,
                      fontFamily: 'var(--font-dm-sans)',
                      fontSize: 12,
                      fontWeight: 500,
                      padding: '8px 0',
                      borderRadius: 6,
                      border: box.slotCount === slot.n ? '1px solid #C9A84C' : '1px solid #E0DAD0',
                      background: box.slotCount === slot.n ? 'rgba(201,168,76,0.06)' : 'transparent',
                      color: box.slotCount === slot.n ? '#C9A84C' : '#A89880',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {slot.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ padding: '14px 0', borderBottom: '1px solid #F0EBE3' }}>
              <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A89880', marginBottom: 10 }}>
                Frame · <span style={{ color: '#1A1410', fontWeight: 600, textTransform: 'none', letterSpacing: 0, fontSize: 10 }}>{fr.label}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4 }}>
                {FRAMES.map(frame => (
                  <div key={frame.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, cursor: 'pointer' }} onClick={() => onFrameChange(frame.id)}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: frame.swatchColor, border: box.frame === frame.id ? '2.5px solid #C9A84C' : '2.5px solid transparent', outline: box.frame === frame.id ? '1.5px solid rgba(201,168,76,0.3)' : '1.5px solid transparent', outlineOffset: 2, boxShadow: '0 1px 4px rgba(0,0,0,0.18)', transition: 'border-color 0.15s, outline-color 0.15s' }} />
                    <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 9, color: box.frame === frame.id ? '#1A1410' : '#A89880', textAlign: 'center', letterSpacing: '0.02em', transition: 'color 0.15s' }}>{frame.label.split(' ')[0]}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ padding: '14px 0 0' }}>
              <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A89880', marginBottom: 10 }}>
                Lining · <span style={{ color: '#1A1410', fontWeight: 600, textTransform: 'none', letterSpacing: 0, fontSize: 10 }}>{ln.label}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4 }}>
                {LININGS.map(lining => (
                  <div key={lining.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, cursor: 'pointer' }} onClick={() => onLiningChange(lining.id)}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: lining.color, border: box.lining === lining.id ? '2.5px solid #C9A84C' : lining.id === 'cream' ? '2.5px solid #e0dbd0' : '2.5px solid transparent', outline: box.lining === lining.id ? '1.5px solid rgba(201,168,76,0.3)' : '1.5px solid transparent', outlineOffset: 2, boxShadow: '0 1px 4px rgba(0,0,0,0.18)', transition: 'border-color 0.15s, outline-color 0.15s' }} />
                    <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 9, color: box.lining === lining.id ? '#1A1410' : '#A89880', textAlign: 'center', letterSpacing: '0.02em', transition: 'color 0.15s' }}>{lining.label.split(' ')[0]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface CardsViewProps {
  watches: ResolvedWatch[]
  activeSlot: number | null
  onCardSelect: (index: number) => void
  sortBy: SortMode
  setSortBy: (v: SortMode) => void
}

function CardsView({
  watches,
  activeSlot,
  onCardSelect,
  sortBy,
  setSortBy,
}: CardsViewProps) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <SortDropdown
          value={sortBy}
          options={SORT_OPTIONS}
          onChange={value => setSortBy(value as SortMode)}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {watches.map((watch, index) => (
          <div key={watch.id}>
            <WatchCard
              watch={watch}
              mode="playground"
              stateSource="playground"
              isActive={activeSlot === index}
              onSelect={() => onCardSelect(index)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

interface NewBoxModalProps {
  onClose: () => void
  onCreate: (name: string, tags: string[]) => void
}

function NewBoxModal({ onClose, onCreate }: NewBoxModalProps) {
  const [name, setName] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  function toggleTag(tag: string) {
    setSelectedTags(prev => (prev.includes(tag) ? prev.filter(value => value !== tag) : [...prev, tag]))
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(26,20,16,0.4)',
          backdropFilter: 'blur(2px)',
          zIndex: 200,
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: '#FAF8F4',
          borderRadius: 12,
          padding: 28,
          width: 380,
          maxWidth: '90vw',
          boxShadow: '0 16px 60px rgba(26,20,16,0.18)',
          zIndex: 201,
        }}
      >
        <div style={{ fontFamily: 'var(--font-cormorant)', fontSize: 22, color: '#1A1410', marginBottom: 20 }}>
          New Playground Box
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A89880', fontFamily: 'var(--font-dm-sans)', marginBottom: 8 }}>
            Box Name
          </div>
          <input
            value={name}
            onChange={event => setName(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter' && name.trim()) onCreate(name, selectedTags)
            }}
            placeholder="e.g. Dream Collection, Travel Box..."
            autoFocus
            style={{
              width: '100%',
              padding: '9px 12px',
              border: '1px solid #E0DAD0',
              borderRadius: 6,
              fontFamily: 'var(--font-dm-sans)',
              fontSize: 13,
              color: '#1A1410',
              background: '#FFFFFF',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A89880', fontFamily: 'var(--font-dm-sans)', marginBottom: 8 }}>
            Tags (Optional)
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {TAG_OPTIONS.map(tag => {
              const active = selectedTags.includes(tag)
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  style={{
                    fontFamily: 'var(--font-dm-sans)',
                    fontSize: 10,
                    padding: '5px 10px',
                    borderRadius: 20,
                    border: active ? '1px solid #C9A84C' : '1px solid #E0DAD0',
                    background: active ? 'rgba(201,168,76,0.08)' : '#FFFFFF',
                    color: active ? '#C9A84C' : '#A89880',
                    cursor: 'pointer',
                  }}
                >
                  {tag}
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button
            onClick={onClose}
            style={{
              fontFamily: 'var(--font-dm-sans)',
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              padding: '10px 12px',
              background: 'transparent',
              color: '#1A1410',
              border: '1px solid #D4CBBF',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => name.trim() && onCreate(name, selectedTags)}
            disabled={!name.trim()}
            style={{
              fontFamily: 'var(--font-dm-sans)',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              padding: '10px 12px',
              background: name.trim() ? '#1A1410' : '#C8BFAF',
              color: '#FAF8F4',
              border: 'none',
              borderRadius: 6,
              cursor: name.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            Create Box
          </button>
        </div>
      </div>
    </>
  )
}
