'use client'

import { useState, useEffect, useLayoutEffect } from 'react'
import { watches } from '@/lib/watches'
import { FRAMES, LININGS, SLOT_COUNTS } from '@/lib/frameConfig'
import WatchBox from '@/components/collection/WatchBox'
import BoxConfigurator from '@/components/collection/BoxConfigurator'
import WatchSidebar from '@/components/collection/WatchSidebar'
import CollectionHeader from '@/components/collection/CollectionHeader'
import ViewSwitcher from '@/components/collection/ViewSwitcher'
import WatchCard from '@/components/collection/WatchCard'
import CollectionStats from '@/components/collection/CollectionStats'
import UnsavedChangesBar, { type DraftChange } from '@/components/collection/UnsavedChangesBar'

// Slot-px calculation constants (mirrors CollectionSection)
const WB_W_PAD = 64
const WB_H_PAD = 72
const WB_GAP   = 6
const ROWS      = 2

function calcSlotPx(containerW: number, maxH: number, cols: number, wPad: number, hPad: number, gap: number): number {
  const slotFromW = (containerW - wPad - (cols - 1) * gap) / cols
  const slotFromH = (maxH - hPad) * 3 / (4 * ROWS)
  return Math.max(16, Math.min(slotFromW, slotFromH))
}

type View = 'watchbox' | 'cards' | 'stats'

const totalEstValue = watches.reduce((s, w) => s + w.estimatedValue, 0)

export default function CollectionPage() {
  const [activeView, setActiveView]         = useState<View>('watchbox')
  const [activeSlot, setActiveSlot]         = useState<number | null>(null)
  const [frame, setFrame]                   = useState('light-oak')
  const [lining, setLining]                 = useState('cream')
  const [slotCount, setSlotCount]           = useState(6)
  const [screenW, setScreenW]               = useState(0)
  const [pendingChanges, setPendingChanges] = useState<DraftChange[]>([])

  useLayoutEffect(() => {
    const update = () => setScreenW(window.innerWidth)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // Restore saved box config from localStorage
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('watchbox-config') ?? 'null')
      if (!saved) return
      if (FRAMES.some(f => f.id === saved.frame)) setFrame(saved.frame)
      if (LININGS.some(l => l.id === saved.lining)) setLining(saved.lining)
      if (SLOT_COUNTS.some(s => s.n === saved.slotCount)) setSlotCount(saved.slotCount)
    } catch {}
  }, [])

  // Persist box config
  useEffect(() => {
    localStorage.setItem('watchbox-config', JSON.stringify({ frame, lining, slotCount }))
  }, [frame, lining, slotCount])

  function handleSlotClick(i: number) {
    setActiveSlot(prev => prev === i ? null : i)
  }

  function handleCardSelect(i: number) {
    setActiveSlot(prev => prev === i ? null : i)
  }

  function handleDraftChange(type: DraftChange['type'], label: string) {
    setPendingChanges(prev => [
      ...prev,
      { id: crypto.randomUUID(), type, label, timestamp: new Date().toISOString() },
    ])
  }

  const activeWatch = activeSlot !== null ? (watches[activeSlot] ?? null) : null
  const sc = SLOT_COUNTS.find(s => s.n === slotCount) ?? SLOT_COUNTS[1]

  const isMobile = screenW > 0 && screenW < 768
  const watchboxContainerW = isMobile ? screenW - 40 : Math.max(200, screenW - 444)
  const watchboxMaxH = isMobile ? 300 : 480
  const watchboxSlotPx = screenW > 0
    ? Math.floor(calcSlotPx(watchboxContainerW, watchboxMaxH, sc.cols, WB_W_PAD, WB_H_PAD, WB_GAP))
    : undefined
  const watchboxMaxW = watchboxSlotPx !== undefined
    ? WB_W_PAD + (sc.cols - 1) * WB_GAP + sc.cols * watchboxSlotPx
    : undefined

  return (
    <div
      className="collection-section"
      style={{ padding: '56px 56px 120px', borderTop: '1px solid #EAE5DC' }}
    >
      {/* Sidebar backdrop — mobile only */}
      <div
        className={`sidebar-backdrop ${activeWatch ? 'is-active' : ''}`}
        onClick={() => setActiveSlot(null)}
      />

      <CollectionHeader
        totalEstValue={totalEstValue}
        pendingChangesCount={pendingChanges.length}
      />

      <ViewSwitcher activeView={activeView} setActiveView={setActiveView} />

      {/* Main 2-col layout: content + sidebar */}
      <div
        className="collection-grid"
        style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 32, alignItems: 'start' }}
      >
        {/* Left column — view content */}
        <div>
          {activeView === 'watchbox' && (
            <WatchboxView
              frame={frame}
              setFrame={setFrame}
              lining={lining}
              setLining={setLining}
              slotCount={slotCount}
              setSlotCount={setSlotCount}
              activeSlot={activeSlot}
              onSlotClick={handleSlotClick}
              watchboxSlotPx={watchboxSlotPx}
              watchboxMaxW={watchboxMaxW}
              onSimulateChange={() => handleDraftChange('update_box', 'Simulated layout change')}
            />
          )}

          {activeView === 'cards' && (
            <CardsView
              activeSlot={activeSlot}
              onCardSelect={handleCardSelect}
            />
          )}

          {activeView === 'stats' && (
            <CollectionStats watches={watches} />
          )}
        </div>

        {/* Right column — persistent sidebar */}
        <div
          className={`sidebar-sheet ${activeWatch ? 'is-active' : ''}`}
        >
          <div
            className="sidebar-drag-pill"
            style={{ display: 'none', justifyContent: 'center', padding: '12px 0 4px' }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E0DAD0' }} />
          </div>
          <button
            className="sidebar-close-btn"
            onClick={() => setActiveSlot(null)}
            style={{
              display: 'none',
              position: 'absolute',
              top: 14,
              right: 16,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#A89880',
              fontSize: 18,
              lineHeight: 1,
              padding: 4,
            }}
          >
            ✕
          </button>
          <div className="sidebar-content">
            <WatchSidebar watch={activeWatch} />
          </div>
        </div>
      </div>

      {/* Unsaved changes bar — fixed bottom */}
      <UnsavedChangesBar
        pendingChanges={pendingChanges}
        onSave={() => setPendingChanges([])}
        onDiscard={() => setPendingChanges([])}
      />
    </div>
  )
}

