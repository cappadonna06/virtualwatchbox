'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import WatchStateControl from '@/components/collection/WatchStateControl'
import DialSVG from '@/components/watchbox/DialSVG'
import { brand } from '@/lib/brand'
import { renderableWatches } from '@/lib/renderableWatches'
import { usePrefersReducedMotion } from '@/components/collection/useResponsiveState'

export interface CarouselWatch {
  id: string
  img: string
  brand: string
  model: string
  ref: string
  dial: string
  value: number
  dialConfig: {
    dialColor: string
    markerColor: string
    handColor: string
  }
}

const CAROUSEL_WATCHES: CarouselWatch[] = renderableWatches.slice(0, 5).map(watch => ({
  id: watch.id,
  img: watch.imageUrl ?? '',
  brand: watch.brand,
  model: watch.model,
  ref: watch.reference,
  dial: watch.dialColor,
  value: watch.estimatedValue,
  dialConfig: watch.dialConfig,
}))

const FALLBACK_WATCH: CarouselWatch = {
  id: 'hero-fallback',
  img: '',
  brand: 'Virtual Watchbox',
  model: 'Build Your Box',
  ref: 'Add watches to begin',
  dial: 'Curated collection',
  value: 0,
  dialConfig: {
    dialColor: '#111111',
    markerColor: '#FAF8F4',
    handColor: '#C9A84C',
  },
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export default function HeroCarousel() {
  const [idx, setIdx] = useState(0)
  const [animating, setAnimating] = useState(false)
  const [dir, setDir] = useState(1)
  const [hovered, setHovered] = useState(false)
  const [manualPaused, setManualPaused] = useState(false)
  const prefersReducedMotion = usePrefersReducedMotion()

  const watch = CAROUSEL_WATCHES[idx] ?? FALLBACK_WATCH
  const total = CAROUSEL_WATCHES.length

  function navigate(newIdx: number, options?: { manual?: boolean }) {
    if (total === 0) return
    if (animating) return
    if (options?.manual) setManualPaused(true)
    setDir(newIdx > idx ? 1 : -1)
    setAnimating(true)
    setTimeout(() => {
      setIdx(((newIdx % total) + total) % total)
      setAnimating(false)
    }, 300)
  }

  useEffect(() => {
    if (total === 0 || prefersReducedMotion || hovered || manualPaused || animating) return

    const timer = window.setTimeout(() => {
      navigate(idx + 1)
    }, 7000)

    return () => window.clearTimeout(timer)
  }, [animating, hovered, idx, manualPaused, prefersReducedMotion, total])

  return (
    <section style={{ padding: 0, borderBottom: `1px solid ${brand.colors.border}` }}>
      <div
        className="hero-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 392px',
          minHeight: 'clamp(350px, 44vh, 430px)',
          alignItems: 'stretch',
        }}
      >

        {/* Left: static text */}
        <div className="hero-text" style={{ padding: '60px 56px 56px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontFamily: brand.font.sans, fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: brand.colors.muted, marginBottom: 18 }}>
            The Digital Home for Every Collector
          </div>
          <h1
            className="hero-h1"
            style={{
              fontFamily: brand.font.serif,
              fontSize: 'clamp(46px, 5vw, 72px)',
              fontWeight: 300,
              lineHeight: 1.0,
              letterSpacing: '-0.01em',
              color: brand.colors.ink,
              marginBottom: 22,
            }}
          >
            Showcase Your<br />
            <em style={{ fontStyle: 'italic', fontWeight: 300 }}>Timepieces.</em>
          </h1>
          <p style={{ fontFamily: brand.font.sans, fontSize: 13, lineHeight: 1.8, color: brand.colors.muted, maxWidth: 360, marginBottom: 28 }}>
            Organize what you own, explore what you want,<br />discover what&apos;s next.
          </p>
          <div className="hero-actions" style={{ display: 'flex', gap: 12 }}>
            <Link
              href="/collection"
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
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: brand.shadow.sm,
              }}
            >
              Build Your Box
            </Link>
            <Link
              href="/collection/add?dest=explore"
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
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              Explore Watches
            </Link>
          </div>
          <div style={{ marginTop: 12, fontFamily: brand.font.sans, fontSize: 11, color: brand.colors.muted, letterSpacing: '0.03em' }}>
            Free to build. No account required.
          </div>
        </div>

        {/* Right: dark carousel panel */}
        <div
          className="hero-panel"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            position: 'relative',
            overflow: 'hidden',
            background: `linear-gradient(160deg, ${brand.colors.heroDark1} 0%, ${brand.colors.heroDark2} 100%)`,
            display: 'flex',
            alignItems: 'stretch',
            justifyContent: 'center',
            padding: '14px 14px 0',
          }}
        >
          {/* Glow */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'radial-gradient(ellipse 70% 55% at 50% 60%, rgba(201,168,76,0.08) 0%, transparent 70%)',
          }} />

          {total > 0 && (
            <>
              <button
                onClick={() => navigate(idx - 1, { manual: true })}
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

              <button
                onClick={() => navigate(idx + 1, { manual: true })}
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
            </>
          )}

          <div
            style={{
              position: 'relative',
              zIndex: 1,
              flex: 1,
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '74px 16px 26px',
              minHeight: 0,
            }}
          >
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                maxWidth: 266,
                maxHeight: '100%',
                opacity: animating ? 0 : 1,
                transform: animating ? `translateX(${dir * 24}px)` : 'translateX(0)',
                transition: prefersReducedMotion ? 'none' : 'opacity 0.3s ease, transform 0.3s ease',
                willChange: 'transform, opacity',
                pointerEvents: 'none',
              }}
            >
              {watch.img ? (
                <Image
                  key={idx}
                  src={watch.img}
                  alt={watch.model}
                  fill
                  sizes="392px"
                  style={{
                    display: 'block',
                    filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.55))',
                    objectFit: 'contain',
                    objectPosition: 'center center',
                  }}
                />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <DialSVG
                    dialColor={watch.dialConfig.dialColor}
                    markerColor={watch.dialConfig.markerColor}
                    handColor={watch.dialConfig.handColor}
                    size={220}
                  />
                </div>
              )}
            </div>
          </div>

          {total > 0 && (
            <WatchStateControl
              catalogWatchId={watch.id}
              source="hero"
              tone="dark"
            />
          )}

          {/* Top-left: brand + model */}
          <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 3, maxWidth: 150 }}>
            <div style={{ fontFamily: brand.font.sans, fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
              Featured Watch
            </div>
            <div style={{ fontFamily: brand.font.sans, fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.85)', marginBottom: 4 }}>
              {watch.brand.toUpperCase()}
            </div>
            <div style={{ fontFamily: brand.font.serif, fontSize: 18, color: '#faf8f4', fontWeight: 400, lineHeight: 1.1 }}>
              {watch.model}
            </div>
          </div>

          {/* Top-right: value pill */}
          {total > 0 && (
            <div style={{
            position: 'absolute', top: 14, right: 14, zIndex: 3,
            background: 'rgba(20,16,12,0.72)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, padding: '8px 12px',
            backdropFilter: 'blur(10px)',
            textAlign: 'right',
            minWidth: 132,
          }}>
            <div style={{ fontFamily: brand.font.sans, fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.32)', marginBottom: 6 }}>
              Estimated Value
            </div>
            <div style={{ fontFamily: brand.font.serif, fontSize: 18, fontWeight: 500, color: '#C9A84C', lineHeight: 1 }}>{fmt(watch.value)}</div>
            <div style={{ fontFamily: brand.font.sans, fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginTop: 6 }}>{watch.dial}</div>
            <div style={{ fontFamily: brand.font.sans, fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)', marginTop: 2 }}>{watch.ref}</div>
            </div>
          )}

          {/* Dots */}
          {total > 0 && (
            <div style={{
            display: 'flex', gap: 5, justifyContent: 'center',
            position: 'absolute', bottom: 10, left: 0, right: 0, zIndex: 10,
            }}>
            {CAROUSEL_WATCHES.map((_, i) => (
              <div
                key={i}
                onClick={() => navigate(i, { manual: true })}
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
          )}
        </div>
      </div>
    </section>
  )
}

export { CAROUSEL_WATCHES }
