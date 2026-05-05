import { brand } from '@/lib/brand'

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

interface Props {
  watchCount: number
  totalEstValue: number
  pendingChangesCount: number
  onAddWatch: () => void
  onJumpStats: () => void
}

const metaLabel = {
  fontFamily: brand.font.sans,
  fontSize: 9.5,
  fontWeight: 500,
  letterSpacing: '0.14em',
  textTransform: 'uppercase' as const,
  color: brand.colors.muted,
}

const metaValue = {
  fontFamily: brand.font.sans,
  fontSize: 14,
  fontWeight: 500,
  color: brand.colors.ink,
}

const chipDivider = {
  width: 1,
  height: 14,
  background: brand.colors.border,
}

export default function CollectionHeader({
  watchCount,
  totalEstValue,
  pendingChangesCount,
  onAddWatch,
  onJumpStats,
}: Props) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div
        style={{
          marginBottom: 24,
          display: 'flex',
          alignItems: 'baseline',
          gap: 18,
          flexWrap: 'wrap',
        }}
      >
        <h1
          style={{
            fontFamily: brand.font.serif,
            fontSize: 48,
            fontWeight: 400,
            lineHeight: 1.1,
            color: brand.colors.ink,
            margin: 0,
          }}
        >
          My Collection
        </h1>
        <p
          style={{
            fontFamily: brand.font.sans,
            fontSize: 14,
            color: brand.colors.muted,
            margin: 0,
            letterSpacing: '0.02em',
          }}
        >
          Your source of truth.
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          flexWrap: 'wrap',
          marginBottom: 24,
          paddingBottom: 20,
          borderBottom: `1px solid ${brand.colors.border}`,
        }}
      >
        <button
          onClick={onAddWatch}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontFamily: brand.font.sans,
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding: '9px 22px 9px 18px',
            background: brand.colors.ink,
            color: brand.colors.bg,
            border: 'none',
            borderRadius: brand.radius.btn,
            cursor: 'pointer',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <line x1="7" y1="2.5" x2="7" y2="11.5" />
            <line x1="2.5" y1="7" x2="11.5" y2="7" />
          </svg>
          Add Watch
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={metaLabel}>Watches</span>
            <span style={metaValue}>{watchCount}</span>
          </div>
          <span style={chipDivider} />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={metaLabel}>Est. Value</span>
            <span style={metaValue}>{fmt(totalEstValue)}</span>
          </div>
          <span style={chipDivider} />
          <a
            href="#collection-stats"
            onClick={event => {
              event.preventDefault()
              onJumpStats()
            }}
            onMouseEnter={event => {
              event.currentTarget.style.color = brand.colors.ink
            }}
            onMouseLeave={event => {
              event.currentTarget.style.color = brand.colors.muted
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              ...metaLabel,
              textDecoration: 'none',
              cursor: 'pointer',
              transition: 'color 0.15s',
            }}
          >
            Stats
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="7" y1="2" x2="7" y2="11" />
              <polyline points="3.5,7.5 7,11 10.5,7.5" />
            </svg>
          </a>
        </div>

        {pendingChangesCount > 0 && (
          <span
            style={{
              marginLeft: 'auto',
              fontFamily: brand.font.sans,
              fontSize: 11,
              color: brand.colors.gold,
              opacity: 0.85,
              letterSpacing: '0.02em',
            }}
          >
            {pendingChangesCount} unsaved
          </span>
        )}
      </div>
    </div>
  )
}
