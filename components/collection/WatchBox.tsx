'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import type { Watch } from '@/types/watch'
import { FRAMES, LININGS, SLOT_COUNTS } from '@/lib/frameConfig'
import { getWatchboxOverflow } from '@/lib/watchboxOverflow'
import DialSVG from '@/components/watchbox/DialSVG'
import HoverCard from '@/components/watchbox/HoverCard'

interface Props {
  watches: Watch[]
  activeSlot: number | null
  onSlotClick: (i: number) => void
  onEmptySlotClick?: () => void
  frame: string
  lining: string
  slotCount: number
  slotWidth?: number
  mode?: 'collection' | 'playground'
}

function OverflowListItem({
  watch,
  onClick,
  mode,
}: {
  watch: Watch
  onClick: () => void
  mode: 'collection' | 'playground'
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        border: 'none',
        background: 'transparent',
        padding: '10px 12px',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 8,
          background: '#FAF8F4',
          border: '1px solid #E8E2D8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {mode === 'playground' ? (
          <DialSVG
            dialColor={watch.dialConfig.dialColor}
            markerColor={watch.dialConfig.markerColor}
            handColor={watch.dialConfig.handColor}
            size={32}
          />
        ) : (
          <Image
            src={watch.imageUrl}
            alt={watch.model}
            fill
            sizes="48px"
            style={{ objectFit: 'cover', objectPosition: 'center 45%' }}
          />
        )}
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontFamily: 'var(--font-dm-sans)',
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#C9A84C',
            marginBottom: 2,
          }}
        >
          {watch.brand}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-cormorant)',
            fontSize: 18,
            color: '#1A1410',
            lineHeight: 1.05,
            marginBottom: 2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {watch.model}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-dm-sans)',
            fontSize: 10,
            color: '#A89880',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          Ref. {watch.reference}
        </div>
      </div>
    </button>
  )
}

