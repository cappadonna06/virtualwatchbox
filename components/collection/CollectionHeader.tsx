function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

interface Props {
  totalEstValue: number
  pendingChangesCount: number
  onAddWatch: () => void
}

export default function CollectionHeader({ totalEstValue, pendingChangesCount, onAddWatch }: Props) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ marginBottom: 20 }}>
        <h1
          style={{
            fontFamily: 'var(--font-cormorant)',
            fontSize: 48,
            fontWeight: 400,
            lineHeight: 1.1,
            color: '#1A1410',
            margin: 0,
          }}
        >
          My Collection
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-dm-sans)',
            fontSize: 14,
            color: '#A89880',
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
            fontFamily: 'var(--font-dm-sans)',
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.06em',
            padding: '5px 14px',
            borderRadius: 20,
            border: '1px solid rgba(201,168,76,0.4)',
            background: 'rgba(201,168,76,0.06)',
            color: '#C9A84C',
          }}
        >
          Est. Value: {fmt(totalEstValue)}
        </span>

        {/* Add Watch */}
        <button
          onClick={onAddWatch}
          style={{
            fontFamily: 'var(--font-dm-sans)',
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding: '7px 18px',
            background: '#1A1410',
            color: '#FAF8F4',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          Add Watch
        </button>

        {/* Open Playground */}
        <button
          style={{
            fontFamily: 'var(--font-dm-sans)',
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding: '6px 18px',
            background: 'transparent',
            color: '#1A1410',
            border: '1px solid #D4CBBF',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          Open Playground
        </button>

        {/* Unsaved changes indicator */}
        {pendingChangesCount > 0 && (
          <span
            style={{
              fontFamily: 'var(--font-dm-sans)',
              fontSize: 11,
              color: '#C9A84C',
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
