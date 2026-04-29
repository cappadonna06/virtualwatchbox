'use client'

import { useState } from 'react'
import type { Watch, WatchType } from '@/types/watch'
import { brand } from '@/lib/brand'

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

const WATCH_TYPES: WatchType[] = [
  'Diver', 'Dress', 'Sport', 'Chronograph', 'GMT',
  'Pilot', 'Field', 'Integrated Bracelet', 'Vintage',
]

const WATCH_TYPE_ICONS: Record<WatchType, string> = {
  'Diver':               '🤿',
  'Dress':               '🕰️',
  'Sport':               '🏋️',
  'Chronograph':         '⏱️',
  'GMT':                 '🌐',
  'Pilot':               '✈️',
  'Field':               '🧭',
  'Integrated Bracelet': '⌚',
  'Vintage':             '⌛',
}

const COMPLICATIONS = [
  'Date', 'Day-Date', 'GMT', 'Chronograph', 'Moonphase',
  'Annual Calendar', 'Perpetual Calendar', 'Power Reserve', 'Tourbillon',
]

const COMPLICATION_ICONS: Record<string, string> = {
  'Date':               '📅',
  'Day-Date':           '🗓️',
  'GMT':                '🌐',
  'Chronograph':        '⏱️',
  'Moonphase':          '🌙',
  'Annual Calendar':    '📆',
  'Perpetual Calendar': '♾️',
  'Power Reserve':      '🔋',
  'Tourbillon':         '🌀',
}

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

const LIGHT_COLORS = new Set(['White', 'Silver', 'Champagne'])

function normalizeDialColor(dialColor: string): string {
  const lower = dialColor.toLowerCase()
  for (const sc of STANDARD_COLORS) {
    if (sc.keywords.some(k => lower.includes(k))) return sc.name
  }
  return 'Other'
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: brand.font.sans, fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: brand.colors.muted, marginBottom: 14 }}>
      {children}
    </div>
  )
}

// No default marginBottom — spacing handled by grid gap / wrapper
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: brand.colors.white, border: `1px solid ${brand.colors.border}`, borderRadius: brand.radius.lg, padding: '20px 24px', height: '100%' }}>
      {children}
    </div>
  )
}

function ValueRow({ label, value, prominent, color }: { label: string; value: string; prominent?: boolean; color?: string }) {
  return (
    <div style={{ borderBottom: '1px solid #F0EBE3', paddingBottom: 10 }}>
      <div style={{ fontFamily: brand.font.sans, fontSize: 10, color: brand.colors.muted, marginBottom: 3, letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontFamily: prominent ? brand.font.serif : brand.font.sans, fontSize: prominent ? 28 : 14, fontWeight: prominent ? 400 : 600, color: color ?? brand.colors.ink }}>
        {value}
      </div>
    </div>
  )
}

// ─── Graphical sub-components ─────────────────────────────────────────────────

function HorizontalBar({ label, count, maxCount, barColor, labelWidth = 90 }: { label: string; count: number; maxCount: number; barColor: string; labelWidth?: number }) {
  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      <span style={{ fontFamily: brand.font.sans, fontSize: 10, color: count > 0 ? brand.colors.ink : '#C8BFAF', width: labelWidth, flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 8, background: '#F0EBE3', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 4, transition: 'width 0.5s ease' }} />
      </div>
      <span style={{ fontFamily: brand.font.sans, fontSize: 10, fontWeight: 600, color: count > 0 ? brand.colors.ink : '#C8BFAF', width: 16, textAlign: 'right', flexShrink: 0 }}>
        {count}
      </span>
    </div>
  )
}

function IconTile({ icon, label, count }: { icon: string; label: string; count: number }) {
  const owned = count > 0
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
      padding: '12px 6px', borderRadius: brand.radius.lg,
      background: owned ? brand.colors.bg : 'transparent',
      border: owned ? `1px solid ${brand.colors.borderMid}` : '1px solid #F0EBE3',
      opacity: owned ? 1 : 0.4,
    }}>
      <span style={{ fontSize: 22, lineHeight: 1 }}>{icon}</span>
      <span style={{ fontFamily: brand.font.sans, fontSize: 7, letterSpacing: '0.07em', textTransform: 'uppercase', color: brand.colors.ink, textAlign: 'center', lineHeight: 1.3 }}>
        {label}
      </span>
      <span style={{ fontFamily: brand.font.sans, fontSize: 9, fontWeight: 700, color: owned ? brand.colors.gold : '#C8BFAF' }}>
        ×{count}
      </span>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  watches: Watch[]
  mode?: 'collection' | 'playground'
}

