'use client'

// components/straps/atoms.tsx — shared primitives + the normalized watch shape
// the Strap Drawer UI works with. Ported from the prototype's ui-atoms.jsx,
// retoned onto brand tokens.

import type { CSSProperties, ReactNode } from 'react'
import { brand } from '@/lib/brand'
import type { BraceletType } from '@/types/watch'

// The owned-watch shape the drawer needs: identity for display + the two
// compatibility keys (lugWidthMm, braceletType). Built on the page by merging a
// ResolvedOwnedWatch with its catalog row (getCatalogWatch → braceletType).
export interface StrapDrawerWatch {
  id: string
  brand: string
  model: string
  reference?: string
  caseSizeMm?: number
  lugWidthMm?: number | null
  braceletType?: BraceletType | null
  imageUrl?: string | null
}

export function Kicker({
  children,
  color = brand.colors.muted,
  size = 11,
  style = {},
}: {
  children: ReactNode
  color?: string
  size?: number
  style?: CSSProperties
}) {
  return (
    <div style={{
      fontFamily: brand.font.sans, fontSize: size, fontWeight: 600,
      letterSpacing: '0.16em', textTransform: 'uppercase', color, ...style,
    }}>
      {children}
    </div>
  )
}

type BadgeTone = 'plain' | 'width' | 'ink'
export function SpecBadge({ children, tone = 'plain', style = {} }: { children: ReactNode; tone?: BadgeTone; style?: CSSProperties }) {
  const tones: Record<BadgeTone, { bg: string; col: string; bd: string }> = {
    plain: { bg: brand.fit.plainBadge.bg, col: brand.fit.plainBadge.text, bd: brand.colors.borderMid },
    width: { bg: brand.fit.widthBadge.bg, col: brand.fit.widthBadge.text, bd: brand.fit.widthBadge.border },
    ink:   { bg: brand.colors.ink, col: brand.colors.slot, bd: brand.colors.ink },
  }
  const t = tones[tone]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontFamily: brand.font.sans, fontSize: 12, fontWeight: 500, letterSpacing: '0.04em',
      padding: '3px 8px', borderRadius: brand.radius.btn, whiteSpace: 'nowrap',
      background: t.bg, color: t.col, border: `1px solid ${t.bd}`, ...style,
    }}>
      {children}
    </span>
  )
}

export function WatchThumb({ watch, size = 40 }: { watch: StrapDrawerWatch; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 7, flexShrink: 0,
      background: brand.colors.bg, border: `1px solid ${brand.colors.borderMid}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    }}>
      {watch.imageUrl
        ? <img src={watch.imageUrl} alt={watch.model} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 3, filter: 'drop-shadow(0 2px 4px rgba(26,20,16,0.14))' }} />
        : <span style={{ fontFamily: brand.font.serif, fontSize: size * 0.42, color: brand.colors.borderLight }}>{watch.brand.charAt(0)}</span>}
    </div>
  )
}

const ICON_PATHS: Record<string, string[]> = {
  plus: ['M10 4v12', 'M4 10h12'],
  close: ['M5 5l10 10', 'M15 5L5 15'],
  chevDown: ['M5 8l5 5 5-5'],
  arrowUpRight: ['M6 14L14 6', 'M7 6h7v7'],
  check: ['M4 10.5l4 4 8-9'],
  trash: ['M3 6h14', 'M8 6V4h4v2', 'M5 6l1 11h8l1-11'],
  edit: ['M13 4l3 3', 'M4 16l1-4 8-8 3 3-8 8-4 1z'],
  photo: ['M3 5h14v10H3z', 'M3 13l4-4 3 3 3-3 4 4'],
}

export function StrapIcon({ name, size = 16, color = 'currentColor', sw = 1.5 }: { name: keyof typeof ICON_PATHS; size?: number; color?: string; sw?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {(ICON_PATHS[name] || []).map((d, i) => <path key={i} d={d} />)}
    </svg>
  )
}

export function PrimaryBtn({ children, onClick, full, disabled, style = {} }: { children: ReactNode; onClick?: () => void; full?: boolean; disabled?: boolean; style?: CSSProperties }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
      fontFamily: brand.font.sans, fontSize: 11, fontWeight: 500, letterSpacing: '0.1em',
      textTransform: 'uppercase', padding: '11px 20px', background: brand.colors.ink, color: brand.colors.slot,
      border: 'none', borderRadius: brand.radius.btn, cursor: disabled ? 'default' : 'pointer',
      width: full ? '100%' : 'auto', transition: 'opacity 0.15s', ...style,
    }}>
      {children}
    </button>
  )
}

export function GhostBtn({ children, onClick, full, style = {} }: { children: ReactNode; onClick?: () => void; full?: boolean; style?: CSSProperties }) {
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
      fontFamily: brand.font.sans, fontSize: 11, fontWeight: 500, letterSpacing: '0.1em',
      textTransform: 'uppercase', padding: '10px 18px', background: 'transparent', color: brand.colors.ink,
      border: `1px solid ${brand.colors.borderLight}`, borderRadius: brand.radius.btn, cursor: 'pointer',
      width: full ? '100%' : 'auto', ...style,
    }}>
      {children}
    </button>
  )
}

// Title for a strap: its name, unless that just echoes the material.
export function strapTitle(strap: { name?: string; material: string; color: string }): string {
  const matLabel = strap.material.charAt(0).toUpperCase() + strap.material.slice(1)
  return strap.name && strap.name !== matLabel ? strap.name : `${strap.color} ${matLabel}`
}

export function hostOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '') }
  catch { return url }
}

export function money(cents: number | undefined): string | null {
  if (cents == null) return null
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100)
}
