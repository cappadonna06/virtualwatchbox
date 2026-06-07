'use client'

// components/serviceRoom/onboarding/onboardingShared.tsx
// Shared onboarding building blocks. The empty-state vocabulary (card chrome,
// gold eyebrow, serif-italic headline, benefit rows, ink CTA + gold link) is
// matched token-for-token to components/collection/CollectionEmptyState.tsx and
// PlaygroundEmptyState.tsx so the Service Room reads as the same family.

import type { CSSProperties, ReactNode } from 'react'
import { brand } from '@/lib/brand'
import type { ServiceIntervalYears } from '@/types/watch'
import { Icon, type IconName } from '@/components/serviceRoom/primitives'

const sans = brand.font.sans
const serif = brand.font.serif

const INTERVALS: ServiceIntervalYears[] = [3, 5, 7, 10]

// ── Gold eyebrow (empty-state convention: 0.14em, goldDeep) ──────────────
export function Eyebrow({ children, isMobile, style }: { children: ReactNode; isMobile?: boolean; style?: CSSProperties }) {
  return (
    <div style={{
      fontFamily: sans, fontSize: isMobile ? brand.text.labelSm : brand.text.label, fontWeight: 600,
      letterSpacing: '0.14em', textTransform: 'uppercase', color: brand.colors.goldDeep, ...style,
    }}>{children}</div>
  )
}

// ── Serif headline with one italic word ──────────────────────────────────
// Match the shipped empty states: serif, weight 400, lineHeight 1.08, the
// emphasised word wrapped in <em>. `lead` / `tail` straddle the italic word;
// pass a hard line break before the italic via `breakBefore`.
export function Headline({
  lead, em, tail, size, isMobile, style,
}: { lead?: string; em: string; tail?: string; size?: number; isMobile?: boolean; style?: CSSProperties }) {
  return (
    <h2 style={{
      fontFamily: serif, fontSize: size ?? (isMobile ? 29 : 34), fontWeight: 400,
      lineHeight: 1.08, color: brand.colors.ink, margin: 0, ...style,
    }}>
      {lead}<em style={{ fontStyle: 'italic' }}>{em}</em>{tail}
    </h2>
  )
}

// ── Benefit row (paperWarm icon square + title + muted one-liner) ─────────
export function BenefitRow({ icon, title, desc, isMobile }: { icon: IconName; title: string; desc: string; isMobile: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
      <span style={{
        flexShrink: 0, width: isMobile ? 32 : 38, height: isMobile ? 32 : 38, borderRadius: 9,
        background: brand.colors.paperWarm, color: brand.colors.goldDeep, display: 'grid', placeItems: 'center',
      }}>
        <Icon name={icon} size={18} color={brand.colors.goldDeep} />
      </span>
      <div>
        <div style={{ fontFamily: sans, fontSize: isMobile ? 13.5 : brand.text.body, fontWeight: 600, color: brand.colors.ink }}>{title}</div>
        <div style={{ marginTop: 2, fontFamily: sans, fontSize: isMobile ? brand.text.label : brand.text.bodySm, color: brand.colors.muted, lineHeight: 1.5 }}>{desc}</div>
      </div>
    </div>
  )
}

// ── Checklist item (ok-circle + label) — Screen 2 offer panel ────────────
export function ChecklistItem({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
      <span style={{
        flexShrink: 0, width: 24, height: 24, borderRadius: brand.radius.circle,
        background: brand.serviceStatus.ok.bg, color: brand.serviceStatus.ok.fg, display: 'grid', placeItems: 'center',
      }}>
        <Icon name="check" size={13} color={brand.serviceStatus.ok.fg} />
      </span>
      <span style={{ fontFamily: sans, fontSize: 14.5, color: brand.colors.ink }}>{label}</span>
    </div>
  )
}

// ── Empty-state CTA button (ink, radius 5) ───────────────────────────────
export const ctaPrimary: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  fontFamily: sans, fontSize: brand.text.label, fontWeight: 600, letterSpacing: '0.08em',
  padding: '15px 30px', background: brand.colors.ink, color: brand.colors.bg,
  border: 'none', borderRadius: 5, cursor: 'pointer', textDecoration: 'none',
}

// ── Gold uppercase text link with trailing arrow ─────────────────────────
export const goldLink: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  fontFamily: sans, fontSize: brand.text.label, fontWeight: 600, letterSpacing: '0.08em',
  textTransform: 'uppercase', color: brand.colors.goldDeep, background: 'transparent',
  border: 'none', cursor: 'pointer', textDecoration: 'none', padding: 0,
}

// ── Privacy line (lock + muted copy) ─────────────────────────────────────
export function PrivacyLine({ style }: { style?: CSSProperties }) {
  return (
    <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontFamily: sans, fontSize: brand.text.bodySm, color: brand.colors.muted, margin: 0, ...style }}>
      <Icon name="lock" size={13} color={brand.colors.muted} />Your records stay private to you.
    </p>
  )
}

// ── Estimate badge (dashed amber) ────────────────────────────────────────
export function EstimateBadge({ style }: { style?: CSSProperties }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: sans, fontSize: 11.5, fontWeight: 600,
      letterSpacing: '0.02em', padding: '3px 9px', borderRadius: brand.radius.pill,
      background: brand.colors.paperWarm, color: brand.serviceStatus.due.fg,
      border: `1px dashed ${brand.serviceStatus.due.dot}`, whiteSpace: 'nowrap', ...style,
    }}>
      <Icon name="spark" size={10} color={brand.serviceStatus.due.fg} />Estimate
    </span>
  )
}

// ── Segmented interval toggle (3y / 5y / 7y / 10y) ───────────────────────
export function IntervalToggle({
  value, onChange, size = 'md',
}: { value: ServiceIntervalYears; onChange: (y: ServiceIntervalYears) => void; size?: 'sm' | 'md' }) {
  const small = size === 'sm'
  return (
    <div style={{ display: 'inline-flex', background: brand.colors.white, border: `1px solid ${brand.colors.border}`, borderRadius: brand.radius.md, padding: 3, gap: 2 }}>
      {INTERVALS.map(y => {
        const active = value === y
        return (
          <button key={y} type="button" onClick={() => onChange(y)} style={{
            fontFamily: sans, fontSize: small ? 12 : 13, fontWeight: 600, letterSpacing: '0.02em',
            padding: small ? '5px 10px' : '7px 13px', borderRadius: brand.radius.sm, border: 'none', cursor: 'pointer',
            background: active ? brand.colors.ink : 'transparent', color: active ? brand.colors.slot : brand.colors.muted,
            transition: `all ${brand.transition.fast}`,
          }}>{y}y</button>
        )
      })}
    </div>
  )
}

// Surface for one-off cream strips with no exact token (between bg & slot).
export const STRIP_BG = '#FCFAF6'
