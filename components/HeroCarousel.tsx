'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import WatchStateControl from '@/components/collection/WatchStateControl'
import DialSVG from '@/components/watchbox/DialSVG'
import { brand } from '@/lib/brand'
import { renderableWatches } from '@/lib/renderableWatches'
import { withVersion } from '@/lib/watchImages/cacheBust'
import { heatScore } from '@/lib/heatScore'
import { pickSeeded, todayUTC } from '@/lib/dailyShuffle'
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

/**
 * Pool size matters: too small and the daily shuffle barely changes anything;
 * too large and we drift past the prestige tier. 15 keeps the carousel inside
 * the heat-score top of the photo-having catalog while still giving 5-of-15
 * picks meaningful day-over-day variety.
 */
const CAROUSEL_POOL_SIZE = 15
const CAROUSEL_COUNT = 5

// Heat score alone skews the pool to a handful of prestige brands (Rolex,
// Patek, Lange) at the top of the catalog — every daily 5-of-15 pick ends
// up being five $20k+ watches. Diversity constraints below run before the
// daily shuffle so all 5 picks come from a pre-balanced pool.
const MAX_PER_BRAND = 2
const MAX_PER_TYPE = 4
const RELAXED_MAX_PER_BRAND = 3
// Price-band targets (sum to 13, leaving 2 wildcard slots for pass 2).
const PRICE_BAND_TARGETS = { low: 3, mid: 6, high: 4 } as const
const PRICE_BAND_LOW_MAX = 5_000
const PRICE_BAND_MID_MAX = 25_000

type PriceBand = keyof typeof PRICE_BAND_TARGETS

function priceBandOf(value: number): PriceBand {
  if (value < PRICE_BAND_LOW_MAX) return 'low'
  if (value < PRICE_BAND_MID_MAX) return 'mid'
  return 'high'
}

function toCarouselWatch(watch: typeof renderableWatches[number]): CarouselWatch {
  return {
    id: watch.id,
    img: withVersion(watch.imageUrl) ?? '',
    brand: watch.brand,
    model: watch.model,
    ref: watch.reference,
    dial: watch.dialColor,
    value: watch.estimatedValue,
    dialConfig: watch.dialConfig,
  }
}

/**
 * Build a 15-watch hero pool from the heat-ranked photo-having catalog,
 * enforcing diversity across price band, brand, and type so the daily
 * shuffle can't degenerate into five identical-feeling picks.
 *
 * Three passes:
 *  1. Walk heat-ranked watches; admit if the watch's price band isn't yet
 *     full AND brand/type caps aren't yet hit. Stops at 13 (sum of targets).
 *  2. Top up to 15 from the remaining heat-ranked leftovers respecting only
 *     the brand cap — these are the "wildcard" slots that let the highest-
 *     heat surplus brands appear without crowding everything out.
 *  3. Safety net: if constraints couldn't be satisfied (tiny catalog), relax
 *     the brand cap to 3 and refill. Guarantees pool size 15.
 */
const CAROUSEL_POOL: CarouselWatch[] = (() => {
  const ranked = [...renderableWatches]
    .sort((a, b) => heatScore(b) - heatScore(a) || a.id.localeCompare(b.id))

  const pool: typeof renderableWatches = []
  const inPool = new Set<string>()
  const brandCount = new Map<string, number>()
  const typeCount = new Map<string, number>()
  const bandCount: Record<PriceBand, number> = { low: 0, mid: 0, high: 0 }

  const targetCount = PRICE_BAND_TARGETS.low + PRICE_BAND_TARGETS.mid + PRICE_BAND_TARGETS.high

  // Pass 1: diversity-enforced fill to 13.
  for (const w of ranked) {
    if (pool.length >= targetCount) break
    if (inPool.has(w.id)) continue
    const band = priceBandOf(w.estimatedValue)
    if (bandCount[band] >= PRICE_BAND_TARGETS[band]) continue
    if ((brandCount.get(w.brand) ?? 0) >= MAX_PER_BRAND) continue
    if ((typeCount.get(w.watchType) ?? 0) >= MAX_PER_TYPE) continue
    pool.push(w)
    inPool.add(w.id)
    bandCount[band] += 1
    brandCount.set(w.brand, (brandCount.get(w.brand) ?? 0) + 1)
    typeCount.set(w.watchType, (typeCount.get(w.watchType) ?? 0) + 1)
  }

  // Pass 2: top up to CAROUSEL_POOL_SIZE from heat-ranked leftovers (brand cap only).
  for (const w of ranked) {
    if (pool.length >= CAROUSEL_POOL_SIZE) break
    if (inPool.has(w.id)) continue
    if ((brandCount.get(w.brand) ?? 0) >= MAX_PER_BRAND) continue
    pool.push(w)
    inPool.add(w.id)
    brandCount.set(w.brand, (brandCount.get(w.brand) ?? 0) + 1)
  }

  // Pass 3: safety net — relax brand cap so the pool is never short.
  for (const w of ranked) {
    if (pool.length >= CAROUSEL_POOL_SIZE) break
    if (inPool.has(w.id)) continue
    if ((brandCount.get(w.brand) ?? 0) >= RELAXED_MAX_PER_BRAND) continue
    pool.push(w)
    inPool.add(w.id)
    brandCount.set(w.brand, (brandCount.get(w.brand) ?? 0) + 1)
  }

  return pool.map(toCarouselWatch)
})()

