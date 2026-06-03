'use client'

// components/serviceRoom/primitives.tsx
// Shared Service Room UI primitives — recreated from the design handoff
// (docs/design-system/design_handoff_service_room) using brand tokens.

import type { CSSProperties, ReactNode } from 'react'
import { brand } from '@/lib/brand'
import WatchImageOrDial from '@/components/watchbox/WatchImageOrDial'
import type { ResolvedOwnedWatch } from '@/types/watch'
import {
  docTypeMeta,
  serviceTypeMeta,
  type ServiceStatus,
  type WarrantyStatus,
} from '@/lib/serviceRoom/derive'

const sans = brand.font.sans
const serif = brand.font.serif

// ─── Icon set (inline, 1.5px stroke) ─────────────────────────────────────
export type IconName =
  | 'wrench' | 'doc' | 'box' | 'shield' | 'calendar' | 'clock' | 'plus'
  | 'close' | 'chevron' | 'chevronDown' | 'download' | 'check' | 'drop'
  | 'spark' | 'receipt' | 'list' | 'grid' | 'rows' | 'arrowUpRight' | 'search'

export function Icon({
  name, size = 16, color = 'currentColor', strokeWidth = 1.5, style,
}: { name: IconName; size?: number; color?: string; strokeWidth?: number; style?: CSSProperties }) {
  const p = {
    fill: 'none', stroke: color, strokeWidth,
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  }
  const paths: Record<IconName, ReactNode> = {
    wrench: <path {...p} d="M14.5 5.8a3.3 3.3 0 0 1-4.2 4.2l-4.9 4.9a1.4 1.4 0 0 1-2-2l4.9-4.9a3.3 3.3 0 0 1 4.2-4.2L10.3 6 11 8.3l2.3.7 1.2-3.2Z" />,
    doc: <><path {...p} d="M5 2.5h5l3 3v10a.5.5 0 0 1-.5.5h-7.5a.5.5 0 0 1-.5-.5v-12a.5.5 0 0 1 .5-.5Z" /><path {...p} d="M10 2.5v3h3" /></>,
    box: <><path {...p} d="M3 6 8 3.5 13 6v5L8 13.5 3 11V6Z" /><path {...p} d="M3 6l5 2.5L13 6M8 8.5v5" /></>,
    shield: <path {...p} d="M8 2.5l4.5 1.7v3.6c0 3-1.9 5.2-4.5 6.2-2.6-1-4.5-3.2-4.5-6.2V4.2L8 2.5Z" />,
    calendar: <><rect {...p} x="3" y="4" width="10" height="9.5" rx="1" /><path {...p} d="M3 6.8h10M5.5 2.6v2.4M10.5 2.6v2.4" /></>,
    clock: <><circle {...p} cx="8" cy="8" r="5.5" /><path {...p} d="M8 5v3l2 1.4" /></>,
    plus: <path {...p} d="M8 3.5v9M3.5 8h9" />,
    close: <path {...p} d="M4 4l8 8M12 4l-8 8" />,
    chevron: <path {...p} d="M6 4l4 4-4 4" />,
    chevronDown: <path {...p} d="M4 6l4 4 4-4" />,
    download: <><path {...p} d="M8 3v7M5 7.5 8 10.5l3-3" /><path {...p} d="M3.5 12.5h9" /></>,
    check: <path {...p} d="M3.5 8.5 6.5 11.5 12.5 4.5" />,
    drop: <path {...p} d="M8 2.5c2.2 2.6 3.8 4.8 3.8 7a3.8 3.8 0 0 1-7.6 0c0-2.2 1.6-4.4 3.8-7Z" />,
    spark: <path {...p} d="M8 2.5v3M8 10.5v3M2.5 8h3M10.5 8h3M4.4 4.4l1.6 1.6M10 10l1.6 1.6M11.6 4.4 10 6M6 10l-1.6 1.6" />,
    receipt: <><path {...p} d="M4 2.5h8v11l-1.3-.9-1.3.9-1.4-.9-1.3.9-1.4-.9L4 13.5v-11Z" /><path {...p} d="M6 5.5h4M6 8h4" /></>,
    list: <path {...p} d="M3 4.5h10M3 8h10M3 11.5h10" />,
    grid: <><rect {...p} x="3" y="3" width="4" height="4" rx="0.6" /><rect {...p} x="9" y="3" width="4" height="4" rx="0.6" /><rect {...p} x="3" y="9" width="4" height="4" rx="0.6" /><rect {...p} x="9" y="9" width="4" height="4" rx="0.6" /></>,
    rows: <><rect {...p} x="3" y="3.5" width="10" height="3" rx="0.6" /><rect {...p} x="3" y="9.5" width="10" height="3" rx="0.6" /></>,
    arrowUpRight: <path {...p} d="M5 11 11 5M6 5h5v5" />,
    search: <><circle {...p} cx="7.3" cy="7.3" r="4" /><path {...p} d="M10.5 10.5 13.5 13.5" /></>,
  }
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={style} aria-hidden="true">
      {paths[name]}
    </svg>
  )
}

