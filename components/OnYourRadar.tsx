'use client'

import Image from 'next/image'
import { CAROUSEL_WATCHES } from './HeroCarousel'

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

interface Props {
  liked: Set<string>
  toggleLike: (id: string) => void
}

export default function OnYourRadar({ liked, toggleLike }: Props) {
  if (liked.size === 0) return null
  const likedWatches = CAROUSEL_WATCHES.filter(w => liked.has(w.id))

  return (
    <div style={{ padding: '80px 56px', borderTop: '1px solid #EAE5DC' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A89880', marginBottom: 6 }}>
            Saved · {liked.size} {liked.size === 1 ? 'watch' : 'watches'}
          </div>
          <h3 style={{ fontFamily: 'var(--font-cormorant)', fontSize: 26, fontWeight: 400, color: '#1A1410' }}>
            On Your <em>Radar.</em>
          </h3>
        </div>
        <a style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 10, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', color: '#C9A84C' }}>
          Add to Playground →
        </a>
      </div>

      <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
        {likedWatches.map(w => (
          <div
            key={w.id}
            style={{
              flex: '0 0 160px',
              background: '#fff',
              border: '1px solid #EAE5DC',
              borderRadius: 10,
              overflow: 'hidden',
              cursor: 'pointer',
            }}
          >
            <Image
              src={w.img}
              alt={w.model}
              width={160}
              height={160}
              style={{ width: '100%', aspectRatio: '1/1', objectFit: 'contain', background: '#F8F4EE', display: 'block', padding: 8 }}
            />
            <div style={{ padding: '10px 12px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A89880', marginBottom: 3 }}>
                  {w.brand}
                </div>
                <button
                  onClick={() => toggleLike(w.id)}
                  title="Remove from radar"
                  style={{ fontSize: 11, color: '#C8BFAF', fontWeight: 500, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                >✕</button>
              </div>
              <div style={{ fontFamily: 'var(--font-cormorant)', fontSize: 14, lineHeight: 1.2, color: '#1A1410', marginBottom: 4 }}>{w.dial}</div>
              <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 12, color: '#C9A84C', fontWeight: 600 }}>{fmt(w.value)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
