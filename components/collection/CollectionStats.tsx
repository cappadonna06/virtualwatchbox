'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { animate, useInView, useReducedMotion } from 'framer-motion'
import type { WatchType } from '@/types/watch'
import { brand } from '@/lib/brand'
import { dialColorToHex } from '@/lib/dialColors'

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

// Counts a currency figure up from $0 the first time it scrolls into view.
// Falls straight to the final value under prefers-reduced-motion.
function AnimatedCurrency({ value, prefix }: { value: number; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.4 })
  const reduce = useReducedMotion()
  const [display, setDisplay] = useState(() => fmt(0))

  useEffect(() => {
    if (reduce) {
      setDisplay(fmt(value))
      return
    }
    if (!inView) return
    const controls = animate(0, value, {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: latest => setDisplay(fmt(latest)),
    })
    return () => controls.stop()
  }, [inView, value, reduce])

  return (
    <span ref={ref}>
      {prefix}
      {display}
    </span>
  )
}

const ALL_WATCH_TYPES: WatchType[] = [
  'Diver', 'Dress', 'Sport', 'Chronograph', 'GMT',
  'Pilot', 'Field', 'Integrated Bracelet', 'Vintage',
]

const ALL_COMPLICATIONS = [
  'Date', 'Day-Date', 'GMT', 'Chronograph', 'Moonphase',
  'Annual Calendar', 'Perpetual Calendar', 'Power Reserve', 'Tourbillon',
]

// Canonical dial-color names; hex values come from lib/dialColors.ts
// via `dialColorToHex` so there's one source of truth.
const ALL_DIAL_COLOR_NAMES = [
  'Black', 'White', 'Blue', 'Grey', 'Green',
  'Silver', 'Champagne', 'Salmon', 'Brown', 'Red',
] as const
const ALL_DIAL_COLORS: { name: string; hex: string }[] = ALL_DIAL_COLOR_NAMES.map(name => ({
  name,
  hex: dialColorToHex(name),
}))

const LIGHT_COLORS = new Set(['White', 'Champagne', 'Silver'])