export default function WatchBox({
  watches,
  activeSlot,
  onSlotClick,
  onEmptySlotClick,
  frame,
  lining,
  slotCount,
  slotWidth,
  mode = 'collection',
}: Props) {
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null)
  const [overflowOpen, setOverflowOpen] = useState(false)

  const fr = FRAMES.find(f => f.id === frame) ?? FRAMES[0]
  const ln = LININGS.find(l => l.id === lining) ?? LININGS[0]
  const sc = SLOT_COUNTS.find(s => s.n === slotCount) ?? SLOT_COUNTS[1]
  const overflow = useMemo(() => getWatchboxOverflow(watches, sc.n), [watches, sc.n])

  const slots = Array.from({ length: sc.n }, (_, i) => {
    if (overflow.hasOverflow && i === sc.n - 1) {
      return { type: 'overflow' as const }
    }
    const watch = overflow.visibleItems[i] ?? null
    return watch ? { type: 'watch' as const, watch, originalIndex: i } : { type: 'empty' as const }
  })

  const overflowSlotActive = overflow.hasOverflow && activeSlot !== null && activeSlot >= overflow.visibleItems.length

  return (
    <>
      {overflowOpen && (
        <div
          className="watchbox-overflow-backdrop"
          onClick={() => setOverflowOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(26, 20, 16, 0.45)',
            zIndex: 189,
            backdropFilter: 'blur(2px)',
            display: 'block',
          }}
        />
      )}

      <div
        style={{
          borderRadius: 10,
          padding: '22px 22px 24px',
          background: fr.css,
          boxShadow: fr.shadow,
          position: 'relative',
        }}
      >
        <div
          style={{
            background: ln.color,
            borderRadius: 5,
            padding: 10,
            boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)',
            transition: 'background 0.4s ease',
            position: 'relative',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: slotWidth
                ? `repeat(${sc.cols}, ${slotWidth}px)`
                : `repeat(${sc.cols}, 1fr)`,
              gap: 6,
            }}
          >
            {slots.map((slot, i) => {
              const isActive = activeSlot === i || (slot.type === 'overflow' && overflowSlotActive)

              if (slot.type === 'empty') {
                return (
                  <div key={i} style={{ aspectRatio: '3/4', borderRadius: 3, position: 'relative' }}>
                    <div
                      onClick={onEmptySlotClick}
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: 3,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 5,
                        cursor: 'pointer',
                        opacity: 0.4,
                        background: ln.slotBg,
                      }}
                    >
                      <span style={{ fontSize: 18, color: ln.emptyColor }}>+</span>
                      <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 8, letterSpacing: '0.1em', color: ln.emptyColor }}>ADD</span>
                    </div>
                  </div>
                )
              }

              if (slot.type === 'overflow') {
                return (
                  <div key={i} style={{ aspectRatio: '3/4', borderRadius: 3, position: 'relative' }}>
                    <button
                      onClick={() => setOverflowOpen(true)}
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: 3,
                        border: isActive ? '1.5px solid rgba(201,168,76,0.8)' : '1.5px solid transparent',
                        boxShadow: isActive
                          ? 'inset 0 1px 4px rgba(0,0,0,0.12), 0 0 0 1px rgba(201,168,76,0.4), 0 3px 14px rgba(201,168,76,0.16)'
                          : 'inset 0 1px 4px rgba(0,0,0,0.12)',
                        background: ln.slotBg,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        position: 'relative',
                        overflow: 'hidden',
                        transition: 'border-color 0.2s, box-shadow 0.2s',
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          top: 5,
                          left: 6,
                          fontFamily: 'var(--font-dm-sans)',
                          fontSize: 8,
                          fontWeight: 500,
                          letterSpacing: '0.08em',
                          color: 'rgba(80,60,40,0.3)',
                          pointerEvents: 'none',
                          zIndex: 2,
                        }}
                      >
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div
                        style={{
                          fontFamily: 'var(--font-cormorant)',
                          fontSize: 26,
                          color: '#1A1410',
                          lineHeight: 1,
                        }}
                      >
                        +{overflow.overflowCount}
                      </div>
                      <div
                        style={{
                          fontFamily: 'var(--font-dm-sans)',
                          fontSize: 9,
                          fontWeight: 600,
                          letterSpacing: '0.12em',
                          textTransform: 'uppercase',
                          color: '#A89880',
                        }}
                      >
                        More
                      </div>
                      {isActive && (
                        <span
                          style={{
                            position: 'absolute',
                            bottom: 5,
                            right: 5,
                            width: 4,
                            height: 4,
                            borderRadius: '50%',
                            background: '#C9A84C',
                            boxShadow: '0 0 6px rgba(201,168,76,0.8)',
                            zIndex: 2,
                          }}
                        />
                      )}
                    </button>
                  </div>
                )
              }

              const w = slot.watch

              return (
                <div
                  key={i}
                  onClick={() => onSlotClick(slot.originalIndex)}
                  style={{
                    aspectRatio: '3/4',
                    borderRadius: 3,
                    position: 'relative',
                    cursor: 'pointer',
                    overflow: 'visible',
                    transform: 'translateY(0)',
                    transition: 'transform 0.18s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    if (mode === 'playground') setHoveredSlot(i)
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    if (mode === 'playground') setHoveredSlot(null)
                  }}
                >
                  {mode === 'playground' && hoveredSlot === i && (
                    <HoverCard watch={w} />
                  )}

                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: 3,
                      overflow: 'hidden',
                      position: 'relative',
                      background: ln.slotBg,
                      border: isActive ? '1.5px solid rgba(201,168,76,0.8)' : '1.5px solid transparent',
                      boxShadow: isActive
                        ? 'inset 0 1px 4px rgba(0,0,0,0.12), 0 0 0 1px rgba(201,168,76,0.4), 0 3px 14px rgba(201,168,76,0.16)'
                        : 'inset 0 1px 4px rgba(0,0,0,0.12)',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        top: 5,
                        left: 6,
                        fontFamily: 'var(--font-dm-sans)',
                        fontSize: 8,
                        fontWeight: 500,
                        letterSpacing: '0.08em',
                        color: 'rgba(80,60,40,0.3)',
                        pointerEvents: 'none',
                        zIndex: 2,
                      }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {mode === 'playground' ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <DialSVG
                          dialColor={w.dialConfig.dialColor}
                          markerColor={w.dialConfig.markerColor}
                          handColor={w.dialConfig.handColor}
                          size={Math.round((slotWidth ?? 90) * 0.58)}
                        />
                      </div>
                    ) : (
                      <Image
                        src={w.imageUrl}
                        alt={w.model}
                        fill
                        sizes="(max-width: 768px) 20vw, 10vw"
                        style={{ objectFit: 'cover', objectPosition: 'center 45%' }}
                      />
                    )}
                    {isActive && (
                      <span
                        style={{
                          position: 'absolute',
                          bottom: 5,
                          right: 5,
                          width: 4,
                          height: 4,
                          borderRadius: '50%',
                          background: '#C9A84C',
                          boxShadow: '0 0 6px rgba(201,168,76,0.8)',
                          zIndex: 2,
                        }}
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {overflow.hasOverflow && (
            <>
              <div
                className="watchbox-overflow-flyout"
                style={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  width: 260,
                  maxHeight: 320,
                  overflowY: 'auto',
                  background: '#FFFFFF',
                  border: '1px solid #E8E2D8',
                  borderRadius: 10,
                  boxShadow: '0 16px 40px rgba(26,20,16,0.16)',
                  opacity: overflowOpen ? 1 : 0,
                  transform: overflowOpen ? 'translateY(0)' : 'translateY(-6px)',
                  pointerEvents: overflowOpen ? 'auto' : 'none',
                  transition: 'opacity 0.18s ease, transform 0.18s ease',
                  zIndex: 191,
                }}
              >
                <div
                  style={{
                    padding: '12px 12px 10px',
                    borderBottom: '1px solid #F0EBE3',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontFamily: 'var(--font-dm-sans)',
                        fontSize: 9,
                        fontWeight: 600,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: '#A89880',
                        marginBottom: 2,
                      }}
                    >
                      Hidden Watches
                    </div>
                    <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 11, color: '#1A1410' }}>
                      {overflow.overflowCount} more in this box
                    </div>
                  </div>
                  <button
                    onClick={() => setOverflowOpen(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#A89880',
                      fontSize: 16,
                      lineHeight: 1,
                      padding: 4,
                    }}
                  >
                    ✕
                  </button>
                </div>
                <div>
                  {overflow.hiddenItems.map(({ item, index }) => (
                    <OverflowListItem
                      key={item.id}
                      watch={item}
                      mode={mode}
                      onClick={() => {
                        onSlotClick(index)
                        setOverflowOpen(false)
                      }}
                    />
                  ))}
                </div>
              </div>

              {overflowOpen && (
                <div
                  className="watchbox-overflow-sheet"
                  style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    zIndex: 190,
                    background: '#FFFFFF',
                    borderRadius: '20px 20px 0 0',
                    transform: 'translateY(0)',
                    display: 'none',
                    maxHeight: '70vh',
                    overflowY: 'auto',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
                    <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E0DAD0' }} />
                  </div>
                  <div
                    style={{
                      padding: '12px 20px 8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontFamily: 'var(--font-dm-sans)',
                          fontSize: 10,
                          fontWeight: 600,
                          letterSpacing: '0.12em',
                          textTransform: 'uppercase',
                          color: '#A89880',
                          marginBottom: 4,
                        }}
                      >
                        Hidden Watches
                      </div>
                      <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 12, color: '#1A1410' }}>
                        {overflow.overflowCount} more in this box
                      </div>
                    </div>
                    <button
                      onClick={() => setOverflowOpen(false)}
                      style={{
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
                  </div>
                  <div style={{ paddingBottom: 20 }}>
                    {overflow.hiddenItems.map(({ item, index }) => (
                      <OverflowListItem
                        key={item.id}
                        watch={item}
                        mode={mode}
                        onClick={() => {
                          onSlotClick(index)
                          setOverflowOpen(false)
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
