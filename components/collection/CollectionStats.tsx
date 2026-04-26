import type { Watch, WatchType } from '@/types/watch'

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

const WATCH_TYPES: WatchType[] = [
  'Diver', 'Dress', 'Sport', 'Chronograph', 'GMT',
  'Pilot', 'Field', 'Integrated Bracelet', 'Vintage',
]

const COMPLICATIONS = [
  'Date', 'Day-Date', 'GMT', 'Chronograph', 'Moonphase',
  'Annual Calendar', 'Perpetual Calendar', 'Power Reserve', 'Tourbillon',
]

const STANDARD_COLORS: { name: string; css: string; keywords: string[] }[] = [
  { name: 'Black',     css: '#111111',  keywords: ['black'] },
  { name: 'White',     css: '#F5F0E8',  keywords: ['white', 'ivory', 'cream'] },
  { name: 'Blue',      css: '#1B2A4A',  keywords: ['blue', 'navy', 'cobalt', 'azure'] },
  { name: 'Grey',      css: '#6B6B6B',  keywords: ['grey', 'gray', 'anthracite', 'slate'] },
  { name: 'Green',     css: '#2A4A2E',  keywords: ['green', 'olive', 'forest', 'emerald'] },
  { name: 'Silver',    css: '#C8C8C8',  keywords: ['silver'] },
  { name: 'Champagne', css: '#E8D8B0',  keywords: ['champagne', 'gold dial', 'golden'] },
  { name: 'Salmon',    css: '#E8A090',  keywords: ['salmon', 'pink', 'rose'] },
  { name: 'Brown',     css: '#6A3820',  keywords: ['brown', 'chocolate', 'tobacco'] },
  { name: 'Red',       css: '#C02020',  keywords: ['red', 'burgundy', 'bordeaux'] },
]

function normalizeDialColor(dialColor: string): string {
  const lower = dialColor.toLowerCase()
  for (const sc of STANDARD_COLORS) {
    if (sc.keywords.some(k => lower.includes(k))) return sc.name
  }
  return 'Other'
}

interface SectionTitleProps { children: React.ReactNode }
function SectionTitle({ children }: SectionTitleProps) {
  return (
    <div
      style={{
        fontFamily: 'var(--font-dm-sans)',
        fontSize: 9,
        fontWeight: 600,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: '#A89880',
        marginBottom: 14,
      }}
    >
      {children}
    </div>
  )
}

interface Props {
  watches: Watch[]
}

