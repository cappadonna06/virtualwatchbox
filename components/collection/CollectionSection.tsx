'use client'

import { useState } from 'react'
import { watches } from '@/lib/watches'
import { FRAMES, LININGS, SLOT_COUNTS } from '@/lib/frameConfig'
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
  const fr = FRAMES.find(f => f.id === frame) ?? FRAMES[0]
  const ln = LININGS.find(l => l.id === lining) ?? LININGS[0]
  const sc = SLOT_COUNTS.find(s => s.n === slotCount) ?? SLOT_COUNTS[1]

  return (
    <section className="collection-section" style={{ padding: '80px 56px', borderTop: '1px solid #EAE5DC' }}>

      {/* Sidebar backdrop — mobile only */}
      <div
        className={`sidebar-backdrop ${activeWatch ? 'is-active' : ''}`}
        onClick={() => setActiveSlot(null)}
      />

      {/* Config modal backdrop */}
      {configOpen && (
        <div
          onClick={() => setConfigOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(26,20,16,0.45)', zIndex: 200, backdropFilter: 'blur(2px)' }}
        />
      )}

      {/* Config bottom sheet — mobile only */}
      {configOpen && (
        <div
          className="config-modal"
          style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
            background: '#FAFAF8',
            borderRadius: '20px 20px 0 0',
            maxHeight: '88vh',
            overflowY: 'auto',
            display: 'flex', flexDirection: 'column',
          }}
        >
          {/* Drag pill + header */}
          <div style={{ padding: '12px 20px 0', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
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
          </div>

          {/* Box preview */}
          <div style={{ padding: '0 20px 20px', flexShrink: 0 }}>
            <div
              style={{
                borderRadius: 10, padding: '14px 14px 16px',
                background: fr.css, boxShadow: fr.shadow,
                transition: 'background 0.4s ease, box-shadow 0.4s ease',
              }}
            >
              <div
                style={{
                  background: ln.color, borderRadius: 5, padding: 8,
                  boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)',
                  transition: 'background 0.4s ease',
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${sc.cols}, 1fr)`,
                    gap: 5,
                    transition: 'all 0.3s ease',
                  }}
                >
                  {Array.from({ length: sc.n }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        aspectRatio: '3/4', borderRadius: 3,
                        background: ln.slotBg,
                        transition: 'background 0.4s ease',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div style={{ padding: '0 20px 36px', background: '#FFFFFF', flexShrink: 0 }}>

            {/* Slots */}
            <div style={{ padding: '16px 0', borderBottom: '1px solid #F0EBE3' }}>
              <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A89880', marginBottom: 10 }}>
                Slots
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {SLOT_COUNTS.map(s => (
                  <button
                    key={s.n}
                    onClick={() => setSlotCount(s.n)}
                    style={{
                      flex: 1,
                      fontFamily: 'var(--font-dm-sans)', fontSize: 12, fontWeight: 500,
                      padding: '8px 0', borderRadius: 6,
                      border: slotCount === s.n ? '1px solid #C9A84C' : '1px solid #E0DAD0',
                      background: slotCount === s.n ? 'rgba(201,168,76,0.06)' : 'transparent',
                      color: slotCount === s.n ? '#C9A84C' : '#A89880',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Frame */}
            <div style={{ padding: '16px 0', borderBottom: '1px solid #F0EBE3' }}>
              <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A89880', marginBottom: 10 }}>
                Frame · <span style={{ color: '#1A1410', fontWeight: 600, textTransform: 'none', letterSpacing: 0, fontSize: 10 }}>{fr.label}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4 }}>
                {FRAMES.map(f => (
                  <div
                    key={f.id}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, cursor: 'pointer' }}
                    onClick={() => setFrame(f.id)}
                  >
                    <div
                      style={{
                        width: 34, height: 34, borderRadius: '50%',
                        background: f.swatchColor,
                        border: frame === f.id ? '2.5px solid #C9A84C' : '2.5px solid transparent',
                        outline: frame === f.id ? '1.5px solid rgba(201,168,76,0.3)' : '1.5px solid transparent',
                        outlineOffset: 2,
                        boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
                        transition: 'border-color 0.15s, outline-color 0.15s',
                      }}
                    />
                    <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 9, color: frame === f.id ? '#1A1410' : '#A89880', textAlign: 'center', letterSpacing: '0.02em', transition: 'color 0.15s' }}>
                      {f.label.split(' ')[0]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Lining */}
            <div style={{ padding: '16px 0 0' }}>
              <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A89880', marginBottom: 10 }}>
                Lining · <span style={{ color: '#1A1410', fontWeight: 600, textTransform: 'none', letterSpacing: 0, fontSize: 10 }}>{ln.label}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4 }}>
                {LININGS.map(l => (
                  <div
                    key={l.id}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, cursor: 'pointer' }}
                    onClick={() => setLining(l.id)}
                  >
                    <div
                      style={{
                        width: 34, height: 34, borderRadius: '50%',
                        background: l.color,
                        border: lining === l.id ? '2.5px solid #C9A84C' : l.id === 'cream' ? '2.5px solid #e0dbd0' : '2.5px solid transparent',
                        outline: lining === l.id ? '1.5px solid rgba(201,168,76,0.3)' : '1.5px solid transparent',
                        outlineOffset: 2,
                        boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
                        transition: 'border-color 0.15s, outline-color 0.15s',
                      }}
                    />
                    <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 9, color: lining === l.id ? '#1A1410' : '#A89880', textAlign: 'center', letterSpacing: '0.02em', transition: 'color 0.15s' }}>
                      {l.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
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

          {/* Mobile hint */}
          <p className="mobile-hint" style={{ display: 'none', fontFamily: 'var(--font-dm-sans)', fontSize: 11, color: '#C8BFAF', marginTop: 10, letterSpacing: '0.04em' }}>
            Tap any watch to view details
          </p>
        </div>

        {/* Watch detail — desktop: sticky sidebar, mobile: bottom sheet */}
        <div className={`sidebar-sheet ${activeWatch ? 'is-active' : ''}`}>
          <div className="sidebar-drag-pill" style={{ display: 'none', justifyContent: 'center', padding: '12px 0 4px' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E0DAD0' }} />
          </div>
          <button
            className="sidebar-close-btn"
            onClick={() => setActiveSlot(null)}
            style={{ display: 'none', position: 'absolute', top: 14, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: '#A89880', fontSize: 18, lineHeight: 1, padding: 4 }}
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
