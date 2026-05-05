'use client'

import { useState, type ReactNode } from 'react'
import type { WatchType } from '@/types/watch'
import { brand } from '@/lib/brand'

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

const ALL_WATCH_TYPES: WatchType[] = [
  'Diver', 'Dress', 'Sport', 'Chronograph', 'GMT',
  'Pilot', 'Field', 'Integrated Bracelet', 'Vintage',
]

const ALL_COMPLICATIONS = [
  'Date', 'Day-Date', 'GMT', 'Chronograph', 'Moonphase',
  'Annual Calendar', 'Perpetual Calendar', 'Power Reserve', 'Tourbillon',
]

const ALL_DIAL_COLORS: { name: string; hex: string }[] = [
  { name: 'Black',     hex: '#1A1410' },
  { name: 'White',     hex: '#F5F0E8' },
  { name: 'Blue',      hex: '#1B2A4A' },
  { name: 'Grey',      hex: '#7A7A7A' },
  { name: 'Green',     hex: '#2A4A2E' },
  { name: 'Silver',    hex: '#D4CDC0' },
  { name: 'Champagne', hex: '#E8D9B0' },
  { name: 'Salmon',    hex: '#E8C8B8' },
  { name: 'Brown',     hex: '#7A5A3A' },
  { name: 'Red',       hex: '#A83838' },
]

const LIGHT_COLORS = new Set(['White', 'Champagne', 'Silver'])

const SUCCESS_GREEN = '#2D6A2D'
const SUCCESS_BG = '#E8F4E8'
const LOSS_RED = '#8A2020'
const GOLD_TINT_BG = 'rgba(201,168,76,0.10)'
const GOLD_TINT_TEXT = '#8A6A10'

function matchDialColor(raw: string): string | null {
  if (!raw) return null
  const s = raw.toLowerCase()
  if (s.includes('black')) return 'Black'
  if (s.includes('white') || s.includes('lacquer') || s.includes('ivory') || s.includes('cream')) return 'White'
  if (s.includes('blue') || s.includes('navy')) return 'Blue'
  if (s.includes('grey') || s.includes('gray') || s.includes('anthracite') || s.includes('slate')) return 'Grey'
  if (s.includes('green')) return 'Green'
  if (s.includes('silver')) return 'Silver'
  if (s.includes('champagne') || s.includes('gold dial') || s.includes('golden')) return 'Champagne'
  if (s.includes('salmon') || s.includes('pink') || s.includes('rose')) return 'Salmon'
  if (s.includes('brown') || s.includes('chocolate') || s.includes('tobacco')) return 'Brown'
  if (s.includes('red') || s.includes('burgundy') || s.includes('bordeaux')) return 'Red'
  return null
}

const microLabel = {
  fontFamily: brand.font.sans,
  fontSize: 10,
  fontWeight: 500,
  letterSpacing: '0.14em',
  textTransform: 'uppercase' as const,
  color: brand.colors.muted,
}

interface Props {
  watches: {
    brand: string
    model: string
    dialColor: string
    watchType: WatchType
    complications: string[]
    estimatedValue: number
    purchasePrice?: number
  }[]
  mode?: 'collection' | 'playground'
}