// ─── Meta label (ALL CAPS, tracked) ──────────────────────────────────────
export function Meta({ children, style, color = brand.colors.muted }: { children: ReactNode; style?: CSSProperties; color?: string }) {
  return (
    <span style={{
      fontFamily: sans, fontSize: 10, fontWeight: 500, letterSpacing: '0.12em',
      textTransform: 'uppercase', color, ...style,
    }}>{children}</span>
  )
}

// ─── Status chip ─────────────────────────────────────────────────────────
export function StatusChip({ status, size = 'md', showDate = false }: { status: ServiceStatus; size?: 'sm' | 'md'; showDate?: boolean }) {
  const small = size === 'sm'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontFamily: sans, fontSize: small ? 10 : 11, fontWeight: 600,
      letterSpacing: '0.04em', padding: small ? '3px 9px' : '4px 11px',
      borderRadius: brand.radius.pill, background: status.bg, color: status.fg, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 6, background: status.dot, flexShrink: 0 }} />
      {status.label}{showDate ? ` · ${status.due.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}` : ''}
    </span>
  )
}

// ─── Warranty chip ───────────────────────────────────────────────────────
export function WarrantyChip({ warranty, size = 'md' }: { warranty: WarrantyStatus | null; size?: 'sm' | 'md' }) {
  if (!warranty) return null
  const small = size === 'sm'
  const monthYear = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
  const txt = warranty.key === 'expired' ? 'Warranty expired'
    : warranty.key === 'soon' ? `Warranty ends ${monthYear(warranty.date)}`
    : `Warranty to ${monthYear(warranty.date)}`
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontFamily: sans, fontSize: small ? 10 : 11, fontWeight: 500,
      letterSpacing: '0.02em', padding: small ? '3px 9px' : '4px 10px',
      borderRadius: brand.radius.pill, background: warranty.bg, color: warranty.fg, whiteSpace: 'nowrap',
    }}>
      <Icon name="shield" size={11} color={warranty.fg} />{txt}
    </span>
  )
}

// ─── Service-type pill ───────────────────────────────────────────────────
export function TypeTag({ type, active = false, onClick }: { type: string; active?: boolean; onClick?: () => void }) {
  const t = serviceTypeMeta(type)
  const interactive = !!onClick
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!interactive}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 7,
        fontFamily: sans, fontSize: 12, fontWeight: 500, letterSpacing: '0.01em',
        padding: '7px 13px', borderRadius: brand.radius.pill, cursor: interactive ? 'pointer' : 'default',
        background: active ? brand.colors.ink : 'transparent',
        color: active ? brand.colors.slot : brand.colors.ink,
        border: `1px solid ${active ? brand.colors.ink : brand.colors.borderLight}`,
        transition: `all ${brand.transition.fast}`, whiteSpace: 'nowrap',
      }}>
      <span style={{ fontSize: 13, lineHeight: 1, opacity: active ? 0.9 : 0.5 }}>{t.glyph}</span>
      {t.label}
    </button>
  )
}

// ─── Document filter chip ────────────────────────────────────────────────
export function DocChip({ active, label, count, onClick }: { active: boolean; label: string; count?: number; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontFamily: sans, fontSize: 11, fontWeight: 500, letterSpacing: '0.02em',
      padding: '5px 11px', borderRadius: brand.radius.pill, cursor: 'pointer',
      background: active ? brand.colors.ink : 'transparent', color: active ? brand.colors.slot : brand.colors.muted,
      border: `1px solid ${active ? brand.colors.ink : brand.colors.border}`, transition: `all ${brand.transition.fast}`,
    }}>
      {label}{count != null && <span style={{ opacity: 0.6 }}>{count}</span>}
    </button>
  )
}

