'use client'

import { brand } from '@/lib/brand'
import type { UpgradeSuggestion } from '@/lib/discover'
import { buildChrono24URL, upgradeDeltaFor, isAspirationalUpgrade } from '@/lib/discover'
import WatchImageOrDial from '@/components/watchbox/WatchImageOrDial'
import EditorialHeader from './EditorialHeader'

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export default function UpgradeSpread({ suggestions }: { suggestions: UpgradeSuggestion[] }) {
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
        sub="Step-up paths that preserve your box balance. Brand-family logic; two grounded, two stretch."
      />
      <div
        className="discover-upgrade-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 16,
        }}
      >
        {suggestions.map((s) => (
          <UpgradeCard key={`${s.ownedWatch.id}-${s.upgradeWatch.id}`} suggestion={s} />
        ))}
      </div>
    </section>
  )
}

function UpgradeCard({ suggestion }: { suggestion: UpgradeSuggestion }) {
  const { ownedWatch: from, upgradeWatch: to, balanceNote } = suggestion
  const aspirational = isAspirationalUpgrade(from, to)
  const delta = upgradeDeltaFor(from, to)

  return (
    <article
      style={{
        background: brand.colors.slot,
        border: `1px solid ${brand.colors.border}`,
        padding: '28px 32px 24px',
        position: 'relative',
      }}
    >
      {aspirational && (
        <div
          style={{
            position: 'absolute',
            top: 24,
            right: 28,
            fontFamily: brand.font.sans,
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: brand.colors.gold,
            padding: '4px 10px',
            border: `1px solid ${brand.colors.gold}`,
            borderRadius: 20,
            background: 'rgba(201,168,76,0.06)',
            zIndex: 2,
          }}
        >
          Stretch
        </div>
      )}

      <div
        className="discover-upgrade-pair"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          gap: 18,
          alignItems: 'center',
          marginBottom: 22,
        }}
      >
        <UpgradeSide
          watch={from}
          kicker="You own"
          kickerColor={brand.colors.muted}
          serifItalic={false}
          imageBoxBorder={brand.colors.border}
          imageBoxShadow={undefined}
        />

        <div
          className="discover-upgrade-arrow"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <div style={{ fontFamily: brand.font.serif, fontStyle: 'italic', fontSize: 14, color: brand.colors.gold }}>
            {delta}
          </div>
          <GoldArrow />
          <div
            style={{
              fontFamily: brand.font.sans,
              fontSize: 8.5,
              fontWeight: 600,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: brand.colors.muted,
              marginTop: 4,
            }}
          >
            Step up
          </div>
        </div>

        <UpgradeSide
          watch={to}
          kicker="Consider"
          kickerColor={brand.colors.gold}
          serifItalic
          imageBoxBorder={brand.colors.gold}
          imageBoxShadow="inset 0 0 0 1px rgba(201,168,76,0.2)"
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
        {balanceNote}
      </p>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div
          style={{
            fontFamily: brand.font.sans,
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: brand.colors.muted,
          }}
        >
          {from.brand} → {to.brand}
        </div>
        <div style={{ display: 'flex', gap: 18 }}>
          <span
            style={{
              fontFamily: brand.font.sans,
              fontSize: 10.5,
              fontWeight: 500,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: brand.colors.mutedDark,
            }}
          >
            Set as target
          </span>
          <a
            href={buildChrono24URL(to.brand, to.model)}
            target="_blank"
            rel="noopener noreferrer"
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
      </div>
    </article>
  )
}

function UpgradeSide({
  watch,
  kicker,
  kickerColor,
  serifItalic,
  imageBoxBorder,
  imageBoxShadow,
}: {
  watch: import('@/types/watch').CatalogWatch
  kicker: string
  kickerColor: string
  serifItalic: boolean
  imageBoxBorder: string
  imageBoxShadow?: string
}) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div
        style={{
          background: brand.colors.paper,
          aspectRatio: '1',
          padding: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 14,
          border: `1px solid ${imageBoxBorder}`,
          boxShadow: imageBoxShadow,
          position: 'relative',
        }}
      >
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <WatchImageOrDial
            watch={watch}
            fill
            sizes="(max-width: 768px) 50vw, 240px"
            imageStyle={{ objectFit: 'contain', filter: 'drop-shadow(0 10px 18px rgba(26,20,16,0.16))' }}
            dialSize={140}
          />
        </div>
      </div>
      <div
        style={{
          fontFamily: brand.font.sans,
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: kickerColor,
          marginBottom: 4,
        }}
      >
        {kicker}
      </div>
      <div
        style={{
          fontFamily: brand.font.serif,
          fontSize: 19,
          fontStyle: serifItalic ? 'italic' : 'normal',
          lineHeight: 1.1,
          color: brand.colors.ink,
        }}
      >
        {watch.model}
      </div>
      <div
        style={{
          fontFamily: brand.font.sans,
          fontSize: 11,
          color: brand.colors.muted,
          marginTop: 3,
          letterSpacing: '0.04em',
        }}
      >
        {fmt(watch.estimatedValue)} · {watch.caseSizeMm} mm
      </div>
    </div>
  )
}

function GoldArrow() {
  return (
    <svg width="36" height="10" viewBox="0 0 32 10" fill="none" aria-hidden>
      <line x1="0" y1="5" x2="28" y2="5" stroke={brand.colors.gold} strokeWidth="1" />
      <polyline points="23,1 28,5 23,9" fill="none" stroke={brand.colors.gold} strokeWidth="1" />
    </svg>
  )
}
