'use client'

import { useState } from 'react'
import type { Watch, WatchType } from '@/types/watch'

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
    <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A89880', marginBottom: 14 }}>
      {children}
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #EAE5DC', borderRadius: 10, padding: '20px 24px', marginBottom: 16 }}>
      {children}
    </div>
  )
}

function ValueRow({ label, value, prominent, color }: { label: string; value: string; prominent?: boolean; color?: string }) {
  return (
    <div style={{ borderBottom: '1px solid #F0EBE3', paddingBottom: 10 }}>
      <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 10, color: '#A89880', marginBottom: 3, letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontFamily: prominent ? 'var(--font-cormorant)' : 'var(--font-dm-sans)', fontSize: prominent ? 28 : 14, fontWeight: prominent ? 400 : 600, color: color ?? '#1A1410' }}>
        {value}
      </div>
    </div>
  )
}

// ─── Graphical sub-components ─────────────────────────────────────────────────

function HorizontalBar({ label, count, maxCount, barColor, labelWidth = 100 }: { label: string; count: number; maxCount: number; barColor: string; labelWidth?: number }) {
  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
      <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 11, color: count > 0 ? '#1A1410' : '#C8BFAF', width: labelWidth, flexShrink: 0 }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 10, background: '#F0EBE3', borderRadius: 5, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 5, transition: 'width 0.5s ease' }} />
      </div>
      <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 11, fontWeight: 600, color: count > 0 ? '#1A1410' : '#C8BFAF', width: 20, textAlign: 'right', flexShrink: 0 }}>
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
      padding: '14px 8px', borderRadius: 10,
      background: owned ? '#FAF8F4' : 'transparent',
      border: owned ? '1px solid #E8E2D8' : '1px solid #F0EBE3',
      opacity: owned ? 1 : 0.45,
    }}>
      <span style={{ fontSize: 26, lineHeight: 1 }}>{icon}</span>
      <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 8, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#1A1410', textAlign: 'center', lineHeight: 1.3 }}>
        {label}
      </span>
      <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 10, fontWeight: 700, color: owned ? '#C9A84C' : '#C8BFAF' }}>
        ×{count}
      </span>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  watches: Watch[]
}