function DialSwatch({ hex, light, size = 22 }: { hex: string; light?: boolean; size?: number }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        background: hex,
        border: light ? `1px solid ${brand.colors.borderLight}` : 'none',
        boxShadow: light ? undefined : 'inset 0 0 0 1px rgba(255,255,255,0.18)',
        flexShrink: 0,
      }}
    />
  )
}

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
  fontSize: 12,
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
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  if (watches.length === 0 && mode === 'collection') {
    return (
      <section style={{ scrollMarginTop: 80 }}>
        <div
          style={{
            background: brand.colors.slot,
            border: `1px solid ${brand.colors.border}`,
            borderRadius: brand.radius.xl,
            padding: '36px 28px',
            textAlign: 'center',
          }}
        >
          <h2
            style={{
              fontFamily: brand.font.serif,
              fontSize: 26,
              fontWeight: 400,
              lineHeight: 1.15,
              color: brand.colors.ink,
              margin: '0 0 8px',
            }}
          >
            Stats unlock with your first watch.
          </h2>
          <p
            style={{
              fontFamily: brand.font.sans,
              fontSize: 12,
              color: brand.colors.muted,
              margin: 0,
              lineHeight: 1.55,
              maxWidth: 460,
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            Portfolio value, dial colors, types, complications, and brand breakdown will populate as you build.
          </p>
        </div>
      </section>
    )
  }

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
        </div>

        <ModeTogglePill view={view} setView={setView} />
      </div>

      <PortfolioValueRow watches={watches} mode={mode} />

      {view === 'overview' ? (
        <DataSheet watches={watches} isMobile={isMobile} />
      ) : (
        <GraphicalView watches={watches} isMobile={isMobile} />
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
  // Cost basis / gain is only meaningful for the subset of watches with a known
  // purchase price. Treating null/0 as $0 paid would inflate gain by the entire
  // estimated value of unpriced watches. Compare like-for-like instead, and
  // surface the subset count when partial.
  const priced = watches.filter(w => (w.purchasePrice ?? 0) > 0)
  const pricedTotalValue = priced.reduce((s, w) => s + w.estimatedValue, 0)
  const cost = priced.reduce((s, w) => s + (w.purchasePrice ?? 0), 0)
  const gain = pricedTotalValue - cost
  const hasPriced = priced.length > 0
  const partial = hasPriced && priced.length < watches.length
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
      <Cell label="Total Est. Value" value={<AnimatedCurrency value={total} />} />
      {mode === 'collection' ? (
        hasPriced ? (
          <>
            <Cell
              label="Cost Basis"
              value={<AnimatedCurrency value={cost} />}
              sub={partial ? `${priced.length} of ${watches.length} priced` : undefined}
            />
            <Cell
              label="Gain / Loss"
              value={<AnimatedCurrency value={Math.abs(gain)} prefix={gain >= 0 ? '+' : '-'} />}
              color={gain >= 0 ? SUCCESS_GREEN : LOSS_RED}
              icon={gain >= 0 ? '↑' : '↓'}
              sub={partial ? `vs ${fmt(pricedTotalValue)} est.` : undefined}
            />
          </>
        ) : (
          <Cell
            label="Cost Basis"
            value="—"
            sub="add purchase prices to track gain"
          />
        )
      ) : (
        <Cell label="Average Value" value={<AnimatedCurrency value={average} />} />
      )}
      {median ? <Cell label="Median Value" value={<AnimatedCurrency value={median.estimatedValue} />} /> : null}
      {highest ? (
        <Cell
          label="Highest"
          value={<AnimatedCurrency value={highest.estimatedValue} />}
          color={brand.colors.goldDeep}
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
  value: ReactNode
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
            fontSize: 12,
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

function DataSheet({ watches, isMobile }: { watches: Props['watches']; isMobile: boolean }) {
  return (
    <div
      style={{
        background: brand.colors.slot,
        border: `1px solid ${brand.colors.border}`,
        borderRadius: brand.radius.xl,
        padding: isMobile ? '0 16px' : '0 24px',
      }}
    >
      <DialColorsRow watches={watches} isMobile={isMobile} />
      <ChipRow
        label="Watch Types"
        items={ALL_WATCH_TYPES.map(name => ({ name }))}
        getCount={item => watches.filter(w => w.watchType === item.name).length}
        isMobile={isMobile}
      />
      <ChipRow
        label="Complications"
        items={ALL_COMPLICATIONS.map(name => ({ name }))}
        getCount={item => watches.filter(w => w.complications.includes(item.name)).length}
        isMobile={isMobile}
      />
      <BrandsRow watches={watches} isMobile={isMobile} />
    </div>
  )
}

function DataRow({
  label,
  isLast,
  open,
  setOpen,
  hiddenCount,
  isMobile,
  children,
}: {
  label: string
  isLast?: boolean
  open?: boolean
  setOpen?: (next: boolean) => void
  hiddenCount?: number
  isMobile?: boolean
  children: ReactNode
}) {
  const hasToggle = typeof open === 'boolean' && setOpen && typeof hiddenCount === 'number' && hiddenCount > 0

  if (isMobile) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          padding: '16px 0',
          borderBottom: isLast ? 'none' : `1px solid ${brand.colors.border}`,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={microLabel}>{label}</div>
          {hasToggle ? (
            <RevealToggle open={open} setOpen={setOpen} hiddenCount={hiddenCount} />
          ) : null}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>{children}</div>
      </div>
    )
  }

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
      {hasToggle ? (
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
        fontSize: 12,
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

function DialColorsRow({ watches, isMobile }: { watches: Props['watches']; isMobile: boolean }) {
  const [open, setOpen] = useState(false)
  const counts = ALL_DIAL_COLORS.map(c => ({
    ...c,
    count: watches.filter(w => matchDialColor(w.dialColor) === c.name).length,
  }))
  const nonzero = counts.filter(c => c.count > 0)
  const zero = counts.filter(c => c.count === 0)
  const list = open ? counts : nonzero

  return (
    <DataRow label="Dial Colors" open={open} setOpen={setOpen} hiddenCount={zero.length} isMobile={isMobile}>
      {list.length === 0 ? (
        <span style={{ fontFamily: brand.font.sans, fontSize: 14, color: brand.colors.muted }}>None recorded yet.</span>
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
            <DialSwatch hex={c.hex} light={LIGHT_COLORS.has(c.name)} size={22} />
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
              <span style={{ fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.muted }}>{c.count}</span>
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
  isMobile,
}: {
  label: string
  items: { name: string }[]
  getCount: (item: { name: string }) => number
  isMobile: boolean
}) {
  const [open, setOpen] = useState(false)
  const withCounts = items.map(it => ({ ...it, count: getCount(it) }))
  const nonzero = withCounts.filter(it => it.count > 0)
  const zero = withCounts.filter(it => it.count === 0)
  const list = open ? withCounts : nonzero

  return (
    <DataRow label={label} open={open} setOpen={setOpen} hiddenCount={zero.length} isMobile={isMobile}>
      {list.length === 0 ? (
        <span style={{ fontFamily: brand.font.sans, fontSize: 14, color: brand.colors.muted }}>None recorded yet.</span>
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
      <span style={{ fontSize: 12, opacity: 0.65 }}>{count}</span>
    </span>
  )
}

function BrandsRow({ watches, isMobile }: { watches: Props['watches']; isMobile: boolean }) {
  const counts: Record<string, number> = {}
  watches.forEach(w => {
    counts[w.brand] = (counts[w.brand] ?? 0) + 1
  })
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])

  return (
    <DataRow label="Brands" isLast isMobile={isMobile}>
      {sorted.length === 0 ? (
        <span style={{ fontFamily: brand.font.sans, fontSize: 14, color: brand.colors.muted }}>None yet.</span>
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
            <span style={{ fontSize: 12, opacity: 0.6 }}>×{n}</span>
          </span>
        ))
      )}
    </DataRow>
  )
}

function GraphicalView({ watches, isMobile }: { watches: Props['watches']; isMobile: boolean }) {
  const byBrand: Record<string, number> = {}
  watches.forEach(w => {
    byBrand[w.brand] = (byBrand[w.brand] ?? 0) + w.estimatedValue
  })
  const entries = Object.entries(byBrand).sort((a, b) => b[1] - a[1])
  const max = Math.max(...entries.map(([, v]) => v), 1)
  const total = entries.reduce((s, [, v]) => s + v, 0)

  // Dial color counts for the donut chart
  const dialCounts = ALL_DIAL_COLORS.map(c => ({
    ...c,
    count: watches.filter(w => matchDialColor(w.dialColor) === c.name).length,
  })).filter(c => c.count > 0)

  // Watch type counts for horizontal bars
  const typeCounts = ALL_WATCH_TYPES
    .map(name => ({ name, count: watches.filter(w => w.watchType === name).length }))
    .filter(t => t.count > 0)
    .sort((a, b) => b.count - a.count)
  const typeMax = Math.max(...typeCounts.map(t => t.count), 1)

  // Complication counts
  const compCounts = ALL_COMPLICATIONS
    .map(name => ({ name, count: watches.filter(w => w.complications.includes(name)).length }))
    .filter(c => c.count > 0)
    .sort((a, b) => b.count - a.count)
  const compMax = Math.max(...compCounts.map(c => c.count), 1)

  const cardStyle = {
    background: brand.colors.slot,
    border: `1px solid ${brand.colors.border}`,
    borderRadius: brand.radius.xl,
    padding: isMobile ? 18 : 24,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Value by brand */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18, flexWrap: 'wrap', gap: 8 }}>
          <div style={microLabel}>Value By Brand</div>
          <div style={{ fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.muted }}>
            {entries.length} {entries.length === 1 ? 'brand' : 'brands'} · {fmt(total)} total
          </div>
        </div>
        {entries.length === 0 ? (
          <div style={{ fontFamily: brand.font.sans, fontSize: 14, color: brand.colors.muted }}>No data yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {entries.map(([brandName, value]) => (
              <div key={brandName}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, flexWrap: 'wrap', gap: 4 }}>
                  <span style={{ fontFamily: brand.font.sans, fontSize: 14, color: brand.colors.ink, fontWeight: 500 }}>
                    {brandName}
                  </span>
                  <span style={{ fontFamily: brand.font.sans, fontSize: 14, color: brand.colors.muted }}>
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
        <span style={{ display: 'none' }} aria-hidden data-success-bg={SUCCESS_BG} />
      </div>

      {/* Dial colors donut */}
      {dialCounts.length > 0 && (
        <div style={cardStyle}>
          <div style={{ ...microLabel, marginBottom: 18 }}>Dial Colors</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 20 : 32, flexWrap: 'wrap' }}>
            <DialDonut slices={dialCounts} size={isMobile ? 120 : 140} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 120 }}>
              {dialCounts.map(c => (
                <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <DialSwatch hex={c.hex} light={LIGHT_COLORS.has(c.name)} size={16} />
                  <span style={{ fontFamily: brand.font.sans, fontSize: 14, color: brand.colors.ink, fontWeight: 500, flex: 1 }}>
                    {c.name}
                  </span>
                  <span style={{ fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.muted }}>{c.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Watch types horizontal bars */}
      {typeCounts.length > 0 && (
        <div style={cardStyle}>
          <div style={{ ...microLabel, marginBottom: 18 }}>Watch Types</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {typeCounts.map(t => (
              <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontFamily: brand.font.sans, fontSize: 14, color: brand.colors.ink, fontWeight: 500, width: isMobile ? 80 : 120, flexShrink: 0 }}>
                  {t.name}
                </span>
                <div style={{ flex: 1, height: 6, borderRadius: 3, background: '#F0EBE3', overflow: 'hidden' }}>
                  <div style={{
                    width: `${(t.count / typeMax) * 100}%`,
                    height: '100%',
                    background: brand.colors.ink,
                    borderRadius: 3,
                    transition: 'width 0.4s ease',
                  }} />
                </div>
                <span style={{ fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.muted, width: 20, textAlign: 'right' }}>
                  {t.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Complications */}
      {compCounts.length > 0 && (
        <div style={cardStyle}>
          <div style={{ ...microLabel, marginBottom: 18 }}>Complications</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {compCounts.map(c => (
              <span
                key={c.name}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  fontFamily: brand.font.sans,
                  fontSize: 12 + Math.min(3, Math.round((c.count / compMax) * 3)),
                  fontWeight: 500,
                  padding: '5px 12px',
                  borderRadius: brand.radius.pill,
                  background: brand.colors.ink,
                  color: brand.colors.bg,
                }}
              >
                {c.name}
                <span style={{ opacity: 0.6 }}>{c.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function DialDonut({ slices, size }: { slices: { hex: string; count: number }[]; size: number }) {
  const total = slices.reduce((s, sl) => s + sl.count, 0)
  if (total === 0) return null
  const r = size / 2
  const ir = r * 0.55
  let cursor = -Math.PI / 2
  const paths = slices.map(sl => {
    const angle = (sl.count / total) * Math.PI * 2
    const start = cursor
    cursor += angle
    const end = cursor
    const large = angle > Math.PI ? 1 : 0
    const x1 = r + r * Math.cos(start)
    const y1 = r + r * Math.sin(start)
    const x2 = r + r * Math.cos(end)
    const y2 = r + r * Math.sin(end)
    const ix1 = r + ir * Math.cos(end)
    const iy1 = r + ir * Math.sin(end)
    const ix2 = r + ir * Math.cos(start)
    const iy2 = r + ir * Math.sin(start)
    return (
      <path
        key={sl.hex}
        d={`M${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} L${ix1},${iy1} A${ir},${ir} 0 ${large} 0 ${ix2},${iy2} Z`}
        fill={sl.hex}
      />
    )
  })
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      {paths}
    </svg>
  )
}
