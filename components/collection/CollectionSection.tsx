'use client'

import { useState, useEffect, useLayoutEffect } from 'react'
import Link from 'next/link'
import { watches } from '@/lib/watches'
import { FRAMES, LININGS, SLOT_COUNTS } from '@/lib/frameConfig'
import WatchBox from './WatchBox'
import WatchSidebar from './WatchSidebar'

// WatchBox internal padding constants (from WatchBox.tsx)
// Frame: padding '22px 22px 24px', Lining: padding 10, Row gap: 6
const WB_W_PAD = 64  // frame(22+22) + lining(10+10)
const WB_H_PAD = 72  // frame(22+24) + lining(10+10) + rowGap(6)
const WB_GAP   = 6

// Drawer preview padding constants
// Frame: padding '12px 12px 14px', Lining: padding 7, Row gap: 5
const PV_W_PAD = 38  // frame(12+12) + lining(7+7)
const PV_H_PAD = 45  // frame(12+14) + lining(7+7) + rowGap(5)
const PV_GAP   = 5

const ROWS = 2  // all slot counts use 2 rows

// Returns the exact pixel width per slot that fits within containerW and maxH
// at 3/4 aspect ratio. Used to drive both the wrapper maxWidth and explicit grid
// column sizes — bypassing 1fr inheritance so slots never overflow the box frame.
function calcSlotPx(
  containerW: number, maxH: number, cols: number,
  wPad: number, hPad: number, gap: number,
): number {
  const slotFromW = (containerW - wPad - (cols - 1) * gap) / cols
  const slotFromH = (maxH - hPad) * 3 / (4 * ROWS)
  return Math.max(16, Math.min(slotFromW, slotFromH))
}