export default function CollectionStats({ watches }: Props) {
  // C1 — Portfolio Value
  const totalValue = watches.reduce((s, w) => s + w.estimatedValue, 0)
  const costBasis  = watches.reduce((s, w) => s + w.purchasePrice, 0)
  const gainLoss   = totalValue - costBasis
  const highest    = watches.length ? watches.reduce((a, b) => a.estimatedValue > b.estimatedValue ? a : b) : null
  const sorted     = [...watches].sort((a, b) => a.estimatedValue - b.estimatedValue)
  const median     = sorted.length ? sorted[Math.floor(sorted.length / 2)] : null

  // C2 — Dial colors
  const colorCounts: Record<string, number> = {}
  watches.forEach(w => {
    const name = normalizeDialColor(w.dialColor)
    colorCounts[name] = (colorCounts[name] ?? 0) + 1
  })

  // C3 — Watch types
  const typeCounts: Record<string, number> = {}
  watches.forEach(w => { typeCounts[w.watchType] = (typeCounts[w.watchType] ?? 0) + 1 })

  // C4 — Complications
  const compCounts: Record<string, number> = {}
  watches.flatMap(w => w.complications).forEach(c => { compCounts[c] = (compCounts[c] ?? 0) + 1 })

  // C5 — Brands
  const brandCounts: Record<string, number> = {}
  watches.forEach(w => { brandCounts[w.brand] = (brandCounts[w.brand] ?? 0) + 1 })
  const sortedBrands = Object.entries(brandCounts).sort((a, b) => b[1] - a[1])

  const card: React.CSSProperties = {
    background: '#FFFFFF',
    border: '1px solid #EAE5DC',
    borderRadius: 10,
    padding: '20px 24px',
    marginBottom: 16,
  }

  return (
    <div>
      {/* C1 — Portfolio Value */}
      <div style={card}>
        <SectionTitle>Portfolio Value</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px' }}>
          <ValueRow label="Total Est. Value"  value={fmt(totalValue)} prominent />
          <ValueRow
            label="Gain / Loss"
            value={`${gainLoss >= 0 ? '↑' : '↓'} ${fmt(Math.abs(gainLoss))}`}
            color={gainLoss >= 0 ? '#2D6A2D' : '#8A2020'}
          />
          <ValueRow label="Cost Basis"         value={fmt(costBasis)} />
          <ValueRow label="Median Value"        value={median ? fmt(median.estimatedValue) : '—'} />
          {highest && (
            <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #F0EBE3', paddingTop: 10, marginTop: 2 }}>
              <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 10, color: '#A89880' }}>
                Highest: {highest.brand} {highest.model}
              </span>
              <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 12, fontWeight: 600, color: '#1A1410', float: 'right' }}>
                {fmt(highest.estimatedValue)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* C2 — Dial Colors */}
      <div style={card}>
        <SectionTitle>Dial Colors</SectionTitle>
        <div style={{ display: 'flex', gap: 20, overflowX: 'auto', paddingBottom: 4 }}>
          {STANDARD_COLORS.map(sc => {
            const count = colorCounts[sc.name] ?? 0
            return (
              <div key={sc.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: sc.css,
                      border: sc.name === 'White' || sc.name === 'Silver' || sc.name === 'Champagne'
                        ? '1px solid #E0DAD0'
                        : '1px solid transparent',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.14)',
                      opacity: count === 0 ? 0.35 : 1,
                    }}
                  />
                  {count > 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        top: -4,
                        right: -4,
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        background: '#1A1410',
                        color: '#FAF8F4',
                        fontSize: 9,
                        fontFamily: 'var(--font-dm-sans)',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {count}
                    </span>
                  )}
                </div>
                <span
                  style={{
                    fontFamily: 'var(--font-dm-sans)',
                    fontSize: 9,
                    color: count > 0 ? '#1A1410' : '#C8BFAF',
                    letterSpacing: '0.04em',
                    textAlign: 'center',
                  }}
                >
                  {sc.name}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* C3 — Watch Types */}
      <div style={card}>
        <SectionTitle>Watch Types</SectionTitle>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {WATCH_TYPES.map(type => {
            const count = typeCounts[type] ?? 0
            return (
              <span
                key={type}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  fontFamily: 'var(--font-dm-sans)',
                  fontSize: 10,
                  fontWeight: 500,
                  letterSpacing: '0.04em',
                  padding: '5px 12px',
                  borderRadius: 20,
                  background: count > 0 ? '#1A1410' : 'transparent',
                  color: count > 0 ? '#FAF8F4' : '#C8BFAF',
                  border: count > 0 ? '1px solid #1A1410' : '1px solid #E0DAD0',
                }}
              >
                {type}
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: count > 0 ? 'rgba(250,248,244,0.7)' : '#C8BFAF',
                  }}
                >
                  {count}
                </span>
              </span>
            )
          })}
        </div>
      </div>

      {/* C4 — Complications */}
      <div style={card}>
        <SectionTitle>Complications</SectionTitle>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {COMPLICATIONS.map(comp => {
            const count = compCounts[comp] ?? 0
            return (
              <span
                key={comp}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  fontFamily: 'var(--font-dm-sans)',
                  fontSize: 10,
                  fontWeight: 500,
                  letterSpacing: '0.04em',
                  padding: '5px 12px',
                  borderRadius: 20,
                  background: count > 0 ? '#2A2520' : 'transparent',
                  color: count > 0 ? '#FAF8F4' : '#C8BFAF',
                  border: count > 0 ? '1px solid #2A2520' : '1px solid #E0DAD0',
                }}
              >
                {comp}
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: count > 0 ? 'rgba(250,248,244,0.7)' : '#C8BFAF',
                  }}
                >
                  {count}
                </span>
              </span>
            )
          })}
        </div>
      </div>

      {/* C5 — Brands */}
      <div style={card}>
        <SectionTitle>Brands</SectionTitle>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {sortedBrands.map(([brand, count]) => (
            <span
              key={brand}
              style={{
                fontFamily: 'var(--font-dm-sans)',
                fontSize: 11,
                fontWeight: 500,
                padding: '5px 14px',
                borderRadius: 20,
                background: '#FAF8F4',
                border: '1px solid #E0DAD0',
                color: '#1A1410',
                letterSpacing: '0.02em',
              }}
            >
              {brand} <span style={{ color: '#A89880' }}>×{count}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

interface ValueRowProps {
  label: string
  value: string
  prominent?: boolean
  color?: string
}

function ValueRow({ label, value, prominent, color }: ValueRowProps) {
  return (
    <div style={{ borderBottom: '1px solid #F0EBE3', paddingBottom: 10 }}>
      <div
        style={{
          fontFamily: 'var(--font-dm-sans)',
          fontSize: 10,
          color: '#A89880',
          marginBottom: 3,
          letterSpacing: '0.04em',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: prominent ? 'var(--font-cormorant)' : 'var(--font-dm-sans)',
          fontSize: prominent ? 28 : 14,
          fontWeight: prominent ? 400 : 600,
          color: color ?? '#1A1410',
        }}
      >
        {value}
      </div>
    </div>
  )
}
