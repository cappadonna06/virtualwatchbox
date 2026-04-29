'use client'

import { useState } from 'react'
import Image from 'next/image'
import { CAROUSEL_WATCHES, type CarouselWatch } from './HeroCarousel'

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

interface Props {
  followedWatchIds: Set<string>
  toggleFollowedWatch: (id: string) => void
}

export default function OnYourRadar({ followedWatchIds, toggleFollowedWatch }: Props) {
  const [selected, setSelected] = useState<CarouselWatch | null>(null)

  if (followedWatchIds.size === 0) return null
  const followedWatches = CAROUSEL_WATCHES.filter(w => followedWatchIds.has(w.id))

  return (
    <div className="radar-section" style={{ padding: '80px 56px', borderTop: '1px solid #EAE5DC' }}>

      {/* Watch detail modal */}
      {selected && (
        <>
          <div
            onClick={() => setSelected(null)}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(26,20,16,0.5)',
              zIndex: 300,
              backdropFilter: 'blur(3px)',
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 301,
              background: '#FFFCF7',
              borderRadius: 16,
              width: 'min(400px, 92vw)',
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: '28px 28px 32px',
              boxShadow: '0 24px 64px rgba(26,20,16,0.18)',
            }}
          >
            {/* Close */}
            <button
              onClick={() => setSelected(null)}
              style={{
                position: 'absolute', top: 16, right: 16,
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#A89880', fontSize: 18, lineHeight: 1, padding: 4,
              }}
            >
              ✕
            </button>

            {/* Watch image */}
            <div style={{ position: 'relative', width: 180, height: 180, margin: '0 auto 20px' }}>
              <Image
                src={selected.img}
                alt={selected.model}
                fill
                sizes="180px"
                style={{ objectFit: 'contain', filter: 'drop-shadow(0 8px 24px rgba(26,20,16,0.13))' }}
              />
            </div>

            {/* Brand / Model / Ref */}
            <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A89880', marginBottom: 4 }}>
              {selected.brand}
            </div>
            <h3 style={{ fontFamily: 'var(--font-cormorant)', fontSize: 28, fontWeight: 400, lineHeight: 1.1, color: '#1A1410', marginBottom: 4 }}>
              {selected.model}
            </h3>
            <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 12, color: '#A89880', marginBottom: 20 }}>
              Ref. {selected.ref}
            </div>

            {/* Specs */}
            <div style={{ borderTop: '1px solid #EAE5DC', marginBottom: 20 }}>
              {([['Dial', selected.dial], ['Est. Value', fmt(selected.value)]] as [string, string][]).map(([label, val], i) => (
                <div
                  key={label}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                    padding: '10px 0',
                    borderBottom: '1px solid #F0EBE3',
                    fontSize: 12,
                  }}
                >
                  <span style={{ color: '#A89880' }}>{label}</span>
                  <span style={{
                    color: i === 1 ? '#C9A84C' : '#1A1410',
                    fontWeight: i === 1 ? 600 : 500,
                    fontFamily: i === 1 ? 'var(--font-dm-sans)' : 'inherit',
                    fontSize: i === 1 ? 15 : 12,
                  }}>
                    {val}
                  </span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => toggleFollowedWatch(selected.id)}
                style={{
                  flex: 1,
                  fontFamily: 'var(--font-dm-sans)', fontSize: 11, fontWeight: 500, letterSpacing: '0.06em',
                  padding: '11px 10px',
                  background: followedWatchIds.has(selected.id) ? 'rgba(201,168,76,0.08)' : 'transparent',
                  color: followedWatchIds.has(selected.id) ? '#C9A84C' : '#A89880',
                  border: followedWatchIds.has(selected.id) ? '1px solid rgba(201,168,76,0.4)' : '1px solid #E0DAD0',
                  borderRadius: 4, cursor: 'pointer',
                }}
              >
                {followedWatchIds.has(selected.id) ? '♥ Followed' : '♡ Follow'}
              </button>
              <button
                style={{
                  flex: 2,
                  fontFamily: 'var(--font-dm-sans)', fontSize: 11, fontWeight: 500, letterSpacing: '0.06em',
                  padding: '11px 10px',
                  background: '#1A1410', color: '#FAF8F4',
                  border: 'none', borderRadius: 4, cursor: 'pointer',
                }}
              >
                Find For Sale ↗
              </button>
            </div>
          </div>
        </>
      )}

      {/* Section header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A89880', marginBottom: 6 }}>
            Followed · {followedWatchIds.size} {followedWatchIds.size === 1 ? 'watch' : 'watches'}
          </div>
          <h3 style={{ fontFamily: 'var(--font-cormorant)', fontSize: 26, fontWeight: 400, color: '#1A1410' }}>
            On Your <em>Radar.</em>
          </h3>
        </div>
        <a style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 10, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', color: '#C9A84C' }}>
          Add to Playground →
        </a>
      </div>

      {/* Cards */}
      <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
        {followedWatches.map(w => (
          <div
            key={w.id}
            onClick={() => setSelected(w)}
            style={{
              flex: '0 0 160px',
              background: '#fff',
              border: '1px solid #EAE5DC',
              borderRadius: 10,
              overflow: 'hidden',
              cursor: 'pointer',
              transition: 'box-shadow 0.15s, transform 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(26,20,16,0.10)'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.boxShadow = 'none'
              e.currentTarget.style.transform = 'translateY(0)'
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
                  onClick={e => { e.stopPropagation(); toggleFollowedWatch(w.id) }}
                  title="Remove from followed"
                  style={{ fontSize: 11, color: '#C8BFAF', fontWeight: 500, background: 'none', border: 'none', padding: 0, cursor: 'pointer', lineHeight: 1 }}
                >✕</button>
              </div>
              <div style={{ fontFamily: 'var(--font-cormorant)', fontSize: 14, lineHeight: 1.2, color: '#1A1410', marginBottom: 2 }}>
                {w.model}
              </div>
              <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 10, color: '#A89880', marginBottom: 5 }}>
                {w.dial}
              </div>
              <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 12, color: '#C9A84C', fontWeight: 600 }}>
                {fmt(w.value)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
