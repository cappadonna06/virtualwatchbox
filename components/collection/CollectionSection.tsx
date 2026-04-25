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

  function handleSlotClick(i: number) {
    setActiveSlot(prev => prev === i ? null : i)
  }

  const activeWatch = activeSlot !== null ? (watches[activeSlot] ?? null) : null

  return (
    <section style={{ padding: '80px 56px', borderTop: '1px solid #EAE5DC' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 36 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A89880', marginBottom: 12 }}>
            My Collection
          </div>
          <h2 style={{ fontFamily: 'var(--font-cormorant)', fontSize: 38, fontWeight: 400, lineHeight: 1.15, color: '#1A1410' }}>
            Your Virtual<br /><em>Watch Box.</em>
          </h2>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 32, alignItems: 'start' }}>
        <div>
          <WatchBox
            activeSlot={activeSlot}
            onSlotClick={handleSlotClick}
            frame={frame}
            lining={lining}
            slotCount={slotCount}
          />
          <BoxConfigurator
            frame={frame} setFrame={setFrame}
            lining={lining} setLining={setLining}
            slotCount={slotCount} setSlotCount={setSlotCount}
          />
          <p style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 11, color: '#C8BFAF', marginTop: 10, letterSpacing: '0.04em' }}>
            Click any watch to view details · drag to rearrange
          </p>
        </div>
        <WatchSidebar watch={activeWatch} />
      </div>
    </section>
  )
}
