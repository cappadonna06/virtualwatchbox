import type { Watch } from '@/types/watch'

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

interface Props {
  watch: Watch
}

export default function HoverCard({ watch }: Props) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 'calc(100% + 10px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50,
        background: '#FFFFFF',
        border: '1px solid #E8E2D8',
        borderRadius: 8,
        padding: '12px 16px',
        width: 200,
        boxShadow: '0 8px 24px rgba(26,20,16,0.12)',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-dm-sans)',
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: '#C9A84C',
          marginBottom: 3,
        }}
      >
        {watch.brand}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-cormorant)',
          fontSize: 18,
          fontWeight: 400,
          color: '#1A1410',
          lineHeight: 1.2,
          marginBottom: 4,
          whiteSpace: 'normal',
        }}
      >
        {watch.model}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-dm-sans)',
          fontSize: 10,
          color: '#A89880',
          marginBottom: 2,
        }}
      >
        Ref. {watch.reference}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-dm-sans)',
          fontSize: 10,
          color: '#A89880',
          marginBottom: 8,
        }}
      >
        {watch.caseSizeMm}mm · {watch.dialColor}
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          borderTop: '1px solid #F0EBE3',
          paddingTop: 8,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-cormorant)',
            fontSize: 18,
            fontWeight: 500,
            color: '#C9A84C',
          }}
        >
          {fmt(watch.estimatedValue)}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-dm-sans)',
            fontSize: 9,
            color: '#A89880',
            letterSpacing: '0.04em',
          }}
        >
          Click to expand ↗
        </span>
      </div>
    </div>
  )
}
