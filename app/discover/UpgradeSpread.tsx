'use client'

import Link from 'next/link'
import type { CSSProperties } from 'react'
import type { CatalogWatch } from '@/types/watch'
import { brand } from '@/lib/brand'
import type { UpgradeSuggestion } from '@/lib/discover'
import { buildChrono24URL, upgradeDeltaFor } from '@/lib/discover'
import { logDiscoverEvent } from '@/lib/discoverAnalytics'
import WatchImageOrDial from '@/components/watchbox/WatchImageOrDial'
import WatchStateControl from '@/components/collection/WatchStateControl'
import EditorialHeader from './EditorialHeader'
import RefreshButton from './RefreshButton'

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

type UpgradeSpreadProps = {
  suggestions: UpgradeSuggestion[]
  rationaleByPair?: Map<string, string>
}

export default function UpgradeSpread({ suggestions, rationaleByPair }: UpgradeSpreadProps) {
  return (
    <section
      id="upgrade"
      style={{
        maxWidth: 1280,
        margin: '0 auto',
        padding: '64px 56px 32px',
      }}
    >
      <EditorialHeader
        kicker="§ 02"
        title="Upgrade this watch."
        sub="Step-up paths that preserve your box balance. Brand-family logic; grounded and aspirational picks."
      />
      <div
        className="discover-upgrade-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 16,
        }}
      >
        {suggestions.map((s, i) => {
          const pairKey = `${s.ownedWatch.id}|${s.upgradeWatch.id}`
          const customRationale = rationaleByPair?.get(pairKey) ?? null
          return (
            <UpgradeCard
              key={`${s.ownedWatch.id}-${s.upgradeWatch.id}`}
              suggestion={s}
              slotIndex={i}
              rationale={customRationale}
            />
          )
        })}
      </div>
    </section>
  )
}

function UpgradeCard({
  suggestion,
  slotIndex,
  rationale,
}: {
  suggestion: UpgradeSuggestion
  slotIndex: number
  rationale: string | null
}) {
  const { ownedWatch: from, upgradeWatch: to, balanceNote } = suggestion
  const delta = upgradeDeltaFor(from, to)
  const seedKey = `upgrade::${from.id}`
  const note = rationale ?? balanceNote

  return (
    <article
      style={{
        background: brand.colors.slot,
        border: `1px solid ${brand.colors.border}`,
        padding: '32px 36px 28px',
        position: 'relative',
      }}
    >
      <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 2 }}>
        <RefreshButton section="upgrade" seedKey={seedKey} variant="corner" />
      </div>
      <div
        className="discover-upgrade-pair"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          gap: 12,
          alignItems: 'center',
          marginBottom: 18,
        }}
      >
        <UpgradeSide
          watch={from}
          kicker="You own"
          kickerColor={brand.colors.muted}
          modelItalic={false}
          imageShadow="drop-shadow(0 16px 28px rgba(26,20,16,0.22))"
          showHalo={false}
          href={`/collection/watch/${from.id}?from=discover`}
          onNavigate={() => logDiscoverEvent({
            eventType: 'click', section: 'upgrade', seedKey, catalogWatchId: from.id, slotIndex,
          })}
          showStateControl={false}
        />

        <div
          className="discover-upgrade-arrow"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
            padding: '0 8px',
          }}
        >
          <div
            style={{
              fontFamily: brand.font.sans,
              fontSize: 8.5,
              fontWeight: 600,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: brand.colors.muted,
              marginBottom: 2,
            }}
          >
            Step up
          </div>
          <div
            style={{
              fontFamily: brand.font.serif,
              fontStyle: 'italic',
              fontSize: 26,
              fontWeight: 400,
              lineHeight: 1,
              color: brand.colors.gold,
              letterSpacing: '-0.005em',
            }}
          >
            {delta}
          </div>
          <GoldArrow size={44} />
        </div>

        <UpgradeSide
          watch={to}
          kicker="Consider"
          kickerColor={brand.colors.gold}
          modelItalic
          imageShadow="drop-shadow(0 20px 32px rgba(26,20,16,0.26))"
          showHalo
          href={`/collection/add/${to.id}?from=discover`}
          onNavigate={() => logDiscoverEvent({
            eventType: 'click', section: 'upgrade', seedKey, catalogWatchId: to.id, slotIndex,
          })}
          showStateControl
        />
      </div>

      <p
        style={{
          fontFamily: brand.font.serif,
          fontStyle: 'italic',
          fontSize: 14.5,
          lineHeight: 1.55,
          color: brand.colors.inkSoft,
          margin: 0,
          paddingTop: 18,
          borderTop: `1px solid ${brand.colors.border}`,
          marginBottom: 14,
          textWrap: 'pretty',
        }}
      >
        {note}
      </p>

      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        <a
          href={buildChrono24URL(to.brand, to.model)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => logDiscoverEvent({
            eventType: 'market_click', section: 'upgrade', seedKey, catalogWatchId: to.id, slotIndex,
          })}
          style={{
            fontFamily: brand.font.sans,
            fontSize: 10.5,
            fontWeight: 500,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: brand.colors.ink,
            textDecoration: 'none',
          }}
        >
          Find on market ↗
        </a>
      </div>
    </article>
  )
}