/**
 * SSR-safe initial selection: the deterministic top of the pool. The client
 * swaps to the date-seeded daily shuffle on mount — same item count, no
 * layout shift, just a different ordering. Avoids a hydration mismatch from
 * computing today's date at render time.
 */
const INITIAL_CAROUSEL: CarouselWatch[] = CAROUSEL_POOL.slice(0, CAROUSEL_COUNT)

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
  const [dateSeed, setDateSeed] = useState<string | null>(null)
  const prefersReducedMotion = usePrefersReducedMotion()

  // Daily shuffle of the heat-score top pool. Initial render (SSR + first
  // hydration) uses INITIAL_CAROUSEL so the markup matches; useEffect swaps
  // in today's seeded selection once we're on the client.
  useEffect(() => {
    setDateSeed(todayUTC())
  }, [])

  const carouselWatches = useMemo(
    () => (dateSeed ? pickSeeded(CAROUSEL_POOL, dateSeed, CAROUSEL_COUNT) : INITIAL_CAROUSEL),
    [dateSeed],
  )

  const watch = carouselWatches[idx] ?? FALLBACK_WATCH
  const total = carouselWatches.length

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
          gridTemplateColumns: 'minmax(0, 1.05fr) minmax(0, 0.95fr)',
          minHeight: 'clamp(380px, 44vh, 460px)',
          alignItems: 'stretch',
        }}
      >

        {/* Left: static text */}
        <div
          className="hero-text"
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '44px 56px',
          }}
        >
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, fontFamily: brand.font.sans, fontSize: brand.text.label, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: brand.colors.muted }}>
            <span style={{ width: 28, height: 1, background: brand.colors.goldDeep, display: 'inline-block', flexShrink: 0 }} />
            The Digital Home for Every Collector
          </div>
          <h1
            className="hero-h1"
            style={{
              fontFamily: brand.font.serif,
              fontSize: brand.text.hero,
              fontWeight: 300,
              lineHeight: 0.98,
              letterSpacing: '-0.015em',
              color: brand.colors.ink,
              margin: '26px 0 28px',
            }}
          >
            Showcase Your<br />
            <em style={{ fontStyle: 'italic', fontWeight: 300 }}>Timepieces.</em><br />
            Discover <em style={{ fontStyle: 'italic', fontWeight: 300 }}>What&apos;s Next.</em>
          </h1>
          <p style={{ fontFamily: brand.font.sans, fontSize: brand.text.lead, lineHeight: 1.55, color: brand.colors.inkSoft, maxWidth: 440, marginBottom: 38 }}>
            Organize what you own, explore what you want, discover what&apos;s next.
          </p>
          <div className="hero-actions" data-nosnippet="" style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/collection"
              className="hero-action"
              style={{
                fontFamily: brand.font.sans,
                fontSize: brand.text.label,
                fontWeight: 600,
                letterSpacing: '0.08em',
                padding: '15px 30px',
                background: brand.colors.ink,
                color: brand.colors.bg,
                border: '1px solid transparent',
                borderRadius: 5,
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
                fontSize: brand.text.label,
                fontWeight: 600,
                letterSpacing: '0.08em',
                padding: '15px 30px',
                background: 'transparent',
                color: brand.colors.ink,
                border: `1px solid ${brand.colors.borderLight}`,
                borderRadius: 5,
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
          <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 9, fontFamily: brand.font.sans, fontSize: brand.text.bodySm, color: brand.colors.muted, letterSpacing: '0.03em' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: brand.colors.goldDeep, flexShrink: 0 }} />
            Free to build. No account required.
          </div>
        </div>

        {/* Right: dark carousel panel */}
        <div
          className="hero-panel"
          data-nosnippet=""
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            position: 'relative',
            overflow: 'hidden',
            background: `radial-gradient(120% 90% at 70% 18%, ${brand.colors.heroDark2} 0%, ${brand.colors.heroDark1} 58%)`,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Glow */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'radial-gradient(ellipse 70% 50% at 52% 60%, rgba(201,168,76,0.10) 0%, transparent 70%)',
          }} />

          {/* Top: brand + model (left), estimated value (right) */}
          <div style={{ position: 'relative', zIndex: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, padding: '36px 38px 0' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontFamily: brand.font.sans, fontSize: brand.text.labelSm, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: brand.colors.gold }}>
                <span style={{ width: 24, height: 1, background: brand.colors.gold, display: 'inline-block', flexShrink: 0 }} />
                {watch.brand.toUpperCase()}
              </div>
              <h3 style={{ fontFamily: brand.font.serif, fontSize: 30, fontWeight: 400, color: brand.colors.onDark, marginTop: 12, lineHeight: 1.05 }}>
                {watch.model}
              </h3>
              <div style={{ fontFamily: brand.font.sans, fontSize: brand.text.labelSm, letterSpacing: '0.12em', textTransform: 'uppercase', color: brand.colors.onDarkMuted, marginTop: 8 }}>
                {watch.ref}
              </div>
            </div>
            {total > 0 && (
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontFamily: brand.font.sans, fontSize: brand.text.labelSm, letterSpacing: '0.12em', textTransform: 'uppercase', color: brand.colors.onDarkMuted }}>
                  Estimated Value
                </div>
                <div style={{ fontFamily: brand.font.sans, fontSize: brand.text.priceLg, fontWeight: 600, color: brand.colors.gold, marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>
                  {fmt(watch.value)}
                </div>
              </div>
            )}
          </div>

          {/* Centered watch image */}
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              flex: 1,
              display: 'grid',
              placeItems: 'center',
              padding: '8px 38px 0',
              minHeight: 0,
            }}
          >
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                maxWidth: 360,
                opacity: animating ? 0 : 1,
                transform: animating ? `translateX(${dir * 24}px)` : 'translateX(0)',
                transition: prefersReducedMotion ? 'none' : 'opacity 0.35s ease, transform 0.35s ease',
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
                  sizes="(max-width: 1080px) 100vw, 45vw"
                  style={{
                    display: 'block',
                    filter: 'drop-shadow(0 26px 44px rgba(0,0,0,0.55))',
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
                    size={240}
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

          {/* Bottom: dots (left) + nav buttons (right) */}
          {total > 0 && (
            <div style={{ position: 'relative', zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 38px 30px' }}>
              <div style={{ display: 'flex', gap: 7, marginLeft: 52 }}>
                {carouselWatches.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => navigate(i, { manual: true })}
                    aria-label={`Show watch ${i + 1}`}
                    style={{
                      width: i === idx ? 22 : 7, height: 7,
                      borderRadius: i === idx ? 4 : '50%',
                      background: i === idx ? brand.colors.gold : 'rgba(245,241,233,0.25)',
                      border: 'none', padding: 0, cursor: 'pointer',
                      transition: 'width 0.25s, background 0.25s',
                    }}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => navigate(idx - 1, { manual: true })}
                  aria-label="Previous watch"
                  style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(245,241,233,0.07)', border: '1px solid rgba(245,241,233,0.16)', color: brand.colors.onDark, fontSize: 18, display: 'grid', placeItems: 'center', cursor: 'pointer', transition: 'background 0.15s' }}
                >‹</button>
                <button
                  onClick={() => navigate(idx + 1, { manual: true })}
                  aria-label="Next watch"
                  style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(245,241,233,0.07)', border: '1px solid rgba(245,241,233,0.16)', color: brand.colors.onDark, fontSize: 18, display: 'grid', placeItems: 'center', cursor: 'pointer', transition: 'background 0.15s' }}
                >›</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
