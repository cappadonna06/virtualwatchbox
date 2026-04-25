'use client'

import { useState } from 'react'
import { watches } from '@/lib/watches'
import WatchBox from './WatchBox'
import BoxConfigurator from './BoxConfigurator'
import WatchSidebar from './WatchSidebar'

export default function CollectionSection() {
  const [activeSlot, setActiveSlot] = useState<number | null>(0)
  const [frame, setFrame] = useState('light-oak')
  const [lining, setLining] = useState('cream')
  const [slotCount, setSlotCount] = useState(6)
  const [configOpen, setConfigOpen] = useState(false)

  function handleSlotClick(i: number) {
    setActiveSlot(prev => prev === i ? null : i)
  }

  const activeWatch = activeSlot !== null ? (watches[activeSlot] ?? null) : null

  return (
    <section className="collection-section" style={{ padding: '80px 56px', borderTop: '1px solid #EAE5DC' }}>

      {/* Sidebar backdrop — mobile only, CSS-controlled visibility */}
      <div
        className={`sidebar-backdrop ${activeWatch ? 'is-active' : ''}`}
        onClick={() => setActiveSlot(null)}
      />

      {/* Config modal backdrop */}
      {configOpen && (
        <div
          onClick={() => setConfigOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(26,20,16,0.45)',
            zIndex: 200,
            backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* Config bottom sheet — mobile only, JS-toggled, CSS-animated */}
      {configOpen && (
        <div
          className="config-modal"
          style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            zIndex: 201,
            background: '#FFFFFF',
            borderRadius: '20px 20px 0 0',
            padding: '0 20px 40px',
            maxHeight: '85vh',
            overflowY: 'auto',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E0DAD0' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A89880' }}>
              Customize Box
            </span>
            <button
              onClick={() => setConfigOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A89880', fontSize: 18, lineHeight: 1, padding: 4 }}
            >
              ✕
            </button>
          </div>
          <BoxConfigurator
            frame={frame} setFrame={setFrame}
            lining={lining} setLining={setLining}
            slotCount={slotCount} setSlotCount={setSlotCount}
          />
        </div>
      )}

      {/* Section header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 36 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A89880', marginBottom: 12 }}>
            My Collection
          </div>
          <h2 style={{ fontFamily: 'var(--font-cormorant)', fontSize: 38, fontWeight: 400, lineHeight: 1.15, color: '#1A1410' }}>
            Your Virtual<br /><em>Watch Box.</em>
          </h2>
        </div>

        {/* Edit Box button — mobile only */}
        <button
          className="edit-box-btn"
          onClick={() => setConfigOpen(true)}
          style={{
            display: 'none',
            fontFamily: 'var(--font-dm-sans)', fontSize: 10, fontWeight: 600,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            padding: '8px 14px',
            background: 'transparent', color: '#A89880',
            border: '1px solid #E0DAD0', borderRadius: 4, cursor: 'pointer',
          }}
        >
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
            <path d="M1 9.5V11h1.5l4.42-4.42-1.5-1.5L1 9.5zm7.07-5.07c.2-.2.2-.51 0-.71L6.99 2.64a.5.5 0 00-.71 0L5.13 3.79l1.5 1.5 1.44-1.44z" fill="#A89880"/>
          </svg>
          Edit Box
        </button>
      </div>

      <div className="collection-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 32, alignItems: 'start' }}>
        <div>
          <WatchBox
            activeSlot={activeSlot}
            onSlotClick={handleSlotClick}
            frame={frame}
            lining={lining}
            slotCount={slotCount}
          />

          {/* Inline configurator — desktop only */}
          <div className="configurator-wrap">
            <BoxConfigurator
              frame={frame} setFrame={setFrame}
              lining={lining} setLining={setLining}
              slotCount={slotCount} setSlotCount={setSlotCount}
            />
            <p style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 11, color: '#C8BFAF', marginTop: 10, letterSpacing: '0.04em' }}>
              Click any watch to view details · drag to rearrange
            </p>
          </div>

          {/* Mobile hint — shown only on mobile */}
          <p className="mobile-hint" style={{ display: 'none', fontFamily: 'var(--font-dm-sans)', fontSize: 11, color: '#C8BFAF', marginTop: 10, letterSpacing: '0.04em' }}>
            Tap any watch to view details
          </p>
        </div>

        {/* Watch detail — desktop: sticky sidebar, mobile: bottom sheet */}
        <div className={`sidebar-sheet ${activeWatch ? 'is-active' : ''}`}>
          {/* Drag pill — mobile only */}
          <div
            className="sidebar-drag-pill"
            style={{ display: 'none', justifyContent: 'center', padding: '12px 0 4px' }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E0DAD0' }} />
          </div>

          {/* Close button — mobile only */}
          <button
            className="sidebar-close-btn"
            onClick={() => setActiveSlot(null)}
            style={{
              display: 'none',
              position: 'absolute', top: 14, right: 16,
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#A89880', fontSize: 18, lineHeight: 1, padding: 4,
            }}
          >
            ✕
          </button>

          <div className="sidebar-content">
            <WatchSidebar watch={activeWatch} />
          </div>
        </div>
      </div>
    </section>
  )
}