export default function CollectionStats({ watches, mode = 'collection' }: Props) {
  const [view, setView] = useState<'overview' | 'graphical'>('overview')

  return (
    <section
      style={{
        scrollMarginTop: 80,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div>
          <h2
            style={{
              fontFamily: brand.font.serif,
              fontSize: 32,
              fontWeight: 400,
              lineHeight: 1.1,
              color: brand.colors.ink,
              margin: 0,
            }}
          >
            {mode === 'playground' ? 'Box Stats' : 'Collection Stats'}
          </h2>
          <p
            style={{
              fontFamily: brand.font.sans,
              fontSize: 13,
              color: brand.colors.muted,
              margin: '6px 0 0',
            }}
          >
            {mode === 'playground'
              ? 'A market-only breakdown of this playground box.'
              : 'A factual breakdown of what you own.'}
          </p>
        </div>

        <ModeTogglePill view={view} setView={setView} />
      </div>

      <PortfolioValueRow watches={watches} mode={mode} />

      {view === 'overview' ? (
        <DataSheet watches={watches} />
      ) : (
        <GraphicalView watches={watches} />
      )}
    </section>
  )
}

function ModeTogglePill({
  view,
  setView,
}: {
  view: 'overview' | 'graphical'
  setView: (v: 'overview' | 'graphical') => void
}) {
  return (
    <div
      role="tablist"
      style={{
        display: 'inline-flex',
        gap: 4,
        background: brand.colors.ink,
        borderRadius: brand.radius.circle,
        padding: 4,
        boxShadow: '0 2px 10px rgba(26,20,16,0.10)',
      }}
    >
      {(['overview', 'graphical'] as const).map(v => {
        const active = view === v
        return (
          <button
            key={v}
            role="tab"
            aria-selected={active}
            onClick={() => setView(v)}
            style={{
              fontFamily: brand.font.sans,
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              padding: '8px 20px',
              borderRadius: brand.radius.circle,
              border: 'none',
              cursor: 'pointer',
              background: active ? brand.colors.bg : 'transparent',
              color: active ? brand.colors.ink : 'rgba(250,248,244,0.55)',
              transition: `background ${brand.transition.fast}, color ${brand.transition.fast}`,
            }}
          >
            {v === 'overview' ? 'Overview' : 'Graphical'}
          </button>
        )
      })}
    </div>
  )
}

function PortfolioValueRow({ watches, mode }: { watches: Props['watches']; mode: 'collection' | 'playground' }) {
  const total = watches.reduce((s, w) => s + w.estimatedValue, 0)
  const cost = watches.reduce((s, w) => s + (w.purchasePrice ?? 0), 0)
  const gain = total - cost
  const sorted = [...watches].sort((a, b) => b.estimatedValue - a.estimatedValue)
  const highest = sorted[0]
  const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : null
  const average = watches.length > 0 ? total / watches.length : 0

  return (
    <div
      style={{
        background: brand.colors.slot,
        border: `1px solid ${brand.colors.border}`,
        borderRadius: brand.radius.xl,
        padding: '20px 24px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 24,
        alignItems: 'flex-start',
        marginBottom: 12,
      }}
    >
      <Cell label="Total Est. Value" value={fmt(total)} />
      {mode === 'collection' ? (
        <>
          <Cell label="Cost Basis" value={fmt(cost)} />
          <Cell
            label="Gain / Loss"
            value={`${gain >= 0 ? '+' : '-'}${fmt(Math.abs(gain))}`}
            color={gain >= 0 ? SUCCESS_GREEN : LOSS_RED}
            icon={gain >= 0 ? '↑' : '↓'}
          />
        </>
      ) : (
        <Cell label="Average Value" value={fmt(average)} />
      )}
      {median ? <Cell label="Median Value" value={fmt(median.estimatedValue)} /> : null}
      {highest ? (
        <Cell
          label="Highest"
          value={fmt(highest.estimatedValue)}
          color={brand.colors.gold}
          sub={`${highest.brand} ${highest.model}`}
        />
      ) : null}
    </div>
  )
}

function Cell({
  label,
  value,
  color = brand.colors.ink,
  icon,
  sub,
}: {
  label: string
  value: string
  color?: string
  icon?: string
  sub?: string
}) {
  return (
    <div style={{ flex: '1 1 0', minWidth: 140 }}>
      <div style={{ ...microLabel, marginBottom: 6 }}>{label}</div>
      <div
        style={{
          fontFamily: brand.font.serif,
          fontSize: 26,
          fontWeight: 500,
          color,
          lineHeight: 1,
          display: 'inline-flex',
          alignItems: 'baseline',
          gap: 6,
        }}
      >
        {icon ? <span style={{ fontSize: 16, color }}>{icon}</span> : null}
        {value}
      </div>
      {sub ? (
        <div
          style={{
            fontFamily: brand.font.sans,
            fontSize: 11,
            color: brand.colors.muted,
            marginTop: 4,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {sub}
        </div>
      ) : null}
    </div>
  )
}

function DataSheet({ watches }: { watches: Props['watches'] }) {
  return (
    <div
      style={{
        background: brand.colors.slot,
        border: `1px solid ${brand.colors.border}`,
        borderRadius: brand.radius.xl,
        padding: '0 24px',
      }}
    >
      <DialColorsRow watches={watches} />
      <ChipRow
        label="Watch Types"
        items={ALL_WATCH_TYPES.map(name => ({ name }))}
        getCount={item => watches.filter(w => w.watchType === item.name).length}
      />
      <ChipRow
        label="Complications"
        items={ALL_COMPLICATIONS.map(name => ({ name }))}
        getCount={item => watches.filter(w => w.complications.includes(item.name)).length}
      />
      <BrandsRow watches={watches} />
    </div>
  )
}

function DataRow({
  label,
  isLast,
  open,
  setOpen,
  hiddenCount,
  children,
}: {
  label: string
  isLast?: boolean
  open?: boolean
  setOpen?: (next: boolean) => void
  hiddenCount?: number
  children: ReactNode
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '180px 1fr auto',
        alignItems: 'flex-start',
        gap: 24,
        padding: '18px 0',
        borderBottom: isLast ? 'none' : `1px solid ${brand.colors.border}`,
      }}
    >
      <div style={{ ...microLabel, paddingTop: 4 }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>{children}</div>
      {typeof open === 'boolean' && setOpen && typeof hiddenCount === 'number' && hiddenCount > 0 ? (
        <RevealToggle open={open} setOpen={setOpen} hiddenCount={hiddenCount} />
      ) : (
        <span />
      )}
    </div>
  )
}

function RevealToggle({
  open,
  setOpen,
  hiddenCount,
}: {
  open: boolean
  setOpen: (next: boolean) => void
  hiddenCount: number
}) {
  return (
    <button
      onClick={() => setOpen(!open)}
      style={{
        fontFamily: brand.font.sans,
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: '0.10em',
        textTransform: 'uppercase',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        color: brand.colors.muted,
        padding: 0,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
      }}
    >
      {open ? 'Show fewer' : `Show all (+${hiddenCount})`}
      <span
        style={{
          display: 'inline-flex',
          transform: open ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.15s',
        }}
      >
        <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="3.5,5.5 7,9 10.5,5.5" />
        </svg>
      </span>
    </button>
  )
}

function DialColorsRow({ watches }: { watches: Props['watches'] }) {
  const [open, setOpen] = useState(false)
  const counts = ALL_DIAL_COLORS.map(c => ({
    ...c,
    count: watches.filter(w => matchDialColor(w.dialColor) === c.name).length,
  }))
  const nonzero = counts.filter(c => c.count > 0)
  const zero = counts.filter(c => c.count === 0)
  const list = open ? counts : nonzero

  return (
    <DataRow label="Dial Colors" open={open} setOpen={setOpen} hiddenCount={zero.length}>
      {list.length === 0 ? (
        <span style={{ fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.muted }}>None recorded yet.</span>
      ) : (
        list.map(c => (
          <div
            key={c.name}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '3px 11px 3px 4px',
              borderRadius: brand.radius.pill,
              border: `1px solid ${brand.colors.border}`,
              opacity: c.count === 0 ? 0.45 : 1,
            }}
          >
            <span
              style={{
                width: 18,
                height: 18,
                borderRadius: brand.radius.circle,
                background: c.hex,
                border: LIGHT_COLORS.has(c.name) ? `1px solid ${brand.colors.borderLight}` : 'none',
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontFamily: brand.font.sans,
                fontSize: 11,
                fontWeight: 500,
                color: c.count > 0 ? brand.colors.ink : brand.colors.muted,
              }}
            >
              {c.name}
            </span>
            {c.count > 0 ? (
              <span style={{ fontFamily: brand.font.sans, fontSize: 10, color: brand.colors.muted }}>{c.count}</span>
            ) : null}
          </div>
        ))
      )}
    </DataRow>
  )
}

function ChipRow({
  label,
  items,
  getCount,
}: {
  label: string
  items: { name: string }[]
  getCount: (item: { name: string }) => number
}) {
  const [open, setOpen] = useState(false)
  const withCounts = items.map(it => ({ ...it, count: getCount(it) }))
  const nonzero = withCounts.filter(it => it.count > 0)
  const zero = withCounts.filter(it => it.count === 0)
  const list = open ? withCounts : nonzero

  return (
    <DataRow label={label} open={open} setOpen={setOpen} hiddenCount={zero.length}>
      {list.length === 0 ? (
        <span style={{ fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.muted }}>None recorded yet.</span>
      ) : (
        list.map(it => <StatChip key={it.name} label={it.name} count={it.count} dim={it.count === 0} />)
      )}
    </DataRow>
  )
}

function StatChip({ label, count, dim }: { label: string; count: number; dim?: boolean }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontFamily: brand.font.sans,
        fontSize: 11,
        fontWeight: 500,
        padding: '4px 10px',
        borderRadius: brand.radius.pill,
        background: dim ? 'transparent' : brand.colors.ink,
        border: dim ? `1px solid ${brand.colors.border}` : `1px solid ${brand.colors.ink}`,
        color: dim ? '#C8BCA9' : brand.colors.bg,
        opacity: dim ? 0.7 : 1,
      }}
    >
      {label}
      <span style={{ fontSize: 10, opacity: 0.65 }}>{count}</span>
    </span>
  )
}

