'use client'

import { useState } from 'react'
import { brand } from '@/lib/brand'
import type { StrapWatchOverride, UserStrap } from '@/types/watch'
import {
  compatibleWatches,
  effectiveCompatibility,
  fitBasis,
} from '@/lib/strapCompatibility'
import { deriveSwatchId, materialLabel } from '@/lib/strapDrawer/constants'
import { StrapSwatch } from './StrapSwatch'
import { Kicker, SpecBadge, StrapIcon, PrimaryBtn, strapTitle, type StrapDrawerWatch } from './atoms'

function swatchIdFor(strap: UserStrap): string {
  return deriveSwatchId(strap.material, strap.subMaterial, strap.color)
}

export function StrapCard({
  strap,
  watches,
  overrides,
  focusWatch,
  active,
  onClick,
}: {
  strap: UserStrap
  watches: StrapDrawerWatch[]
  overrides: StrapWatchOverride[]
  focusWatch: StrapDrawerWatch | null
  active: boolean
  onClick: () => void
}) {
  const [hover, setHover] = useState(false)
  const fitCount = compatibleWatches(strap, watches, overrides).length
  const title = strapTitle(strap)
  const focusState = focusWatch ? effectiveCompatibility(strap, focusWatch, overrides) : null

  return (
    <article
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: brand.colors.slot,
        border: active ? '1.5px solid rgba(201,168,76,0.85)' : `1px solid ${brand.colors.borderMid}`,
        borderRadius: brand.radius.lg, overflow: 'hidden', cursor: 'pointer',
        boxShadow: active
          ? '0 0 0 1px rgba(201,168,76,0.4), 0 8px 28px rgba(201,168,76,0.14)'
          : hover ? '0 8px 24px rgba(26,20,16,0.10)' : brand.shadow.xs,
        transform: hover && !active ? 'translateY(-3px)' : active ? 'translateY(-2px)' : 'none',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease',
        display: 'flex', flexDirection: 'column',
      }}
    >
      <div style={{ position: 'relative', aspectRatio: '4 / 5', borderBottom: `1px solid ${brand.colors.borderMid}`, overflow: 'hidden' }}>
        {strap.photoUrl
          ? (
            <div style={{
              width: '100%', height: '100%',
              background: `radial-gradient(ellipse 120% 80% at 50% 30%, #FFFFFF 0%, #FBF8F2 72%, ${brand.colors.paper} 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <img src={strap.photoUrl} alt={title} style={{
                width: '100%', height: '100%', objectFit: 'contain', padding: '14px 6px',
                transform: hover ? 'scale(1.035)' : 'scale(1)', transition: 'transform 0.3s ease',
              }} />
            </div>
          )
          : <StrapSwatch swatchId={swatchIdFor(strap)} material={strap.material} height="100%" />}
        <div style={{
          position: 'absolute', top: 10, right: 10,
          fontFamily: brand.font.sans, fontSize: 8, fontWeight: 600, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: strap.photoUrl ? brand.colors.muted : brand.colors.borderLight,
          background: 'rgba(255,252,247,0.82)', padding: '2px 6px', borderRadius: 3, backdropFilter: 'blur(2px)',
        }}>
          {strap.photoUrl ? 'Photo' : 'Swatch'}
        </div>
      </div>

      <div style={{ padding: '14px 16px 15px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {strap.brand && <Kicker color={brand.colors.gold} style={{ marginBottom: 5 }}>{strap.brand}</Kicker>}
        <h3 style={{ fontFamily: brand.font.serif, fontSize: 19, fontWeight: 400, lineHeight: 1.12, color: brand.colors.ink, margin: '0 0 3px' }}>{title}</h3>
        <div style={{ fontFamily: brand.font.sans, fontSize: 11, color: brand.colors.muted, letterSpacing: '0.02em', marginBottom: 12 }}>
          {strap.color}{strap.subMaterial ? ` · ${strap.subMaterial}` : ''}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 13 }}>
          <SpecBadge tone="width">{strap.lugWidthMm} mm</SpecBadge>
          <SpecBadge>{materialLabel(strap.material)}</SpecBadge>
          {strap.style && <SpecBadge>{strap.style.charAt(0).toUpperCase() + strap.style.slice(1)}</SpecBadge>}
        </div>

        <div style={{ marginTop: 'auto', paddingTop: 11, borderTop: `1px solid ${brand.colors.border}`, display: 'flex', alignItems: 'center', gap: 7 }}>
          {focusWatch && focusState ? (
            <>
              <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: focusState === 'fits' ? brand.fit.fits.dot : focusState === 'unknown' ? brand.colors.gold : brand.colors.borderLight }} />
              <span style={{ fontFamily: brand.font.sans, fontSize: 11, fontWeight: 500, color: focusState === 'fits' ? brand.colors.inkSoft : brand.colors.muted, letterSpacing: '0.02em' }}>
                {fitBasis(strap, focusWatch, overrides)}
              </span>
            </>
          ) : (
            <>
              <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: fitCount > 0 ? brand.colors.gold : brand.colors.borderLight }} />
              <span style={{ fontFamily: brand.font.sans, fontSize: 11, fontWeight: fitCount > 0 ? 500 : 400, color: fitCount > 0 ? brand.colors.inkSoft : brand.colors.muted, letterSpacing: '0.02em' }}>
                {fitCount > 0 ? `Fits ${fitCount} of your watches` : 'No matching watches yet'}
              </span>
            </>
          )}
        </div>
      </div>
    </article>
  )
}

export function StrapGrid({
  straps,
  watches,
  overrides,
  focusWatch,
  activeId,
  onSelect,
}: {
  straps: UserStrap[]
  watches: StrapDrawerWatch[]
  overrides: StrapWatchOverride[]
  focusWatch: StrapDrawerWatch | null
  activeId: string | null
  onSelect: (strap: UserStrap) => void
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 18 }}>
      {straps.map(s => (
        <StrapCard key={s.id} strap={s} watches={watches} overrides={overrides} focusWatch={focusWatch} active={activeId === s.id} onClick={() => onSelect(s)} />
      ))}
    </div>
  )
}

export function EmptyDrawer({ onAdd }: { onAdd: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{
        maxWidth: 460, width: '100%', textAlign: 'center',
        background: brand.colors.slot, border: `1px solid ${brand.colors.borderMid}`, borderRadius: brand.radius.xl,
        padding: '52px 40px', boxShadow: brand.shadow.xs,
      }}>
        <div style={{
          width: 56, height: 56, margin: '0 auto 22px', borderRadius: '50%',
          background: brand.colors.bg, border: `1px solid ${brand.colors.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ width: 9, height: 30, borderRadius: 3, background: brand.colors.borderLight, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4)' }} />
        </div>
        <h2 style={{ fontFamily: brand.font.serif, fontSize: 28, fontWeight: 400, color: brand.colors.ink, margin: '0 0 12px' }}>Your strap drawer is empty</h2>
        <p style={{ fontFamily: brand.font.sans, fontSize: 13, lineHeight: 1.65, color: brand.colors.mutedDark, margin: '0 auto 26px', maxWidth: 340 }}>
          Track the leathers, rubbers, NATOs and bracelets you swap between. We&rsquo;ll tell you which watches each one fits.
        </p>
        <PrimaryBtn onClick={onAdd}>
          <StrapIcon name="plus" size={14} /> Add your first strap
        </PrimaryBtn>
      </div>
    </div>
  )
}