export default function CollectionStats({ watches }: Props) {
  const [view, setView] = useState<'overview' | 'graphical'>('overview')

  // Compute all stats
  const totalValue = watches.reduce((s, w) => s + w.estimatedValue, 0)
  const costBasis  = watches.reduce((s, w) => s + w.purchasePrice, 0)
  const gainLoss   = totalValue - costBasis
  const highest    = watches.length ? watches.reduce((a, b) => a.estimatedValue > b.estimatedValue ? a : b) : null
  const sorted     = [...watches].sort((a, b) => a.estimatedValue - b.estimatedValue)
  const median     = sorted.length ? sorted[Math.floor(sorted.length / 2)] : null

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
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
        <div style={{ display: 'inline-flex', border: '1px solid #E8E2D8', borderRadius: 6, overflow: 'hidden', background: '#FAF8F4' }}>
          {(['overview', 'graphical'] as const).map((v, i) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                fontFamily: 'var(--font-dm-sans)', fontSize: 11, fontWeight: 500,
                letterSpacing: '0.04em', padding: '7px 18px',
                background: view === v ? '#1A1410' : 'transparent',
                color: view === v ? '#FAF8F4' : '#A89880',
                border: 'none', borderLeft: i > 0 ? '1px solid #E8E2D8' : 'none',
                cursor: 'pointer', transition: 'background 0.15s, color 0.15s',
                textTransform: 'capitalize',
              }}
            >
              {v === 'overview' ? 'Overview' : 'Graphical'}
            </button>
          ))}
        </div>
      </div>

      {/* ── C1 — Portfolio Value (same in both views) ── */}
      <Card>
        <SectionTitle>Portfolio Value</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px' }}>
          <ValueRow label="Total Est. Value" value={fmt(totalValue)} prominent />
          <ValueRow
            label="Gain / Loss"
            value={`${gainLoss >= 0 ? '↑' : '↓'} ${fmt(Math.abs(gainLoss))}`}
            color={gainLoss >= 0 ? '#2D6A2D' : '#8A2020'}
          />
          <ValueRow label="Cost Basis"    value={fmt(costBasis)} />
          <ValueRow label="Median Value"  value={median ? fmt(median.estimatedValue) : '—'} />
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
      </Card>

      {view === 'overview' ? (
        <>
          {/* ── C2 — Dial Colors (Overview) ── */}
          <Card>
            <SectionTitle>Dial Colors</SectionTitle>
            <div style={{ display: 'flex', gap: 20, overflowX: 'auto', paddingBottom: 4 }}>
              {STANDARD_COLORS.map(sc => {
                const count = colorCounts[sc.name] ?? 0
                return (
                  <div key={sc.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <div style={{ position: 'relative' }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%', background: sc.css,
                        border: ['White','Silver','Champagne'].includes(sc.name) ? '1px solid #E0DAD0' : '1px solid transparent',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.14)', opacity: count === 0 ? 0.35 : 1,
                      }} />
                      {count > 0 && (
                        <span style={{
                          position: 'absolute', top: -4, right: -4, width: 16, height: 16,
                          borderRadius: '50%', background: '#1A1410', color: '#FAF8F4',
                          fontSize: 9, fontFamily: 'var(--font-dm-sans)', fontWeight: 600,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>{count}</span>
                      )}
                    </div>
                    <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 9, color: count > 0 ? '#1A1410' : '#C8BFAF', letterSpacing: '0.04em', textAlign: 'center' }}>
                      {sc.name}
                    </span>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* ── C3 — Watch Types (Overview) ── */}
          <Card>
            <SectionTitle>Watch Types</SectionTitle>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {WATCH_TYPES.map(type => {
                const count = typeCounts[type] ?? 0
                return (
                  <span key={type} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    fontFamily: 'var(--font-dm-sans)', fontSize: 10, fontWeight: 500, letterSpacing: '0.04em',
                    padding: '5px 12px', borderRadius: 20,
                    background: count > 0 ? '#1A1410' : 'transparent',
                    color: count > 0 ? '#FAF8F4' : '#C8BFAF',
                    border: count > 0 ? '1px solid #1A1410' : '1px solid #E0DAD0',
                  }}>
                    {type}
                    <span style={{ fontSize: 9, fontWeight: 700, color: count > 0 ? 'rgba(250,248,244,0.7)' : '#C8BFAF' }}>{count}</span>
                  </span>
                )
              })}
            </div>
          </Card>

          {/* ── C4 — Complications (Overview) ── */}
          <Card>
            <SectionTitle>Complications</SectionTitle>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {COMPLICATIONS.map(comp => {
                const count = compCounts[comp] ?? 0
                return (
                  <span key={comp} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    fontFamily: 'var(--font-dm-sans)', fontSize: 10, fontWeight: 500, letterSpacing: '0.04em',
                    padding: '5px 12px', borderRadius: 20,
                    background: count > 0 ? '#2A2520' : 'transparent',
                    color: count > 0 ? '#FAF8F4' : '#C8BFAF',
                    border: count > 0 ? '1px solid #2A2520' : '1px solid #E0DAD0',
                  }}>
                    {comp}
                    <span style={{ fontSize: 9, fontWeight: 700, color: count > 0 ? 'rgba(250,248,244,0.7)' : '#C8BFAF' }}>{count}</span>
                  </span>
                )
              })}
            </div>
          </Card>

          {/* ── C5 — Brands (Overview) ── */}
          <Card>
            <SectionTitle>Brands</SectionTitle>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {sortedBrands.map(([brand, count]) => (
                <span key={brand} style={{
                  fontFamily: 'var(--font-dm-sans)', fontSize: 11, fontWeight: 500,
                  padding: '5px 14px', borderRadius: 20,
                  background: '#FAF8F4', border: '1px solid #E0DAD0', color: '#1A1410', letterSpacing: '0.02em',
                }}>
                  {brand} <span style={{ color: '#A89880' }}>×{count}</span>
                </span>
              ))}
            </div>
          </Card>
        </>
      ) : (
        <>
          {/* ── C2 — Dial Colors (Graphical) ── */}
          <Card>
            <SectionTitle>Dial Colors</SectionTitle>
            {STANDARD_COLORS.map(sc => {
              const count = colorCounts[sc.name] ?? 0
              return (
                <div key={sc.name} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                    background: sc.css,
                    border: ['White','Silver','Champagne'].includes(sc.name) ? '1px solid #E0DAD0' : '1px solid transparent',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                    opacity: count === 0 ? 0.3 : 1,
                  }} />
                  <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 11, color: count > 0 ? '#1A1410' : '#C8BFAF', width: 80, flexShrink: 0 }}>
                    {sc.name}
                  </span>
                  <div style={{ flex: 1, height: 10, background: '#F0EBE3', borderRadius: 5, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${maxColorCount > 0 ? (count / maxColorCount) * 100 : 0}%`,
                      background: sc.css,
                      borderRadius: 5,
                      border: ['White','Silver','Champagne'].includes(sc.name) && count > 0 ? '1px solid #D0CAC0' : 'none',
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                  <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 11, fontWeight: 600, color: count > 0 ? '#1A1410' : '#C8BFAF', width: 16, textAlign: 'right', flexShrink: 0 }}>
                    {count}
                  </span>
                </div>
              )
            })}
          </Card>

          {/* ── C3 — Watch Types (Graphical) ── */}
          <Card>
            <SectionTitle>Watch Types</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 10 }}>
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

          {/* ── C4 — Complications (Graphical) ── */}
          <Card>
            <SectionTitle>Complications</SectionTitle>
            {COMPLICATIONS.map(comp => (
              <HorizontalBar
                key={comp}
                label={comp}
                count={compCounts[comp] ?? 0}
                maxCount={maxCompCount}
                barColor="#C9A84C"
                labelWidth={130}
              />
            ))}
          </Card>

          {/* ── C5 — Brands (Graphical) ── */}
          <Card>
            <SectionTitle>Brands</SectionTitle>
            {sortedBrands.map(([brand, count]) => (
              <HorizontalBar
                key={brand}
                label={brand}
                count={count}
                maxCount={maxBrandCount}
                barColor="#1A1410"
                labelWidth={100}
              />
            ))}
          </Card>
        </>
      )}
    </div>
  )
}
