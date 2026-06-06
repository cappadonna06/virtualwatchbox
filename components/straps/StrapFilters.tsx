'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { brand } from '@/lib/brand'
import type { StrapWatchOverride, UserStrap } from '@/types/watch'
import { compatibleWatches, watchesAtWidth } from '@/lib/strapCompatibility'
import { materialLabel, STYLES } from '@/lib/strapDrawer/constants'
import SortDropdown from '@/components/collection/SortDropdown'
import type { StrapDrawerWatch } from './atoms'

export type StrapFilterState = { material: string[]; width: number[]; style: string | null }
export type StrapSortKey = 'recent' | 'width' | 'material' | 'color' | 'fits'

const SORT_OPTIONS: Array<{ value: StrapSortKey; label: string }> = [
  { value: 'recent', label: 'Recently added' },
  { value: 'width', label: 'Lug width' },
  { value: 'material', label: 'Material' },
  { value: 'color', label: 'Color' },
  { value: 'fits', label: 'Most compatible' },
]

const SlidersIcon = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 7h8M14 7h2M4 13h2M8 13h8M12 5v4M6 11v4" />
  </svg>
)

const CrossIcon = ({ size = 9 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
    <path d="M2 2l6 6M8 2l-6 6" />
  </svg>
)

function FacetChip({ label, count, active, onClick }: { label: string; count?: number; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: brand.radius.pill,
      fontFamily: brand.font.sans, fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', lineHeight: 1.2,
      border: `1px solid ${active ? brand.colors.ink : brand.colors.border}`,
      background: active ? brand.colors.ink : 'transparent', color: active ? brand.colors.bg : brand.colors.ink,
      transition: 'all 0.15s',
    }}>
      <span>{label}</span>
      {count != null && (
        <span style={{ fontSize: 11, fontWeight: 600, color: active ? 'rgba(255,255,255,0.7)' : (count > 0 ? brand.colors.goldDeep : brand.colors.muted) }}>({count})</span>
      )}
    </button>
  )
}

function FacetGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div style={{ fontFamily: brand.font.sans, fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: brand.colors.muted, marginBottom: 10 }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>{children}</div>
    </div>
  )
}

function FilterPanelBody({ straps, filters, setFilters, watches }: {
  straps: UserStrap[]
  filters: StrapFilterState
  setFilters: (updater: (f: StrapFilterState) => StrapFilterState) => void
  watches: StrapDrawerWatch[]
}) {
  const presentMaterials = [...new Set(straps.map(s => s.material))]
  const presentWidths = [...new Set(straps.map(s => s.lugWidthMm))].sort((a, b) => a - b)
  const presentStyles = STYLES.filter(st => straps.some(s => s.style === st))

  const toggle = (key: 'material' | 'width', val: string | number) => setFilters(f => {
    const arr = f[key] as Array<string | number>
    const has = arr.includes(val)
    return { ...f, [key]: has ? arr.filter(v => v !== val) : [...arr, val] } as StrapFilterState
  })
  const setStyle = (val: string) => setFilters(f => ({ ...f, style: f.style === val ? null : val }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <FacetGroup label="Material">
        {presentMaterials.map(m => (
          <FacetChip key={m} label={materialLabel(m)} active={filters.material.includes(m)} onClick={() => toggle('material', m)} />
        ))}
      </FacetGroup>
      <FacetGroup label="Lug width">
        {presentWidths.map(w => (
          <FacetChip key={w} label={`${w} mm`} count={watchesAtWidth(watches, w)} active={filters.width.includes(w)} onClick={() => toggle('width', w)} />
        ))}
      </FacetGroup>
      {presentStyles.length > 0 && (
        <FacetGroup label="Style">
          {presentStyles.map(st => (
            <FacetChip key={st} label={st.charAt(0).toUpperCase() + st.slice(1)} active={filters.style === st} onClick={() => setStyle(st)} />
          ))}
        </FacetGroup>
      )}
    </div>
  )
}

function FiltersButton({ activeCount, open, onClick }: { activeCount: number; open: boolean; onClick: () => void }) {
  const on = activeCount > 0
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      data-strap-filter-trigger="true"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: brand.radius.pill,
        background: on ? brand.colors.ink : 'transparent', border: `1px solid ${on ? brand.colors.ink : brand.colors.borderLight}`,
        color: on ? brand.colors.bg : brand.colors.ink, fontFamily: brand.font.sans, fontSize: 14, fontWeight: 500, cursor: 'pointer', flexShrink: 0,
      }}
    >
      <SlidersIcon />
      <span>Filters</span>
      {on && (
        <span style={{ fontSize: 12, fontWeight: 600, background: brand.colors.gold, color: brand.colors.ink, padding: '1px 7px', borderRadius: brand.radius.pill, minWidth: 18, textAlign: 'center' }}>{activeCount}</span>
      )}
    </button>
  )
}

