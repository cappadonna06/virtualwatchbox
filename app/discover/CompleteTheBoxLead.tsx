'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { CatalogWatch } from '@/types/watch'
import { brand } from '@/lib/brand'
import { buildChrono24URL } from '@/lib/discover'
import { logDiscoverEvent } from '@/lib/discoverAnalytics'
import WatchImageOrDial from '@/components/watchbox/WatchImageOrDial'
import WatchStateControl from '@/components/collection/WatchStateControl'
import RefreshButton from './RefreshButton'

type Props = {
  watch: CatalogWatch
  gapLabel: string
  gapType: string | null
  insight: string
  personalized: boolean
  refreshSeedKey: string
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

const PANEL_BG = '#1e1b16'

export default function CompleteTheBoxLead({ watch, gapLabel, gapType, insight, personalized, refreshSeedKey }: Props) {
  const headlineNoun = headlineNounFor(gapType)
  const headlineTail = headlineTailFor(gapType, personalized)
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  return (
    <section id="lead" style={{ background: PANEL_BG, color: brand.colors.slot, position: 'relative' }}>
      <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 3 }}>
        <RefreshButton section="hero" seedKey={refreshSeedKey} variant="corner" tone="dark" />
      </div>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '64px 56px' }}>
        <div
          className="discover-complete-row"
          style={{
            display: 'grid',
            gridTemplateColumns: '1.1fr 1fr',
            gap: 64,
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
              <GoldKicker>{personalized ? 'Complete the Box' : 'This Week’s Pick'}</GoldKicker>
              <div style={{ height: 1, width: 24, background: 'rgba(201,168,76,0.6)' }} />
              <GoldKicker>{gapLabel}</GoldKicker>
            </div>

            <h2
              className="discover-complete-h2"
              style={{
                fontFamily: brand.font.serif,
                fontWeight: 300,
                fontSize: 44,
                lineHeight: 1.05,
                letterSpacing: '-0.015em',
                margin: 0,
                marginBottom: 24,
                color: brand.colors.slot,
              }}
            >
              A <em style={{ fontStyle: 'italic' }}>{headlineNoun}</em>, {headlineTail}.
            </h2>

            <p
              className="discover-complete-insight"
              style={{
                fontFamily: brand.font.serif,
                fontStyle: 'italic',
                fontSize: 17,
                lineHeight: 1.55,
                color: 'rgba(250,248,244,0.78)',
                margin: 0,
                marginBottom: 28,
                maxWidth: 480,
                textWrap: 'pretty',
              }}
            >
              {insight}
            </p>

            <div
              className="discover-complete-specs"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, auto)',
                gap: 28,
                paddingTop: 22,
                borderTop: '1px solid rgba(250,248,244,0.18)',
                marginBottom: 28,
              }}
            >
              <SpecCell label="Brand" value={watch.brand} />
              <SpecCell label="Reference" value={watch.reference} />
              <SpecCell label="Market median" value={fmt(watch.estimatedValue)} />
            </div>

            <div
              className="discover-complete-actions"
              style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}
            >
              <Link
                href={`/collection/add/${watch.id}?from=discover`}
                onClick={() => logDiscoverEvent({
                  eventType: 'click', section: 'hero', seedKey: refreshSeedKey, catalogWatchId: watch.id, slotIndex: 0,
                })}
                style={{
                  fontFamily: brand.font.sans,
                  fontSize: 10.5,
                  fontWeight: 500,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  padding: '11px 22px',
                  background: brand.colors.gold,
                  color: brand.colors.ink,
                  border: 'none',
                  borderRadius: 2,
                  textDecoration: 'none',
                  cursor: 'pointer',
                }}
              >
                View details →
              </Link>
              <a
                href={buildChrono24URL(watch.brand, watch.model)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => logDiscoverEvent({
                  eventType: 'market_click', section: 'hero', seedKey: refreshSeedKey, catalogWatchId: watch.id, slotIndex: 0,
                })}
                style={{
                  fontFamily: brand.font.sans,
                  fontSize: 10.5,
                  fontWeight: 500,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  padding: '11px 18px',
                  background: 'transparent',
                  color: brand.colors.slot,
                  border: '1px solid rgba(250,248,244,0.28)',
                  borderRadius: 2,
                  textDecoration: 'none',
                }}
              >
                {isMobile ? 'On market' : 'Find on market'}
              </a>
              {!isMobile && (
                <Link
                  href={`/playground?lead=${encodeURIComponent(watch.id)}`}
                  style={{
                    fontFamily: brand.font.sans,
                    fontSize: 10.5,
                    fontWeight: 500,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    padding: '11px 18px',
                    background: 'transparent',
                    color: brand.colors.slot,
                    border: '1px solid rgba(250,248,244,0.28)',
                    borderRadius: 2,
                    textDecoration: 'none',
                  }}
                >
                  Add to Playground
                </Link>
              )}
            </div>
          </div>

          <div
            className="discover-complete-image"
            style={{ position: 'relative', textAlign: 'center' }}
          >
            <div
              aria-hidden
              style={{
                position: 'absolute',
                top: -12,
                left: 0,
                fontFamily: brand.font.serif,
                fontStyle: 'italic',
                fontSize: 100,
                fontWeight: 300,
                color: 'rgba(201,168,76,0.10)',
                lineHeight: 0.85,
                letterSpacing: '-0.04em',
                pointerEvents: 'none',
              }}
            >
              ¶ 01
            </div>
            <Link
              href={`/collection/add/${watch.id}?from=discover`}
              onClick={() => logDiscoverEvent({
                eventType: 'click', section: 'hero', seedKey: refreshSeedKey, catalogWatchId: watch.id, slotIndex: 0,
              })}
              style={{
                position: 'relative',
                zIndex: 1,
                display: 'block',
                width: '100%',
                maxWidth: 340,
                height: 420,
                margin: '0 auto',
                filter: 'drop-shadow(0 18px 32px rgba(0,0,0,0.45))',
                textDecoration: 'none',
                color: 'inherit',
                cursor: 'pointer',
              }}
            >
              <WatchImageOrDial
                watch={watch}
                fill
                sizes="(max-width: 768px) 80vw, 340px"
                imageStyle={{ objectFit: 'contain' }}
                dialSize={260}
              />
              <div
                onClick={e => { e.stopPropagation(); e.preventDefault() }}
                style={{ position: 'absolute', left: 8, bottom: 8, zIndex: 3 }}
              >
                <WatchStateControl
                  catalogWatchId={watch.id}
                  source="discover_lead"
                  size="md"
                  layout="inline"
                  tone="dark"
                />
              </div>
            </Link>
            <div style={{ marginTop: 18 }}>
              <div
                style={{
                  fontFamily: brand.font.sans,
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'rgba(250,248,244,0.7)',
                  marginBottom: 6,
                }}
              >
                {watch.brand}
              </div>
              <div style={{ fontFamily: brand.font.serif, fontStyle: 'italic', fontSize: 22, color: brand.colors.slot }}>
                {watch.model}
              </div>
              <div
                style={{
                  fontFamily: brand.font.sans,
                  fontSize: 11,
                  color: 'rgba(250,248,244,0.55)',
                  marginTop: 4,
                  letterSpacing: '0.04em',
                }}
              >
                {watch.caseSizeMm} mm · {watch.watchType ?? 'Watch'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function headlineNounFor(gapType: string | null): string {
  if (!gapType) return 'next pick'
  const lower = gapType.toLowerCase()
  // Drop the "watch" suffix where the type-word reads awkwardly with it.
  switch (gapType) {
    case 'Integrated Bracelet': return 'integrated-bracelet piece'
    case 'Chronograph':         return 'chronograph'
    case 'GMT':                 return 'GMT'
    case 'Vintage':             return 'vintage piece'
    case 'Sport':               return 'sport piece'
    default:                    return `${lower} watch`
  }
}

function headlineTailFor(gapType: string | null, personalized: boolean): string {
  if (!personalized) return 'to lead the week'
  switch (gapType) {
    case 'Dress':               return 'the formal anchor your rotation is missing'
    case 'GMT':                 return 'the travel companion you have yet to claim'
    case 'Chronograph':         return 'the sport complication you have yet to claim'
    case 'Diver':               return 'the tool watch your rotation hasn’t earned yet'
    case 'Field':               return 'a legible daily you don’t yet reach for'
    case 'Pilot':               return 'the cockpit-bred legibility you haven’t added'
    case 'Integrated Bracelet': return 'the bracelet daily you haven’t added'
    case 'Sport':               return 'a versatile sport piece you haven’t leaned on'
    case 'Vintage':             return 'the heritage chapter you haven’t opened'
    default:                    return 'the chapter you haven’t opened yet'
  }
}

function GoldKicker({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: brand.font.sans,
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: brand.colors.gold,
      }}
    >
      {children}
    </div>
  )
}

function SpecCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div
        style={{
          fontFamily: brand.font.sans,
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'rgba(250,248,244,0.5)',
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div style={{ fontFamily: brand.font.serif, fontSize: 18, color: brand.colors.slot }}>
        {value}
      </div>
    </div>
  )
}
