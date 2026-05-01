'use client'

import { useState } from 'react'
import Image from 'next/image'
import WatchStateControl from '@/components/collection/WatchStateControl'
import { brand } from '@/lib/brand'

export interface CarouselWatch {
  id: string
  img: string
  brand: string
  model: string
  ref: string
  dial: string
  value: number
}

const CAROUSEL_WATCHES: CarouselWatch[] = [
  { id: 'longines-ld-white', img: '/watches/longines-05.avif', brand: 'Longines', model: 'Legend Diver', ref: 'L3.764.4.16.6', dial: 'White Lacquer', value: 1350 },
  { id: 'longines-ld-navy', img: '/watches/longines-02.avif', brand: 'Longines', model: 'Legend Diver', ref: 'L3.764.4.96.6', dial: 'Navy Blue', value: 1380 },
  { id: 'longines-ld-green', img: '/watches/longines-03.avif', brand: 'Longines', model: 'Legend Diver', ref: 'L3.764.4.06.6', dial: 'Forest Green', value: 1450 },
  { id: 'longines-ld-black', img: '/watches/longines-04.avif', brand: 'Longines', model: 'Legend Diver', ref: 'L3.764.4.50.0', dial: 'Black', value: 1250 },
  { id: 'longines-ld-grey', img: '/watches/longines-01.avif', brand: 'Longines', model: 'Legend Diver', ref: 'L3.764.4.99.6', dial: 'Grey Anthracite', value: 1340 },
]

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export default function HeroCarousel() {
  const [idx, setIdx] = useState(0)
  const [animating, setAnimating] = useState(false)
  const [dir, setDir] = useState(1)

  const watch = CAROUSEL_WATCHES[idx]
  const total = CAROUSEL_WATCHES.length

  function navigate(newIdx: number) {
    if (animating) return
    setDir(newIdx > idx ? 1 : -1)
    setAnimating(true)
    setTimeout(() => {
      setIdx(((newIdx % total) + total) % total)
      setAnimating(false)
    }, 300)
  }

  return (
    <section style={{ padding: 0, borderBottom: `1px solid ${brand.colors.border}` }}>
      <div className="hero-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 440px', minHeight: 420, alignItems: 'stretch' }}>

        {/* Left: static text */}
        <div className="hero-text" style={{ padding: '72px 56px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A89880', marginBottom: 20 }}>
            The Digital Home for Every Collector
          </div>
          <h1
            className="hero-h1"
            style={{
              fontFamily: 'var(--font-cormorant)',
              fontSize: 'clamp(48px, 5vw, 78px)',
              fontWeight: 300,
              lineHeight: 1.0,
              letterSpacing: '-0.01em',
              color: '#1A1410',
              marginBottom: 24,
            }}
          >
            Showcase Your<br />
            <em style={{ fontStyle: 'italic', fontWeight: 300 }}>Timepieces.</em>
          </h1>
          <p style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 13, lineHeight: 1.9, color: '#A89880', maxWidth: 360, marginBottom: 32 }}>
            Organize what you own, explore what you want,<br />discover what&apos;s next.
          </p>
          <div className="hero-actions" style={{ display: 'flex', gap: 12 }}>
            <button
              className="hero-action"
              style={{
                fontFamily: brand.font.sans,
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: '0.08em',
                padding: '12px 28px',
                background: brand.colors.ink,
                color: brand.colors.bg,
                border: 'none',
                borderRadius: brand.radius.btn,
                cursor: 'pointer',
              }}
            >
              Build Your Box
            </button>
            <button
              className="hero-action"
              style={{
                fontFamily: brand.font.sans,
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: '0.08em',
                padding: '12px 28px',
                background: 'transparent',
                color: brand.colors.ink,
                border: `1px solid ${brand.colors.borderLight}`,
                borderRadius: brand.radius.btn,
                cursor: 'pointer',
              }}
            >
              Explore Watches
            </button>
          </div>
        </div>

        {/* Right: dark carousel panel */}
        <div className="hero-panel" style={{
          position: 'relative', overflow: 'hidden',
          background: 'linear-gradient(160deg, #1e1b16 0%, #2a2420 100%)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          padding: '28px 24px 0',
        }}>
          {/* Glow */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'radial-gradient(ellipse 70% 55% at 50% 60%, rgba(201,168,76,0.08) 0%, transparent 70%)',
          }} />

          {/* Prev arrow */}
          <button
            onClick={() => navigate(idx - 1)}
            style={{
              position: 'absolute', top: '50%', left: 12, zIndex: 10,
              transform: 'translateY(-50%)',
              width: 32, height: 32, borderRadius: '50%',
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: 13,
            }}
          >‹</button>

          {/* Next arrow */}
          <button
            onClick={() => navigate(idx + 1)}
            style={{
              position: 'absolute', top: '50%', right: 12, zIndex: 10,
              transform: 'translateY(-50%)',
              width: 32, height: 32, borderRadius: '50%',
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: 13,
            }}
          >›</button>

          {/* Watch image */}
          <Image
            key={idx}
            src={watch.img}
            alt={watch.model}
            width={420}
            height={480}
            style={{
              width: '100%', maxWidth: 420,
              display: 'block', position: 'relative', zIndex: 1,
              opacity: animating ? 0 : 1,
              transform: animating ? `translateX(${dir * 24}px)` : 'translateX(0)',
              transition: 'opacity 0.3s ease, transform 0.3s ease',
              filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.55))',
              objectFit: 'contain',
              height: 'auto',
            }}
          />

          <WatchStateControl
            catalogWatchId={watch.id}
            source="hero"
            tone="dark"
          />

          {/* Top-left: brand + model */}
          <div style={{ position: 'absolute', top: 18, left: 18, zIndex: 3 }}>
            <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.85)', marginBottom: 4 }}>
              {watch.brand.toUpperCase()}
            </div>
            <div style={{ fontFamily: 'var(--font-cormorant)', fontSize: 22, color: '#faf8f4', fontWeight: 400, lineHeight: 1.1 }}>
              {watch.model}
            </div>
          </div>

          {/* Bottom-right: price pill */}
          <div style={{
            position: 'absolute', bottom: 20, right: 16, zIndex: 3,
            background: 'rgba(20,16,12,0.72)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, padding: '10px 14px',
            backdropFilter: 'blur(10px)',
            textAlign: 'right',
          }}>
            <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 19, fontWeight: 600, color: '#C9A84C', lineHeight: 1 }}>{fmt(watch.value)}</div>
            <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginTop: 5 }}>{watch.dial}</div>
            <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)', marginTop: 2 }}>{watch.ref}</div>
          </div>

          {/* Dots */}
          <div style={{
            display: 'flex', gap: 5, justifyContent: 'center',
            position: 'absolute', bottom: 14, left: 0, right: 0, zIndex: 10,
          }}>
            {CAROUSEL_WATCHES.map((_, i) => (
              <div
                key={i}
                onClick={() => navigate(i)}
                style={{
                  width: i === idx ? 14 : 4, height: 4,
                  borderRadius: i === idx ? 2 : '50%',
                  background: i === idx ? '#C9A84C' : 'rgba(255,255,255,0.25)',
                  transition: 'background 0.2s, width 0.2s',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export { CAROUSEL_WATCHES }