export function FilterBar({
  straps,
  filters,
  setFilters,
  watches,
  sort,
  setSort,
  total,
  shown,
}: {
  straps: UserStrap[]
  filters: StrapFilterState
  setFilters: (updater: (f: StrapFilterState) => StrapFilterState) => void
  watches: StrapDrawerWatch[]
  sort: StrapSortKey
  setSort: (v: StrapSortKey) => void
  total: number
  shown: number
}) {
  const [screenWidth, setScreenWidth] = useState(0)
  const [open, setOpen] = useState(false)
  const popRef = useRef<HTMLDivElement | null>(null)
  const isMobile = screenWidth > 0 && screenWidth < 768

  useEffect(() => {
    const update = () => setScreenWidth(window.innerWidth)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // Desktop popover: close on outside pointerdown (but not the trigger).
  useEffect(() => {
    if (!open || isMobile) return
    const onDown = (e: PointerEvent) => {
      const t = e.target as Element | null
      if (popRef.current?.contains(t)) return
      if (t?.closest('[data-strap-filter-trigger="true"]')) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open, isMobile])

  // Body-scroll lock for the mobile sheet.
  useEffect(() => {
    if (open && isMobile) {
      document.documentElement.classList.add('sheet-lock')
      return () => document.documentElement.classList.remove('sheet-lock')
    }
  }, [open, isMobile])

  const activeCount = filters.material.length + filters.width.length + (filters.style ? 1 : 0)
  const clearAll = () => setFilters(() => ({ material: [], width: [], style: null }))

  const facetChips: Array<{ key: string; label: string; clear: () => void }> = [
    ...filters.material.map(m => ({ key: `m-${m}`, label: materialLabel(m), clear: () => setFilters(f => ({ ...f, material: f.material.filter(x => x !== m) })) })),
    ...filters.width.map(w => ({ key: `w-${w}`, label: `${w} mm`, clear: () => setFilters(f => ({ ...f, width: f.width.filter(x => x !== w) })) })),
    ...(filters.style ? [{ key: 'style', label: filters.style.charAt(0).toUpperCase() + filters.style.slice(1), clear: () => setFilters(f => ({ ...f, style: null })) }] : []),
  ]

  const chipsStrip = facetChips.length > 0 && (
    <div className="sd-chiprow" style={{ display: 'flex', gap: 7, overflowX: 'auto', flex: isMobile ? undefined : '1 1 0', minWidth: 0, alignItems: 'center' }}>
      {facetChips.map(chip => (
        <button key={chip.key} type="button" onClick={chip.clear} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 6px 5px 11px', borderRadius: brand.radius.pill,
          background: brand.fit.plainBadge.bg, border: `1px solid ${brand.colors.border}`, fontFamily: brand.font.sans, fontSize: 12, fontWeight: 500,
          color: brand.colors.ink, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          <span>{chip.label}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, borderRadius: brand.radius.pill, background: 'rgba(26,20,16,0.08)', color: brand.colors.ink }}><CrossIcon /></span>
        </button>
      ))}
      {activeCount > 1 && (
        <button type="button" onClick={clearAll} style={{ fontFamily: brand.font.sans, fontSize: 12, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: brand.colors.muted, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, paddingLeft: 4 }}>Clear</button>
      )}
    </div>
  )

  const filtersButton = <FiltersButton activeCount={activeCount} open={open} onClick={() => setOpen(o => !o)} />
  const sortControl = <SortDropdown label="Sort" value={sort} options={SORT_OPTIONS} onChange={v => setSort(v as StrapSortKey)} compact={isMobile} />

  return (
    <div style={{ padding: '16px 0 18px', borderBottom: `1px solid ${brand.colors.border}`, marginBottom: 24 }}>
      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ position: 'relative' }}>{filtersButton}</div>
            {sortControl}
          </div>
          {chipsStrip}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            {filtersButton}
            {open && (
              <div ref={popRef} style={{
                position: 'absolute', top: 'calc(100% + 10px)', left: 0, width: 'min(560px, 90vw)', zIndex: brand.zIndex.dropdown,
                background: brand.colors.slot, border: `1px solid ${brand.colors.borderMid}`, borderRadius: brand.radius.xl,
                boxShadow: '0 12px 32px rgba(26,20,16,0.12)', padding: '20px 22px',
              }}>
                <FilterPanelBody straps={straps} filters={filters} setFilters={setFilters} watches={watches} />
                {activeCount > 0 && (
                  <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${brand.colors.border}`, display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="button" onClick={clearAll} style={{ fontFamily: brand.font.sans, fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: brand.colors.muted, background: 'none', border: 'none', cursor: 'pointer' }}>Clear all</button>
                  </div>
                )}
              </div>
            )}
          </div>
          {chipsStrip || <div style={{ flex: '1 1 0' }} />}
          <span style={{ fontFamily: brand.font.serif, fontStyle: 'italic', fontSize: 14, color: brand.colors.muted, whiteSpace: 'nowrap', flexShrink: 0 }}>
            {shown === total ? `${total} straps` : `${shown} of ${total} straps`}
          </span>
          {sortControl}
        </div>
      )}

      {/* Mobile bottom sheet */}
      {isMobile && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(26,20,16,0.45)', backdropFilter: 'blur(2px)', opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none', transition: 'opacity 0.25s ease', zIndex: 200 }} />
          <div role="dialog" aria-modal="true" style={{
            position: 'fixed', left: 0, right: 0, bottom: 0, background: brand.colors.bg,
            borderTopLeftRadius: 20, borderTopRightRadius: 20, transform: open ? 'translateY(0)' : 'translateY(100%)',
            transition: 'transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)', zIndex: 201, maxHeight: '88vh',
            display: 'flex', flexDirection: 'column', boxShadow: '0 -10px 40px rgba(26,20,16,0.16)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: brand.colors.borderLight }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 14px', borderBottom: `1px solid ${brand.colors.border}` }}>
              <h3 style={{ fontFamily: brand.font.serif, fontSize: 22, fontWeight: 400, margin: 0, color: brand.colors.ink }}>Filters</h3>
              <button type="button" onClick={clearAll} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.muted, fontWeight: 500, letterSpacing: '0.04em' }}>Reset</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 28px' }}>
              <FilterPanelBody straps={straps} filters={filters} setFilters={setFilters} watches={watches} />
            </div>
            <div style={{ padding: '12px 16px calc(12px + env(safe-area-inset-bottom))', borderTop: `1px solid ${brand.colors.border}`, background: brand.colors.slot, display: 'flex', gap: 10 }}>
              <button type="button" onClick={() => setOpen(false)} style={{ flex: '0 0 auto', padding: '12px 18px', borderRadius: brand.radius.md, background: 'transparent', border: `1px solid ${brand.colors.borderLight}`, fontFamily: brand.font.sans, fontSize: 14, fontWeight: 500, color: brand.colors.ink, cursor: 'pointer' }}>Close</button>
              <button type="button" onClick={() => setOpen(false)} style={{ flex: 1, padding: '12px 18px', borderRadius: brand.radius.md, background: brand.colors.ink, border: 'none', color: brand.colors.bg, fontFamily: brand.font.sans, fontSize: 14, fontWeight: 600, letterSpacing: '0.04em', cursor: 'pointer' }}>
                Show {shown} {shown === 1 ? 'strap' : 'straps'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export function applyFilters(straps: UserStrap[], filters: StrapFilterState): UserStrap[] {
  return straps.filter(s => {
    if (filters.material.length && !filters.material.includes(s.material)) return false
    if (filters.width.length && !filters.width.includes(s.lugWidthMm)) return false
    if (filters.style && s.style !== filters.style) return false
    return true
  })
}

export function applySort(straps: UserStrap[], sort: StrapSortKey, watches: StrapDrawerWatch[], overrides: StrapWatchOverride[]): UserStrap[] {
  const arr = [...straps]
  switch (sort) {
    case 'width': return arr.sort((a, b) => a.lugWidthMm - b.lugWidthMm || b.sortOrder - a.sortOrder)
    case 'material': return arr.sort((a, b) => a.material.localeCompare(b.material) || b.sortOrder - a.sortOrder)
    case 'color': return arr.sort((a, b) => a.color.localeCompare(b.color))
    case 'fits': return arr.sort((a, b) => compatibleWatches(b, watches, overrides).length - compatibleWatches(a, watches, overrides).length)
    case 'recent':
    default: return arr.sort((a, b) => b.sortOrder - a.sortOrder)
  }
}