function UpgradeSide({
  watch,
  kicker,
  kickerColor,
  modelItalic,
  imageShadow,
  showHalo,
  href,
  onNavigate,
  showStateControl,
}: {
  watch: CatalogWatch
  kicker: string
  kickerColor: string
  modelItalic: boolean
  imageShadow: string
  showHalo: boolean
  href: string
  onNavigate: () => void
  showStateControl: boolean
}) {
  const linkStyle: CSSProperties = {
    display: 'block',
    color: 'inherit',
    textDecoration: 'none',
    cursor: 'pointer',
  }

  return (
    <Link href={href} style={linkStyle} onClick={onNavigate}>
      <div style={{ textAlign: 'center', position: 'relative' }}>
        <div
          className="discover-upgrade-image-well"
          style={{
            width: '100%',
            height: 300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px 0',
            position: 'relative',
          }}
        >
          {showHalo && (
            <div
              aria-hidden
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 320,
                height: 320,
                background:
                  'radial-gradient(ellipse at center, rgba(201,168,76,0.28) 0%, rgba(201,168,76,0.12) 40%, rgba(201,168,76,0) 72%)',
                pointerEvents: 'none',
              }}
            />
          )}
          <div
            style={{
              position: 'relative',
              width: 260,
              height: 260,
              zIndex: 1,
            }}
          >
            <WatchImageOrDial
              watch={watch}
              fill
              sizes="260px"
              imageStyle={{ objectFit: 'contain', filter: imageShadow }}
              dialSize={180}
            />
          </div>
          {showStateControl && (
            <div
              onClick={e => { e.stopPropagation(); e.preventDefault() }}
              style={{ position: 'absolute', left: 16, bottom: 12, zIndex: 3 }}
            >
              <WatchStateControl
                catalogWatchId={watch.id}
                source="discover_upgrade"
                size="sm"
                layout="inline"
              />
            </div>
          )}
        </div>
        <div
          style={{
            fontFamily: brand.font.sans,
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: kickerColor,
            marginBottom: 6,
          }}
        >
          {kicker}
        </div>
        <div
          style={{
            fontFamily: brand.font.sans,
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: brand.colors.ink,
            marginBottom: 4,
          }}
        >
          {watch.brand}
        </div>
        <div
          style={{
            fontFamily: brand.font.serif,
            fontSize: 21,
            fontStyle: modelItalic ? 'italic' : 'normal',
            lineHeight: 1.1,
            color: brand.colors.ink,
          }}
        >
          {watch.model}
        </div>
        <div
          style={{
            fontFamily: brand.font.sans,
            fontSize: 11.5,
            color: brand.colors.muted,
            marginTop: 4,
            letterSpacing: '0.04em',
          }}
        >
          {fmt(watch.estimatedValue)} · {watch.caseSizeMm} mm
        </div>
      </div>
    </Link>
  )
}

function GoldArrow({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height="10" viewBox="0 0 44 10" fill="none" aria-hidden>
      <line x1="0" y1="5" x2="40" y2="5" stroke={brand.colors.gold} strokeWidth="1" />
      <polyline points="35,1 40,5 35,9" fill="none" stroke={brand.colors.gold} strokeWidth="1" />
    </svg>
  )
}
