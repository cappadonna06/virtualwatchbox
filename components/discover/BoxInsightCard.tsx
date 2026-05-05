'use client'

import { useRouter } from 'next/navigation'
import type { CatalogWatch } from '@/types/watch'
import { brand } from '@/lib/brand'
import WatchImageOrDial from '@/components/watchbox/WatchImageOrDial'
import { buildChrono24URL } from '@/lib/discover'

type Props = {
  copy: string
  missingType: string
  suggestion: CatalogWatch | null
  isGuest?: boolean
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export default function BoxInsightCard({ copy, missingType, suggestion, isGuest = false }: Props) {
  const router = useRouter()

  return (
    <div
      style={{
        background: brand.colors.white,
        border: `1px solid ${brand.colors.border}`,
        borderRadius: brand.radius.md,
        padding: '24px 28px',
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 24,
        alignItems: 'center',
      }}
    >
      <div style={{ flex: '1 1 280px', minWidth: 240 }}>
        <div
          style={{
            fontFamily: brand.font.sans,
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: brand.colors.muted,
            marginBottom: 10,
          }}
        >
          Complete the Box · {missingType}
        </div>
        <p
          style={{
            fontFamily: brand.font.serif,
            fontSize: 20,
            color: brand.colors.ink,
            margin: 0,
            lineHeight: 1.35,
          }}
        >
          {copy}
        </p>
        {!suggestion && isGuest && (
          <button
            type="button"
            onClick={() => router.push('/auth')}
            style={{
              fontFamily: brand.font.sans,
              fontSize: 12,
              color: brand.colors.gold,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              marginTop: 14,
              letterSpacing: '0.02em',
              textAlign: 'left',
            }}
          >
            Sign in to see personalized picks →
          </button>
        )}
      </div>

      {suggestion ? (
        <div
          style={{
            flex: '1 1 320px',
            minWidth: 280,
            display: 'flex',
            flexDirection: 'row',
            gap: 16,
            alignItems: 'center',
            background: brand.colors.bg,
            border: `1px solid ${brand.colors.border}`,
            borderRadius: brand.radius.md,
            padding: 16,
          }}
        >
          <div style={{ width: 96, height: 96, position: 'relative', flexShrink: 0 }}>
            <WatchImageOrDial
              watch={suggestion}
              fill
              sizes="96px"
              imageStyle={{ objectFit: 'contain' }}
              dialSize={84}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
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
              {suggestion.brand}
            </div>
            <div
              style={{
                fontFamily: brand.font.serif,
                fontSize: 18,
                color: brand.colors.ink,
                lineHeight: 1.2,
              }}
            >
              {suggestion.model}
            </div>
            <div
              style={{
                fontFamily: brand.font.sans,
                fontSize: 12,
                color: brand.colors.gold,
                marginTop: 2,
              }}
            >
              {fmt(suggestion.estimatedValue)}
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
              <a
                href={buildChrono24URL(suggestion.brand, suggestion.model)}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontFamily: brand.font.sans,
                  fontSize: 11,
                  color: brand.colors.gold,
                  textDecoration: 'none',
                }}
              >
                Find on Market ↗
              </a>
              <button
                type="button"
                onClick={() => router.push('/playground')}
                style={{
                  fontFamily: brand.font.sans,
                  fontSize: 11,
                  color: brand.colors.ink,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Add to Playground
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