// ─── Section head (gold eyebrow + serif title + hint below) ──────────────
export function SectionHead({ eyebrow, title, hint }: { eyebrow: string; title: string; hint?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <Meta style={{ color: brand.colors.gold, display: 'block', marginBottom: 5 }}>{eyebrow}</Meta>
      <h2 style={{ fontFamily: serif, fontSize: 28, fontWeight: 400, color: brand.colors.ink, lineHeight: 1.05, margin: 0 }}>{title}</h2>
      {hint && <span style={{ fontFamily: sans, fontSize: 12, color: brand.colors.muted, display: 'block', marginTop: 6 }}>{hint}</span>}
    </div>
  )
}

// ─── Document tile (striped paper placeholder, tinted by doc family) ─────
export function DocTile({ type, size = 38 }: { type: string; size?: number }) {
  const tint = (brand.docTint as Record<string, string>)[type] ?? brand.colors.muted
  const h = Math.round(size * 1.21)
  return (
    <div style={{
      width: size, height: h, borderRadius: 5, flexShrink: 0, position: 'relative', overflow: 'hidden',
      background: `repeating-linear-gradient(135deg, ${tint}14, ${tint}14 5px, ${tint}07 5px, ${tint}07 10px)`,
      border: `1px solid ${tint}33`,
    }}>
      <div style={{ position: 'absolute', top: 6, left: 6, right: 6, height: 2, background: `${tint}55`, borderRadius: 2 }} />
      <div style={{ position: 'absolute', top: 11, left: 6, width: 16, height: 2, background: `${tint}40`, borderRadius: 2 }} />
      <Icon name="doc" size={13} color={tint} style={{ position: 'absolute', bottom: 5, right: 5, opacity: 0.8 }} />
    </div>
  )
}

// ─── Watch product shot (drop-shadowed, no tile) ─────────────────────────
export function WatchShot({
  watch, size, shadow = '0 8px 16px rgba(26,20,16,0.22)',
}: { watch: ResolvedOwnedWatch; size: number; shadow?: string }) {
  return (
    <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <WatchImageOrDial
        watch={watch}
        width={size}
        height={size}
        dialSize={Math.round(size * 0.82)}
        imageStyle={{ width: '100%', height: '100%', objectFit: 'contain', filter: `drop-shadow(${shadow})` }}
      />
    </div>
  )
}

// ─── Watch shot on a cream tile (drawer/modal hero) ──────────────────────
export function WatchTile({
  watch, size = 64, radius = brand.radius.md, pad = 0.12,
}: { watch: ResolvedOwnedWatch; size?: number; radius?: number; pad?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: radius, background: brand.colors.bg,
      border: `1px solid ${brand.colors.border}`, display: 'flex', alignItems: 'center',
      justifyContent: 'center', flexShrink: 0, overflow: 'hidden', padding: size * pad,
    }}>
      <WatchImageOrDial
        watch={watch}
        width={Math.round(size * (1 - pad * 2))}
        height={Math.round(size * (1 - pad * 2))}
        dialSize={Math.round(size * (1 - pad * 2) * 0.9)}
        imageStyle={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 3px 6px rgba(26,20,16,0.14))' }}
      />
    </div>
  )
}

// ─── Affiliate booking URL (Find a center ↗) ─────────────────────────────
export function bookingUrl(brandName: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(brandName + ' authorized service center near me')}`
}

// ─── Shared button styles ────────────────────────────────────────────────
export const btnPrimary: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: sans, fontSize: 11,
  fontWeight: 500, letterSpacing: '0.06em', padding: '9px 16px', background: brand.colors.ink,
  color: brand.colors.slot, border: 'none', borderRadius: brand.radius.btn, cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap',
}
export const btnSecondary: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: sans, fontSize: 11,
  fontWeight: 500, letterSpacing: '0.06em', padding: '8px 15px', background: 'transparent',
  color: brand.colors.ink, border: `1px solid ${brand.colors.borderLight}`, borderRadius: brand.radius.btn, cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap',
}
export const iconBtn: CSSProperties = {
  width: 28, height: 28, borderRadius: brand.radius.sm, border: `1px solid ${brand.colors.border}`, background: brand.colors.white,
  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, padding: 0,
}
export const emptyNote: CSSProperties = {
  fontFamily: serif, fontSize: 17, color: brand.colors.muted, fontStyle: 'italic',
  padding: '24px 0', textAlign: 'center',
}

export { docTypeMeta }
