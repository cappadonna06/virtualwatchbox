'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { brand } from '@/lib/brand'
import type { StrapWatchOverride, UserStrap } from '@/types/watch'
import { compatibleWatches } from '@/lib/strapCompatibility'
import { materialLabel, STYLES } from '@/lib/strapDrawer/constants'
import { StrapIcon, type StrapDrawerWatch } from './atoms'
import { watchesAtWidth } from '@/lib/strapCompatibility'

export type StrapFilterState = { material: string[]; width: number[]; style: string | null }
export type StrapSortKey = 'recent' | 'width' | 'material' | 'color' | 'fits'

const SORT_OPTIONS: Array<{ id: StrapSortKey; label: string }> = [
  { id: 'recent', label: 'Recently added' },
  { id: 'width', label: 'Lug width' },
  { id: 'material', label: 'Material' },
  { id: 'color', label: 'Color' },
  { id: 'fits', label: 'Most compatible' },
]

function Chip({ children, active, dim, onClick }: { children: ReactNode; active: boolean; dim?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontFamily: brand.font.sans, fontSize: 11.5, fontWeight: active ? 600 : 500, letterSpacing: '0.02em',
      padding: '7px 13px', borderRadius: brand.radius.pill, cursor: 'pointer', whiteSpace: 'nowrap',
      background: active ? brand.colors.ink : brand.colors.slot,
      color: active ? brand.colors.slot : (dim ? brand.colors.muted : brand.colors.inkSoft),
      border: `1px solid ${active ? brand.colors.ink : brand.colors.borderMid}`,
      transition: 'background 0.15s, color 0.15s, border-color 0.15s',
    }}>
      {children}
    </button>
  )
}

function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <span style={{ fontFamily: brand.font.sans, fontSize: 9, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: brand.colors.muted, flexShrink: 0 }}>{label}</span>
      <div className="sd-chiprow" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{children}</div>
    </div>
  )
}

function SortControl({ value, setValue }: { value: StrapSortKey; setValue: (v: StrapSortKey) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])
  const current = SORT_OPTIONS.find(o => o.id === value) ?? SORT_OPTIONS[0]
  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: 'inline-flex', alignItems: 'center', gap: 10,
        background: brand.colors.slot, border: `1px solid ${brand.colors.borderMid}`, borderRadius: brand.radius.sm,
        padding: '8px 13px', cursor: 'pointer', fontFamily: brand.font.sans,
      }}>
        <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: brand.colors.muted }}>Sort</span>
        <span style={{ fontSize: 12, fontWeight: 500, color: brand.colors.ink, whiteSpace: 'nowrap' }}>{current.label}</span>
        <span style={{ color: brand.colors.muted, display: 'inline-flex', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
          <StrapIcon name="chevDown" size={13} />
        </span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: brand.zIndex.dropdown,
          background: brand.colors.slot, border: `1px solid ${brand.colors.borderMid}`, borderRadius: brand.radius.md,
          boxShadow: brand.shadow.xl, padding: 4, minWidth: 184,
        }}>
          {SORT_OPTIONS.map(o => (
            <button key={o.id} onClick={() => { setValue(o.id); setOpen(false) }} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
              padding: '9px 11px', borderRadius: brand.radius.btn, border: 'none',
              background: o.id === value ? brand.colors.bg : 'transparent', color: brand.colors.ink,
              fontFamily: brand.font.sans, fontSize: 12, fontWeight: o.id === value ? 500 : 400, cursor: 'pointer', textAlign: 'left',
            }}>
              {o.label}
              {o.id === value && <span style={{ color: brand.colors.gold, display: 'inline-flex' }}><StrapIcon name="check" size={13} /></span>}
            </button>
          ))}
        </div>
      )}
    </div>
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
  const toggle = (key: 'material' | 'width', val: string | number) => setFilters(f => {
    const arr = f[key] as Array<string | number>
    const has = arr.includes(val)
    return { ...f, [key]: has ? arr.filter(v => v !== val) : [...arr, val] } as StrapFilterState
  })
  const setStyle = (val: string) => setFilters(f => ({ ...f, style: f.style === val ? null : val }))

  const presentMaterials = [...new Set(straps.map(s => s.material))]
  const presentWidths = [...new Set(straps.map(s => s.lugWidthMm))].sort((a, b) => a - b)
  const anyActive = filters.material.length || filters.width.length || filters.style

  return (
    <div className="sd-filterbar" style={{ display: 'flex', flexDirection: 'column', gap: 13, padding: '16px 0 18px', borderBottom: `1px solid ${brand.colors.border}`, marginBottom: 24 }}>
      <div className="sd-filterrow" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap' }}>
        <div className="sd-filtergroups" style={{ display: 'flex', gap: 22, flexWrap: 'wrap', alignItems: 'center' }}>
          <FilterGroup label="Material">
            {presentMaterials.map(m => (
              <Chip key={m} active={filters.material.includes(m)} onClick={() => toggle('material', m)}>{materialLabel(m)}</Chip>
            ))}
          </FilterGroup>
          <FilterGroup label="Style">
            {STYLES.filter(st => straps.some(s => s.style === st)).map(st => (
              <Chip key={st} active={filters.style === st} onClick={() => setStyle(st)}>{st.charAt(0).toUpperCase() + st.slice(1)}</Chip>
            ))}
          </FilterGroup>
        </div>
        <SortControl value={sort} setValue={setSort} />
      </div>

      <div className="sd-filterrow" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap' }}>
        <FilterGroup label="Lug width">
          {presentWidths.map(w => {
            const wc = watchesAtWidth(watches, w)
            const on = filters.width.includes(w)
            return (
              <Chip key={w} active={on} dim={wc === 0} onClick={() => toggle('width', w)}>
                {w} mm
                <span style={{ fontSize: 9.5, fontWeight: 600, opacity: on ? 0.7 : 0.55, color: on ? brand.colors.slot : (wc > 0 ? brand.colors.gold : brand.colors.muted) }}>({wc})</span>
              </Chip>
            )
          })}
        </FilterGroup>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {anyActive ? (
            <button onClick={() => setFilters(() => ({ material: [], width: [], style: null }))} style={{
              fontFamily: brand.font.sans, fontSize: 10.5, fontWeight: 500, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: brand.colors.muted, background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            }}>Clear filters</button>
          ) : null}
          <span style={{ fontFamily: brand.font.serif, fontStyle: 'italic', fontSize: 14, color: brand.colors.muted, whiteSpace: 'nowrap' }}>
            {shown === total ? `${total} straps` : `${shown} of ${total} straps`}
          </span>
        </div>
      </div>
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