function BrandsRow({ watches }: { watches: Props['watches'] }) {
  const counts: Record<string, number> = {}
  watches.forEach(w => {
    counts[w.brand] = (counts[w.brand] ?? 0) + 1
  })
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])

  return (
    <DataRow label="Brands" isLast>
      {sorted.length === 0 ? (
        <span style={{ fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.muted }}>None yet.</span>
      ) : (
        sorted.map(([name, n]) => (
          <span
            key={name}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontFamily: brand.font.sans,
              fontSize: 11,
              fontWeight: 500,
              padding: '4px 10px',
              borderRadius: brand.radius.pill,
              background: GOLD_TINT_BG,
              color: GOLD_TINT_TEXT,
            }}
          >
            {name}
            <span style={{ fontSize: 10, opacity: 0.6 }}>×{n}</span>
          </span>
        ))
      )}
    </DataRow>
  )
}

function GraphicalView({ watches }: { watches: Props['watches'] }) {
  const byBrand: Record<string, number> = {}
  watches.forEach(w => {
    byBrand[w.brand] = (byBrand[w.brand] ?? 0) + w.estimatedValue
  })
  const entries = Object.entries(byBrand).sort((a, b) => b[1] - a[1])
  const max = Math.max(...entries.map(([, v]) => v), 1)
  const total = entries.reduce((s, [, v]) => s + v, 0)

  return (
    <div
      style={{
        background: brand.colors.slot,
        border: `1px solid ${brand.colors.border}`,
        borderRadius: brand.radius.xl,
        padding: 24,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 }}>
        <div style={microLabel}>Value By Brand</div>
        <div style={{ fontFamily: brand.font.sans, fontSize: 11, color: brand.colors.muted }}>
          {entries.length} {entries.length === 1 ? 'brand' : 'brands'} · {fmt(total)} total
        </div>
      </div>

      {entries.length === 0 ? (
        <div style={{ fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.muted }}>No data yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {entries.map(([brandName, value]) => (
            <div key={brandName}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.ink, fontWeight: 500 }}>
                  {brandName}
                </span>
                <span style={{ fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.muted }}>
                  {fmt(value)} · {Math.round((value / total) * 100)}%
                </span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: '#F0EBE3', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${(value / max) * 100}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #C9A84C 0%, #B89535 100%)',
                    borderRadius: 3,
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Success state token reference (not rendered) — keeps SUCCESS_BG referenced until copy-success surfaces here */}
      <span style={{ display: 'none' }} aria-hidden data-success-bg={SUCCESS_BG} />
    </div>
  )
}
