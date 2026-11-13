'use client'

import { useEffect, useRef, type CSSProperties } from 'react'
import SortDropdown from '@/components/collection/SortDropdown'
import { brand } from '@/lib/brand'
import { strapDesign, type StudioStrap } from '@/lib/strapStudio'
import type { StudioController, StudioSourceMode } from './useStudioController'

const sourceOptions: { value: StudioSourceMode; label: string }[] = [
  { value: 'all', label: 'All Straps' },
  { value: 'drawer', label: 'My Drawer' },
]

function filterOptions(values: string[], label: string) {
  return [{ value: '', label }, ...values.map(value => ({ value, label: value }))]
}

export default function StrapPickerTray({ c, isMobile }: { c: StudioController; isMobile: boolean }) {
  const resultsRef = useRef<HTMLDivElement>(null)
  const { query, color, design } = c.filters
  const filtered = c.activeCategory !== 'All' || Boolean(query.trim() || color || design)
  const count = c.visibleStraps.length
  const total = c.sourceStraps.length

  useEffect(() => {
    if (resultsRef.current) resultsRef.current.scrollTop = 0
  }, [c.activeCategory, c.source, query, color, design])

  return (
    <section aria-labelledby="studio-straps" style={{
      width: '100%',
      minWidth: 0,
      background: brand.studio.panel,
      border: `1px solid ${brand.studio.hairlineSoft}`,
      borderRadius: brand.radius.xl,
      boxShadow: brand.shadow.sm,
      padding: isMobile ? '14px 12px' : '16px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <h2 id="studio-straps" style={{ margin: 0, color: brand.studio.textHi, font: `400 26px ${brand.font.serif}` }}>
          Browse straps
        </h2>
        {c.showSourceToggle && (
          <SortDropdown
            compact
            label="Source"
            ariaLabel={`Strap source, ${sourceOptions.find(option => option.value === c.source)?.label}`}
            value={c.source}
            options={sourceOptions}
            onChange={value => c.setSource(value as StudioSourceMode)}
          />
        )}
      </div>

      {total > 0 && (
        <>
          <div role="group" aria-label="Strap material" style={{
            display: 'flex', gap: 4, flexWrap: 'wrap', borderBottom: `1px solid ${brand.studio.hairlineSoft}`,
          }}>
            {c.categories.map(category => (
              <button
                type="button"
                key={category}
                aria-pressed={c.activeCategory === category}
                onClick={() => c.setCategory(category)}
                style={{
                  padding: isMobile ? '7px 8px 9px' : '7px 14px 9px',
                  border: 0,
                  borderBottom: `2px solid ${c.activeCategory === category ? brand.colors.gold : 'transparent'}`,
                  background: 'transparent',
                  color: c.activeCategory === category ? brand.colors.goldDeep : brand.studio.textLow,
                  font: `500 13px ${brand.font.sans}`,
                  cursor: 'pointer',
                }}
              >
                {category}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <label style={{
              display: 'flex', alignItems: 'center', gap: 9, flex: isMobile ? '1 0 100%' : '1 1 220px',
              minWidth: 0, padding: '0 11px', height: brand.controls.dropdown.triggerHeight,
              border: `1px solid ${brand.colors.borderLight}`, borderRadius: brand.radius.md, color: brand.studio.textLow,
            }}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true" style={{ flexShrink: 0 }}>
                <circle cx="8.5" cy="8.5" r="5.25" />
                <path d="m12.5 12.5 4 4" strokeLinecap="round" />
              </svg>
              <input
                type="search"
                aria-label="Search straps"
                placeholder="Search straps"
                value={query}
                onChange={e => c.setFilter('query', e.target.value)}
                style={{
                  minWidth: 0, width: '100%', height: '100%', border: 0, background: 'transparent',
                  color: brand.studio.textHi, font: `400 ${isMobile ? 16 : 14}px ${brand.font.sans}`,
                }}
              />
            </label>
            <SortDropdown
              compact={isMobile}
              align="start"
              label="Color"
              ariaLabel={`Strap color, ${color || 'Any color'}`}
              value={color}
              options={filterOptions(c.colorOptions, 'Any color')}
              onChange={value => c.setFilter('color', value)}
            />
            <SortDropdown
              compact={isMobile}
              label="Style"
              ariaLabel={`Strap style, ${design || 'Any style'}`}
              value={design}
              options={filterOptions(c.designOptions, 'Any style')}
              onChange={value => c.setFilter('design', value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, minHeight: 24 }}>
            <span role="status" style={{ color: brand.studio.textLow, font: `400 13px ${brand.font.sans}` }}>
              {count === total ? count : `${count} of ${total}`} {total === 1 ? 'strap' : 'straps'}
            </span>
            {filtered && (
              <button type="button" onClick={c.clearFilters} style={clearStyle}>Clear filters</button>
            )}
          </div>
        </>
      )}

      <div ref={resultsRef} style={{ maxHeight: isMobile ? undefined : 350, overflowY: isMobile ? undefined : 'auto' }}>
        {c.groups.map(group => (
          <section key={group.label} aria-label={group.label} style={{ marginBottom: 16 }}>
            <h3 style={{ margin: '0 0 7px', font: `500 14px ${brand.font.sans}`, color: brand.studio.textHi }}>{group.label}</h3>
            <div style={{
              display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? 84 : 112}px, 1fr))`,
              gap: isMobile ? 8 : 10,
            }}>
              {group.straps.map(strap => (
                <StrapChoice
                  key={strap.key}
                  strap={strap}
                  active={strap.key === c.currentStrap?.key}
                  showDesign={c.activeCategory === 'All'}
                  onSelect={() => c.selectStrap(strap.id)}
                />
              ))}
            </div>
          </section>
        ))}
        {count === 0 && (
          <p style={{ margin: '0 0 8px', padding: '12px 0', color: brand.studio.textLow, font: `400 14px ${brand.font.sans}` }}>
            {total ? 'No straps match these filters.' : 'No straps available for this watch.'}
          </p>
        )}
      </div>
    </section>
  )
}

const clearStyle: CSSProperties = {
  border: 0,
  background: 'transparent',
  padding: '3px 0',
  font: `500 13px ${brand.font.sans}`,
  color: brand.colors.goldDeep,
  cursor: 'pointer',
}

function StrapChoice({ strap, active, showDesign, onSelect }: {
  strap: StudioStrap
  active: boolean
  showDesign: boolean
  onSelect: () => void
}) {
  const design = strapDesign(strap)
  const title = strap.source === 'drawer' ? strap.label : strap.color || strap.label
  const detail = strap.source === 'drawer' ? [strap.color, showDesign ? design : ''].filter(Boolean).join(' · ') : showDesign ? design : ''
  return (
    <button
      type="button"
      aria-label={strap.source === 'drawer' ? [title, strap.color, design].filter(Boolean).join(', ') : strap.label}
      title={strap.label}
      aria-pressed={active}
      onClick={onSelect}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'stretch', textAlign: 'left', overflow: 'hidden',
        minWidth: 0, border: `1px solid ${active ? brand.colors.gold : brand.studio.hairlineSoft}`,
        borderRadius: brand.radius.md, padding: 0, background: active ? brand.colors.goldWash : brand.studio.panel,
        boxShadow: active ? brand.shadow.gold : undefined, color: brand.studio.textHi, cursor: 'pointer',
      }}
    >
      <span style={{ height: 104, background: strap.imageUrl ? brand.studio.panel : strap.colorHex ?? brand.colors.paperWarm }}>
        {strap.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={strap.imageUrl} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
        )}
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '6px 8px 8px' }}>
        <span style={{ font: `600 12px ${brand.font.sans}`, overflowWrap: 'anywhere' }}>{title}</span>
        {detail && <span style={{ color: brand.studio.textLow, font: `400 11px ${brand.font.sans}` }}>{detail}</span>}
      </span>
    </button>
  )
}
