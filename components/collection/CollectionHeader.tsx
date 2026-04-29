import { brand } from '@/lib/brand'

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

interface Props {
  totalEstValue: number
  pendingChangesCount: number
  onAddWatch: () => void
  onOpenPlayground: () => void
}

export default function CollectionHeader({ totalEstValue, pendingChangesCount, onAddWatch, onOpenPlayground }: Props) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ marginBottom: 20 }}>
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
            margin: '6px 0 0',
            letterSpacing: '0.02em',
          }}
        >
          Your source of truth.
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        {/* Estimated value pill */}
        <span
          style={{
            fontFamily: brand.font.sans,
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.06em',
            padding: '5px 14px',
            borderRadius: brand.radius.pill,
            border: '1px solid rgba(201,168,76,0.4)',
            background: 'rgba(201,168,76,0.06)',
            color: brand.colors.gold,
          }}
        >
          Est. Value: {fmt(totalEstValue)}
        </span>

        {/* Add Watch */}
        <button
          onClick={onAddWatch}
          style={{
            fontFamily: brand.font.sans,
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding: '7px 18px',
            background: brand.colors.ink,
            color: brand.colors.bg,
            border: 'none',
            borderRadius: brand.radius.btn,
            cursor: 'pointer',
          }}
        >
          Add Watch
        </button>

        {/* Open Playground */}
        <button
          onClick={onOpenPlayground}
          style={{
            fontFamily: brand.font.sans,
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding: '6px 18px',
            background: 'transparent',
            color: brand.colors.ink,
            border: `1px solid ${brand.colors.borderLight}`,
            borderRadius: brand.radius.btn,
            cursor: 'pointer',
          }}
        >
          Open Playground
        </button>

        {/* Unsaved changes indicator */}
        {pendingChangesCount > 0 && (
          <span
            style={{
              fontFamily: brand.font.sans,
              fontSize: 11,
              color: brand.colors.gold,
              opacity: 0.85,
              letterSpacing: '0.02em',
            }}
          >
            {pendingChangesCount} unsaved {pendingChangesCount === 1 ? 'change' : 'changes'}
          </span>
        )}
      </div>
    </div>
  )
}