export default function CollectionStats({ watches, mode = 'collection' }: Props) {
  const [view, setView] = useState<'overview' | 'graphical'>('overview')

  const totalValue = watches.reduce((s, w) => s + w.estimatedValue, 0)
  const costBasis  = watches.reduce((s, w) => s + w.purchasePrice, 0)
  const gainLoss   = totalValue - costBasis
  const highest    = watches.length ? watches.reduce((a, b) => a.estimatedValue > b.estimatedValue ? a : b) : null
  const sorted     = [...watches].sort((a, b) => a.estimatedValue - b.estimatedValue)
  const median     = sorted.length ? sorted[Math.floor(sorted.length / 2)] : null
  const averageValue = watches.length > 0 ? totalValue / watches.length : 0

  const colorCounts: Record<string, number> = {}
  watches.forEach(w => {
    const name = normalizeDialColor(w.dialColor)
    colorCounts[name] = (colorCounts[name] ?? 0) + 1
  })

  const typeCounts: Record<string, number> = {}
  watches.forEach(w => { typeCounts[w.watchType] = (typeCounts[w.watchType] ?? 0) + 1 })

  const compCounts: Record<string, number> = {}
  watches.flatMap(w => w.complications).forEach(c => { compCounts[c] = (compCounts[c] ?? 0) + 1 })

  const brandCounts: Record<string, number> = {}
  watches.forEach(w => { brandCounts[w.brand] = (brandCounts[w.brand] ?? 0) + 1 })
  const sortedBrands = Object.entries(brandCounts).sort((a, b) => b[1] - a[1])

  const maxBrandCount = Math.max(...sortedBrands.map(([, c]) => c), 1)
  const maxCompCount  = Math.max(...COMPLICATIONS.map(c => compCounts[c] ?? 0), 1)
  const maxColorCount = Math.max(...STANDARD_COLORS.map(sc => colorCounts[sc.name] ?? 0), 1)

  return (
    <div>
      {/* View toggle */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <div style={{ display: 'inline-flex', border: `1px solid ${brand.colors.borderMid}`, borderRadius: brand.radius.sm, overflow: 'hidden', background: brand.colors.bg }}>
          {(['overview', 'graphical'] as const).map((v, i) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                fontFamily: brand.font.sans, fontSize: 11, fontWeight: 500,
                letterSpacing: '0.04em', padding: '7px 18px',
                background: view === v ? brand.colors.ink : 'transparent',
                color: view === v ? brand.colors.bg : brand.colors.muted,
                border: 'none', borderLeft: i > 0 ? `1px solid ${brand.colors.borderMid}` : 'none',
                cursor: 'pointer', transition: `background ${brand.transition.fast}, color ${brand.transition.fast}`,
              }}
            >
              {v === 'overview' ? 'Overview' : 'Graphical'}
            </button>
          ))}
        </div>
      </div>

      {/* ── C1 — Portfolio Value (full width) ── */}
      <div style={{ marginBottom: 16 }}>
        <Card>
          <SectionTitle>{mode === 'playground' ? 'Box Value' : 'Portfolio Value'}</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px' }}>
            <ValueRow label="Total Est. Value" value={fmt(totalValue)} prominent />
            {mode === 'collection' ? (
              <ValueRow
                label="Gain / Loss"
                value={`${gainLoss >= 0 ? '↑' : '↓'} ${fmt(Math.abs(gainLoss))}`}
                color={gainLoss >= 0 ? '#2D6A2D' : '#8A2020'}
              />
            ) : (
              <ValueRow label="Average Value" value={fmt(averageValue)} />
            )}
            {mode === 'collection' ? (
              <ValueRow label="Cost Basis" value={fmt(costBasis)} />
            ) : (
              <ValueRow label="Watch Count" value={String(watches.length)} />
            )}
            <ValueRow label="Median Value" value={median ? fmt(median.estimatedValue) : '—'} />
            {highest && (
              <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #F0EBE3', paddingTop: 10, marginTop: 2 }}>
                <span style={{ fontFamily: brand.font.sans, fontSize: 10, color: brand.colors.muted }}>
                  Highest: {highest.brand} {highest.model}
                </span>
                <span style={{ fontFamily: brand.font.sans, fontSize: 12, fontWeight: 600, color: brand.colors.ink, float: 'right' }}>
                  {fmt(highest.estimatedValue)}
                </span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {view === 'overview' ? (
        <>
          {/* ── Row 2: Dial Colors + Watch Types ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ marginBottom: 16 }}>
            <Card>
              <SectionTitle>Dial Colors</SectionTitle>
              {/* paddingTop prevents the -4px count badge from being clipped by overflowX:auto */}
              <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingTop: 8, paddingBottom: 6 }}>
                {STANDARD_COLORS.map(sc => {
                  const count = colorCounts[sc.name] ?? 0
                  return (
                    <div key={sc.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                      <div style={{ position: 'relative' }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%', background: sc.css,
                          border: LIGHT_COLORS.has(sc.name) ? '1px solid #E0DAD0' : '1px solid transparent',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.14)',
                          opacity: count === 0 ? 0.3 : 1,
                        }} />
                        {count > 0 && (
                          <span style={{
                            position: 'absolute', top: -4, right: -4,
                            width: 15, height: 15, borderRadius: '50%',
                            background: '#1A1410', color: '#FAF8F4',
                            fontSize: 8, fontFamily: 'var(--font-dm-sans)', fontWeight: 700,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>{count}</span>
                        )}
                      </div>
                      <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 8, color: count > 0 ? '#1A1410' : '#C8BFAF', letterSpacing: '0.03em', textAlign: 'center' }}>
                        {sc.name}
                      </span>
                    </div>
                  )
                })}
              </div>
            </Card>

            <Card>
              <SectionTitle>Watch Types</SectionTitle>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {WATCH_TYPES.map(type => {
                  const count = typeCounts[type] ?? 0
                  return (
                    <span key={type} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontFamily: brand.font.sans, fontSize: 10, fontWeight: 500, letterSpacing: '0.04em',
                      padding: '4px 10px', borderRadius: brand.radius.pill,
                      background: count > 0 ? brand.colors.ink : 'transparent',
                      color: count > 0 ? brand.colors.bg : '#C8BFAF',
                      border: count > 0 ? `1px solid ${brand.colors.ink}` : '1px solid #E0DAD0',
                    }}>
                      {type}
                      <span style={{ fontSize: 8, fontWeight: 700, color: count > 0 ? 'rgba(250,248,244,0.65)' : '#C8BFAF' }}>{count}</span>
                    </span>
                  )
                })}
              </div>
            </Card>
          </div>

          {/* ── Row 3: Complications + Brands ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <SectionTitle>Complications</SectionTitle>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {COMPLICATIONS.map(comp => {
                  const count = compCounts[comp] ?? 0
                  return (
                    <span key={comp} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontFamily: brand.font.sans, fontSize: 10, fontWeight: 500, letterSpacing: '0.04em',
                      padding: '4px 10px', borderRadius: brand.radius.pill,
                      background: count > 0 ? brand.colors.dark : 'transparent',
                      color: count > 0 ? brand.colors.bg : '#C8BFAF',
                      border: count > 0 ? `1px solid ${brand.colors.dark}` : '1px solid #E0DAD0',
                    }}>
                      {comp}
                      <span style={{ fontSize: 8, fontWeight: 700, color: count > 0 ? 'rgba(250,248,244,0.65)' : '#C8BFAF' }}>{count}</span>
                    </span>
                  )
                })}
              </div>
            </Card>

            <Card>
              <SectionTitle>Brands</SectionTitle>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {sortedBrands.map(([brandName, count]) => (
                  <span key={brandName} style={{
                    fontFamily: brand.font.sans, fontSize: 11, fontWeight: 500,
                    padding: '4px 12px', borderRadius: brand.radius.pill,
                    background: brand.colors.bg, border: '1px solid #E0DAD0', color: brand.colors.ink, letterSpacing: '0.02em',
                  }}>
                    {brandName} <span style={{ color: brand.colors.muted }}>×{count}</span>
                  </span>
                ))}
              </div>
            </Card>
          </div>
        </>
      ) : (
        <>
          {/* ── Row 2 (Graphical): Dial Colors + Watch Types ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ marginBottom: 16 }}>
            <Card>
              <SectionTitle>Dial Colors</SectionTitle>
              {STANDARD_COLORS.map(sc => {
                const count = colorCounts[sc.name] ?? 0
                return (
                  <div key={sc.name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
                    <div style={{
                      width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                      background: sc.css,
                      border: LIGHT_COLORS.has(sc.name) ? '1px solid #D0CAC0' : '1px solid transparent',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                      opacity: count === 0 ? 0.28 : 1,
                    }} />
                    <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 10, color: count > 0 ? '#1A1410' : '#C8BFAF', width: 70, flexShrink: 0 }}>
                      {sc.name}
                    </span>
                    <div style={{ flex: 1, height: 8, background: '#F0EBE3', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${maxColorCount > 0 ? (count / maxColorCount) * 100 : 0}%`,
                        background: sc.css,
                        borderRadius: 4,
                        border: LIGHT_COLORS.has(sc.name) && count > 0 ? '1px solid #C8C0B0' : 'none',
                        transition: 'width 0.5s ease',
                      }} />
                    </div>
                    <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 10, fontWeight: 600, color: count > 0 ? '#1A1410' : '#C8BFAF', width: 14, textAlign: 'right', flexShrink: 0 }}>
                      {count}
                    </span>
                  </div>
                )
              })}
            </Card>

            <Card>
              <SectionTitle>Watch Types</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: 8 }}>
                {WATCH_TYPES.map(type => (
                  <IconTile
                    key={type}
                    icon={WATCH_TYPE_ICONS[type]}
                    label={type}
                    count={typeCounts[type] ?? 0}
                  />
                ))}
              </div>
            </Card>
          </div>

          {/* ── Row 3 (Graphical): Complications + Brands ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <SectionTitle>Complications</SectionTitle>
              {COMPLICATIONS.map(comp => (
                <HorizontalBar
                  key={comp}
                  label={comp}
                  count={compCounts[comp] ?? 0}
                  maxCount={maxCompCount}
                  barColor={brand.colors.gold}
                  labelWidth={120}
                />
              ))}
            </Card>

            <Card>
              <SectionTitle>Brands</SectionTitle>
              {sortedBrands.map(([brandName, count]) => (
                <HorizontalBar
                  key={brandName}
                  label={brandName}
                  count={count}
                  maxCount={maxBrandCount}
                  barColor={brand.colors.ink}
                  labelWidth={90}
                />
              ))}
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
