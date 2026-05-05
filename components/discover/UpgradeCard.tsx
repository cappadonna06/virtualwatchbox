'use client'

import { useRouter } from 'next/navigation'
import type { CatalogWatch } from '@/types/watch'
import { brand } from '@/lib/brand'
import WatchImageOrDial from '@/components/watchbox/WatchImageOrDial'
import { useCollectionSession } from '@/app/collection/CollectionSessionProvider'
import { buildChrono24URL, type UpgradeSuggestion } from '@/lib/discover'

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function thumb(watch: CatalogWatch) {
  return (
    <div style={{ width: 72, height: 72, position: 'relative', flexShrink: 0 }}>
      <WatchImageOrDial
        watch={watch}
        fill
        sizes="72px"
        imageStyle={{ objectFit: 'contain' }}
        dialSize={64}
      />
    </div>
  )
}

export default function UpgradeCard({ suggestion }: { suggestion: UpgradeSuggestion }) {
  const router = useRouter()
  const { setWatchSavedState, isWatchTarget } = useCollectionSession()
  const upgradeIsTarget = isWatchTarget(suggestion.upgradeWatch.id)

  return (
    <article
      style={{
        background: brand.colors.white,
        border: `1px solid ${brand.colors.border}`,
        borderRadius: brand.radius.md,
        padding: '20px 24px',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12, flex: '1 1 220px', minWidth: 200 }}>
          {thumb(suggestion.ownedWatch)}
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: brand.font.sans,
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: brand.colors.muted,
              }}
            >
              You Own
            </div>
            <div
              style={{
                fontFamily: brand.font.sans,
                fontSize: 13,
                fontWeight: 500,
                color: brand.colors.ink,
                lineHeight: 1.25,
                marginTop: 2,
              }}
            >
              {suggestion.ownedWatch.brand} {suggestion.ownedWatch.model}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: '0 0 auto' }}>
          {suggestion.isGrail && (
            <svg width="14" height="12" viewBox="0 0 14 12" fill={brand.colors.gold} aria-label="Grail" role="img">
              <path d="M2 2 L4 5 L7 1 L10 5 L12 2 L11 9 H3 Z" />
            </svg>
          )}
          {suggestion.isTarget && !suggestion.isGrail && (
            <span
              style={{
                fontFamily: brand.font.sans,
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: '0.1em',
                color: brand.colors.gold,
                border: `1px solid ${brand.colors.gold}`,
                borderRadius: brand.radius.pill,
                padding: '2px 8px',
              }}
            >
              TARGET
            </span>
          )}
          <span
            style={{
              fontFamily: brand.font.sans,
              fontSize: 20,
              color: brand.colors.gold,
              lineHeight: 1,
            }}
            aria-hidden="true"
          >
            →
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12, flex: '1 1 280px', minWidth: 240 }}>
          {thumb(suggestion.upgradeWatch)}
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontFamily: brand.font.sans,
                fontSize: 13,
                color: brand.colors.ink,
                fontWeight: 500,
                lineHeight: 1.25,
              }}
            >
              {suggestion.upgradeWatch.brand} {suggestion.upgradeWatch.model}
            </div>
            <div
              style={{
                fontFamily: brand.font.sans,
                fontSize: 12,
                color: brand.colors.gold,
                marginTop: 2,
              }}
            >
              {fmt(suggestion.upgradeWatch.estimatedValue)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8, alignItems: 'flex-start' }}>
              <a
                href={buildChrono24URL(suggestion.upgradeWatch.brand, suggestion.upgradeWatch.model)}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontFamily: brand.font.sans,
                  fontSize: 11,
                  color: brand.colors.gold,
                  textDecoration: 'none',
                }}
              >
                Find For Sale ↗
              </a>
              <button
                type="button"
                onClick={() => router.push('/playground')}
                style={{
                  fontFamily: brand.font.sans,
                  fontSize: 11,
                  color: brand.colors.ink,
                  background: 'transparent',
                  border: `1px solid ${brand.colors.borderLight}`,
                  borderRadius: brand.radius.btn,
                  padding: '5px 10px',
                  cursor: 'pointer',
                }}
              >
                Add to Playground
              </button>
              <button
                type="button"
                disabled={upgradeIsTarget}
                onClick={() => setWatchSavedState(suggestion.upgradeWatch.id, 'target', { source: 'sidebar' })}
                style={{
                  fontFamily: brand.font.sans,
                  fontSize: 11,
                  color: upgradeIsTarget ? brand.colors.gold : brand.colors.muted,
                  background: 'transparent',
                  border: 'none',
                  cursor: upgradeIsTarget ? 'default' : 'pointer',
                  padding: 0,
                }}
              >
                {upgradeIsTarget ? '✓ Target set' : 'Set as Target'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 16,
          paddingTop: 16,
          borderTop: `1px solid ${brand.colors.border}`,
        }}
      >
        <div
          style={{
            fontFamily: brand.font.serif,
            fontSize: 18,
            fontWeight: 500,
            color: brand.colors.ink,
            lineHeight: 1.25,
          }}
        >
          {suggestion.headline}
        </div>
        <p
          style={{
            fontFamily: brand.font.sans,
            fontSize: 13,
            color: brand.colors.muted,
            lineHeight: 1.6,
            marginTop: 6,
            marginBottom: 0,
          }}
        >
          {suggestion.balanceNote}
        </p>
      </div>
    </article>
  )
}