// ─── Watchbox View ────────────────────────────────────────────────────────────

interface WatchboxViewProps {
  frame: string
  setFrame: (v: string) => void
  lining: string
  setLining: (v: string) => void
  slotCount: number
  setSlotCount: (v: number) => void
  activeSlot: number | null
  onSlotClick: (i: number) => void
  watchboxSlotPx: number | undefined
  watchboxMaxW: number | undefined
  onSimulateChange: () => void
}

function WatchboxView({
  frame, setFrame, lining, setLining, slotCount, setSlotCount,
  activeSlot, onSlotClick, watchboxSlotPx, watchboxMaxW, onSimulateChange,
}: WatchboxViewProps) {
  return (
    <div>
      {/* Slim toolbar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: 8,
          marginBottom: 4,
          flexWrap: 'wrap',
        }}
      >
        {/* Sort dropdown — UI only, Phase 2 wiring */}
        <select
          style={{
            fontFamily: 'var(--font-dm-sans)',
            fontSize: 11,
            color: '#A89880',
            border: '1px solid #E0DAD0',
            borderRadius: 4,
            padding: '5px 10px',
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

        {/* Edit Layout — TODO: wire up in Phase 2 */}
        <button
          style={{
            fontFamily: 'var(--font-dm-sans)',
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.06em',
            padding: '5px 12px',
            background: 'transparent',
            color: '#A89880',
            border: '1px solid #E0DAD0',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          Edit Layout
        </button>

        {/* TODO: remove before launch — dev testing only */}
        <button
          onClick={onSimulateChange}
          style={{
            fontFamily: 'var(--font-dm-sans)',
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.06em',
            padding: '5px 12px',
            background: 'transparent',
            color: '#C9A84C',
            border: '1px solid rgba(201,168,76,0.4)',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          Simulate Change
        </button>
      </div>

      {/* Box configurator — reused exactly as-is */}
      <BoxConfigurator
        frame={frame}
        setFrame={setFrame}
        lining={lining}
        setLining={setLining}
        slotCount={slotCount}
        setSlotCount={setSlotCount}
      />

      {/* Watch box */}
      <div
        style={
          watchboxMaxW !== undefined
            ? { maxWidth: watchboxMaxW, width: '100%', margin: '16px auto 0' }
            : { marginTop: 16 }
        }
      >
        <WatchBox
          activeSlot={activeSlot}
          onSlotClick={onSlotClick}
          frame={frame}
          lining={lining}
          slotCount={slotCount}
          slotWidth={watchboxSlotPx}
        />
      </div>

      <p
        style={{
          fontFamily: 'var(--font-dm-sans)',
          fontSize: 11,
          color: '#C8BFAF',
          marginTop: 10,
          letterSpacing: '0.04em',
        }}
      >
        Click any watch to view details · drag to rearrange
      </p>
    </div>
  )
}

// ─── Cards View ───────────────────────────────────────────────────────────────

interface CardsViewProps {
  activeSlot: number | null
  onCardSelect: (i: number) => void
}

function CardsView({ activeSlot, onCardSelect }: CardsViewProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {watches.map((watch, i) => (
        <WatchCard
          key={watch.id}
          watch={watch}
          isActive={activeSlot === i}
          onSelect={() => onCardSelect(i)}
        />
      ))}
    </div>
  )
}
