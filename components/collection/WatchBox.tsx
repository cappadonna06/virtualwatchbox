import Image from 'next/image'
import { watches } from '@/lib/watches'
import { FRAMES, LININGS, SLOT_COUNTS } from '@/lib/frameConfig'

interface Props {
  activeSlot: number | null
  onSlotClick: (i: number) => void
  frame: string
  lining: string
  slotCount: number
}

export default function WatchBox({ activeSlot, onSlotClick, frame, lining, slotCount }: Props) {
  const fr = FRAMES.find(f => f.id === frame) ?? FRAMES[0]
  const ln = LININGS.find(l => l.id === lining) ?? LININGS[0]
  const sc = SLOT_COUNTS.find(s => s.n === slotCount) ?? SLOT_COUNTS[1]

  const slots = Array.from({ length: sc.n }, (_, i) => watches[i] ?? null)

  return (
    <div
      style={{
        borderRadius: 10,
        padding: '22px 22px 24px',
        background: fr.css,
        boxShadow: fr.shadow,
      }}
    >
      <div
        style={{
          background: ln.color,
          borderRadius: 5,
          padding: 10,
          boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)',
          transition: 'background 0.4s ease',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${sc.cols}, 1fr)`,
            gap: 6,
            transition: 'all 0.3s ease',
          }}
        >
          {slots.map((w, i) => {
            const isActive = activeSlot === i

            if (!w) {
              return (
                <div key={i} style={{ aspectRatio: '3/4', borderRadius: 3, position: 'relative' }}>
                  <div
                    style={{
                      width: '100%', height: '100%',
                      borderRadius: 3,
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                      gap: 5, cursor: 'pointer', opacity: 0.4,
                      background: ln.slotBg,
                    }}
                  >
                    <span style={{ fontSize: 18, color: ln.emptyColor }}>+</span>
                    <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 8, letterSpacing: '0.1em', color: ln.emptyColor }}>ADD</span>
                  </div>
                </div>
              )
            }

            return (
              <div
                key={i}
                onClick={() => onSlotClick(i)}
                style={{
                  aspectRatio: '3/4',
                  borderRadius: 3,
                  position: 'relative',
                  cursor: 'pointer',
                  overflow: 'visible',
                  transform: 'translateY(0)',
                  transition: 'transform 0.18s ease',
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                <div
                  style={{
                    width: '100%', height: '100%',
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
                      position: 'absolute', top: 5, left: 6,
                      fontFamily: 'var(--font-dm-sans)', fontSize: 8, fontWeight: 500,
                      letterSpacing: '0.08em', color: 'rgba(80,60,40,0.3)',
                      pointerEvents: 'none', zIndex: 2,
                    }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <Image
                    src={w.imageUrl}
                    alt={w.model}
                    fill
                    sizes="(max-width: 768px) 20vw, 10vw"
                    style={{ objectFit: 'cover', objectPosition: 'center 45%' }}
                  />
                  {isActive && (
                    <span
                      style={{
                        position: 'absolute', bottom: 5, right: 5,
                        width: 4, height: 4, borderRadius: '50%',
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
      </div>
    </div>
  )
}