export default function CollectionSection() {
  const [activeSlot, setActiveSlot]       = useState<number | null>(null)
  const [frame, setFrame]                 = useState('light-oak')
  const [lining, setLining]               = useState('cream')
  const [slotCount, setSlotCount]         = useState(6)
  const [configOpen, setConfigOpen]       = useState(false)
  const [customizerOpen, setCustomizerOpen] = useState(false)
  const [screenW, setScreenW]             = useState(0)

  useLayoutEffect(() => {
    const update = () => setScreenW(window.innerWidth)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // Restore saved box config from localStorage after hydration
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('watchbox-config') ?? 'null')
      if (!saved) return
      if (FRAMES.some(f => f.id === saved.frame)) setFrame(saved.frame)
      if (LININGS.some(l => l.id === saved.lining)) setLining(saved.lining)
      if (SLOT_COUNTS.some(s => s.n === saved.slotCount)) setSlotCount(saved.slotCount)
    } catch {}
  }, [])

  // Persist box config whenever it changes
  useEffect(() => {
    localStorage.setItem('watchbox-config', JSON.stringify({ frame, lining, slotCount }))
  }, [frame, lining, slotCount])

  function handleSlotClick(i: number) {
    setActiveSlot(prev => prev === i ? null : i)
  }

  const activeWatch = activeSlot !== null ? (watches[activeSlot] ?? null) : null
  const fr = FRAMES.find(f => f.id === frame) ?? FRAMES[0]
  const ln = LININGS.find(l => l.id === lining) ?? LININGS[0]
  const sc = SLOT_COUNTS.find(s => s.n === slotCount) ?? SLOT_COUNTS[1]

  const isMobile = screenW > 0 && screenW < 768

  // Desktop column width = screenW minus section padding (56×2=112) + sidebar (300) + gap (32)
  const watchboxContainerW = isMobile ? screenW - 40 : Math.max(200, screenW - 444)
  const watchboxMaxH = isMobile ? 300 : 480

  // Exact slot pixel width → drives both the wrapper maxWidth AND the explicit grid
  // column sizes (repeat(cols, Xpx)) so slots can never overflow the frame.
  const watchboxSlotPx = screenW > 0
    ? Math.floor(calcSlotPx(watchboxContainerW, watchboxMaxH, sc.cols, WB_W_PAD, WB_H_PAD, WB_GAP))
    : undefined
  const watchboxMaxW = watchboxSlotPx !== undefined
    ? WB_W_PAD + (sc.cols - 1) * WB_GAP + sc.cols * watchboxSlotPx
    : undefined

  // Drawer preview slot px and wrapper maxWidth
  const previewContainerW = screenW > 0 ? screenW - 40 : 350
  const previewSlotPx = Math.floor(calcSlotPx(previewContainerW, 260, sc.cols, PV_W_PAD, PV_H_PAD, PV_GAP))
  const previewMaxW = PV_W_PAD + (sc.cols - 1) * PV_GAP + sc.cols * previewSlotPx

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
            display: 'flex', flexDirection: 'column',
          }}
        >
          {/* Drag pill + header */}
          <div style={{ padding: '12px 20px 0', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E0DAD0' }} />
            </div>
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

          {/* Box preview — constrained by calcMaxBoxW, slots maintain 3/4 ratio */}
          <div style={{ padding: '0 20px 16px', flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: '100%', maxWidth: previewMaxW }}>
              <div
                style={{
                  borderRadius: 10, padding: '12px 12px 14px',
                  background: fr.css, boxShadow: fr.shadow,
                  transition: 'background 0.4s ease, box-shadow 0.4s ease',
                }}
              >
                <div
                  style={{
                    background: ln.color, borderRadius: 5, padding: 7,
                    boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)',
                    transition: 'background 0.4s ease',
                  }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: `repeat(${sc.cols}, ${previewSlotPx}px)`,
                      gap: PV_GAP,
                    }}
                  >
                    {Array.from({ length: sc.n }).map((_, i) => (
                      <div
                        key={i}
                        style={{
                          width: previewSlotPx,
                          height: Math.round(previewSlotPx * 4 / 3),
                          borderRadius: 3,
                          background: ln.slotBg,
                          transition: 'background 0.4s ease',
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div style={{ padding: '0 20px 32px', background: '#FFFFFF', flexShrink: 0 }}>

            {/* Slots */}
            <div style={{ padding: '14px 0', borderBottom: '1px solid #F0EBE3' }}>
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
            <div style={{ padding: '14px 0', borderBottom: '1px solid #F0EBE3' }}>
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
            <div style={{ padding: '14px 0 0' }}>
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
      <div style={{ marginBottom: 36 }}>
        <Link
          href="/collection"
          style={{ textDecoration: 'none', display: 'inline-block' }}
        >
          <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A89880', marginBottom: 12 }}>
            My Collection →
          </div>
          <h2 style={{ fontFamily: 'var(--font-cormorant)', fontSize: 38, fontWeight: 400, lineHeight: 1.15, color: '#1A1410', whiteSpace: 'nowrap' }}>
            Your Virtual <em>Watch Box.</em>
          </h2>
        </Link>
      </div>

      <div className="collection-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 32, alignItems: 'start' }}>
        <div>
          {/* Box + flyout — both constrained to watchboxMaxW so they visually align */}
          <div style={watchboxMaxW !== undefined ? { maxWidth: watchboxMaxW, width: '100%', margin: '0 auto' } : {}}>
            <WatchBox
              activeSlot={activeSlot}
              onSlotClick={handleSlotClick}
              frame={frame}
              lining={lining}
              slotCount={slotCount}
              slotWidth={watchboxSlotPx}
            />

            {/* Desktop flyout — .configurator-wrap CSS hides on mobile */}
            <div className="configurator-wrap" style={{ marginTop: 10, position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setCustomizerOpen(v => !v)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    fontFamily: 'var(--font-dm-sans)', fontSize: 10, fontWeight: 500,
                    letterSpacing: '0.06em',
                    padding: '5px 12px',
                    background: '#FFFFFF', color: '#A89880',
                    border: '1px solid #EAE5DC', borderRadius: 6,
                    cursor: 'pointer',
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M1 9.5V11h1.5l4.42-4.42-1.5-1.5L1 9.5zm7.07-5.07c.2-.2.2-.51 0-.71L6.99 2.64a.5.5 0 00-.71 0L5.13 3.79l1.5 1.5 1.44-1.44z" fill="#A89880"/>
                  </svg>
                  Customize Watchbox
                </button>
              </div>

              {/* Flyout panel — absolute, flies in from top-right */}
              <div
                style={{
                  position: 'absolute', top: '100%', right: 0, zIndex: 20, marginTop: 4,
                  border: '1px solid #EAE5DC', borderRadius: 8, background: '#FFFFFF',
                  boxShadow: '0 4px 20px rgba(26,20,16,0.1)',
                  overflow: 'hidden',
                  opacity: customizerOpen ? 1 : 0,
                  transform: customizerOpen ? 'translateY(0) scale(1)' : 'translateY(-4px) scale(0.98)',
                  transformOrigin: 'top right',
                  pointerEvents: customizerOpen ? 'auto' : 'none',
                  transition: 'opacity 0.18s ease, transform 0.18s ease',
                }}
              >
                <div style={{ padding: '8px 12px', borderBottom: '1px solid #F0EBE3', background: '#FAF8F4' }}>
                  <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 10, color: '#A89880' }}>{fr.label} · {ln.label} · {sc.n} slots</span>
                </div>
                <div style={{ padding: '9px 12px', borderBottom: '1px solid #F0EBE3', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A89880', flexShrink: 0 }}>Slots</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {SLOT_COUNTS.map(s => (
                      <button key={s.n} onClick={() => setSlotCount(s.n)} style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 10, fontWeight: 500, padding: '3px 9px', borderRadius: 4, border: slotCount === s.n ? '1px solid #C9A84C' : '1px solid #E0DAD0', background: slotCount === s.n ? 'rgba(201,168,76,0.06)' : 'transparent', color: slotCount === s.n ? '#C9A84C' : '#A89880', cursor: 'pointer', transition: 'all 0.15s' }}>{s.label}</button>
                    ))}
                  </div>
                </div>
                <div style={{ padding: '9px 12px', borderBottom: '1px solid #F0EBE3' }}>
                  <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A89880', marginBottom: 6 }}>
                    Frame · <span style={{ color: '#1A1410', fontWeight: 600, textTransform: 'none', letterSpacing: 0 }}>{fr.label}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 7 }}>
                    {FRAMES.map(f => (
                      <div key={f.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div onClick={() => setFrame(f.id)} title={f.label} style={{ width: 24, height: 24, borderRadius: '50%', background: f.swatchColor, cursor: 'pointer', border: frame === f.id ? '2px solid #C9A84C' : '2px solid transparent', boxShadow: '0 1px 4px rgba(0,0,0,0.15)', transition: 'border-color 0.15s' }} onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.15)')} onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')} />
                        <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 8, color: '#A89880', textAlign: 'center', marginTop: 3 }}>{f.label.split(' ')[0]}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ padding: '9px 12px' }}>
                  <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A89880', marginBottom: 6 }}>
                    Lining · <span style={{ color: '#1A1410', fontWeight: 600, textTransform: 'none', letterSpacing: 0 }}>{ln.label}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 7 }}>
                    {LININGS.map(l => (
                      <div key={l.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div onClick={() => setLining(l.id)} title={l.label} style={{ width: 24, height: 24, borderRadius: '50%', background: l.color, cursor: 'pointer', border: lining === l.id ? '2px solid #C9A84C' : l.id === 'cream' ? '2px solid #e0dbd0' : '2px solid transparent', boxShadow: '0 1px 4px rgba(0,0,0,0.15)', transition: 'border-color 0.15s' }} onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.15)')} onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')} />
                        <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 8, color: '#A89880', textAlign: 'center', marginTop: 3 }}>{l.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile trigger — .edit-box-btn CSS shows on mobile */}
          <button
            className="edit-box-btn"
            onClick={() => setConfigOpen(true)}
            style={{
              display: 'none',
              margin: '14px auto 0',
              width: 'fit-content',
              fontFamily: 'var(--font-dm-sans)', fontSize: 10, fontWeight: 600,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              padding: '10px 20px',
              background: '#FFFFFF', color: '#A89880',
              border: '1px solid #E0DAD0', borderRadius: 8, cursor: 'pointer',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
              <path d="M1 9.5V11h1.5l4.42-4.42-1.5-1.5L1 9.5zm7.07-5.07c.2-.2.2-.51 0-.71L6.99 2.64a.5.5 0 00-.71 0L5.13 3.79l1.5 1.5 1.44-1.44z" fill="#A89880"/>
            </svg>
            Customize Watchbox
          </button>

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
