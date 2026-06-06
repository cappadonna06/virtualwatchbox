'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { brand } from '@/lib/brand'
import type { StrapWatchOverride, UserStrap } from '@/types/watch'
import { effectiveCompatibility, findOverride } from '@/lib/strapCompatibility'
import { materialLabel } from '@/lib/strapDrawer/constants'
import { findTemplatePhoto } from '@/lib/strapTemplates'
import { StrapPhotoFallback } from './StrapPhotoFallback'
import {
  GhostBtn,
  Kicker,
  StrapIcon,
  WatchThumb,
  hostOf,
  money,
  strapTitle,
  type StrapDrawerWatch,
} from './atoms'

function reasonFor(strap: UserStrap, watch: StrapDrawerWatch, overrides: StrapWatchOverride[]): string {
  const ov = findOverride(overrides, strap.id, watch.id)
  if (ov) return ov.override === 'fits' ? 'Marked as fits' : 'Marked excluded'
  if (watch.braceletType === 'integrated') return 'Integrated bracelet'
  if (strap.lugWidthMm == null || watch.lugWidthMm == null) return 'Width unknown'
  if (strap.lugWidthMm === watch.lugWidthMm) return 'Lug width matches'
  return `Lug mismatch · needs ${watch.lugWidthMm} mm`
}

function WatchRow({ strap, watch, overrides, state, onSetOverride, onRemoveOverride, onOpenWatch }: {
  strap: UserStrap
  watch: StrapDrawerWatch
  overrides: StrapWatchOverride[]
  state: 'fits' | 'excluded' | 'unknown'
  onSetOverride: (watchId: string, override: 'fits' | 'excluded') => void
  onRemoveOverride: (watchId: string) => void
  onOpenWatch?: (watch: StrapDrawerWatch) => void
}) {
  const ov = findOverride(overrides, strap.id, watch.id)
  const reason = reasonFor(strap, watch, overrides)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '12px 0', borderBottom: `1px solid ${brand.colors.border}` }}>
      <WatchThumb watch={watch} size={56} />
      <div onClick={() => onOpenWatch?.(watch)} style={{ flex: 1, minWidth: 0, cursor: onOpenWatch ? 'pointer' : 'default' }}>
        <div style={{ fontFamily: brand.font.sans, fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: brand.colors.goldDeep, marginBottom: 2 }}>{watch.brand}</div>
        <div style={{ fontFamily: brand.font.serif, fontSize: 16, color: brand.colors.ink, lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{watch.model}</div>
        <div style={{ fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.muted, marginTop: 2, letterSpacing: '0.02em' }}>
          {watch.braceletType === 'integrated' ? `${watch.caseSizeMm} mm · integrated` : `${watch.lugWidthMm} mm lugs · ${reason}`}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <div style={{ display: 'inline-flex', background: brand.colors.bg, border: `1px solid ${brand.colors.borderMid}`, borderRadius: brand.radius.sm, padding: 2 }}>
          {([['fits', 'Fits'], ['excluded', 'Exclude']] as const).map(([val, lbl]) => {
            const on = state === val
            return (
              <button key={val} onClick={() => onSetOverride(watch.id, val)} style={{
                fontFamily: brand.font.sans, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
                textTransform: 'uppercase', padding: '5px 8px', borderRadius: brand.radius.btn, border: 'none', cursor: 'pointer',
                background: on ? (val === 'fits' ? brand.fit.fits.dot : brand.colors.dark) : 'transparent',
                color: on ? brand.colors.white : brand.colors.muted, transition: 'background 0.12s, color 0.12s',
              }}>{lbl}</button>
            )
          })}
        </div>
        {ov && (
          <button title="Reset to automatic" onClick={() => onRemoveOverride(watch.id)} style={{
            width: 22, height: 22, borderRadius: '50%', border: `1px solid ${brand.colors.borderMid}`,
            background: brand.colors.slot, color: brand.colors.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}><StrapIcon name="close" size={11} /></button>
        )}
      </div>
    </div>
  )
}

function SpecLine({ label, value }: { label: string; value: ReactNode }) {
  if (value == null || value === '') return null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '8px 0', borderBottom: `1px solid ${brand.colors.border}`, gap: 16 }}>
      <span style={{ fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.muted }}>{label}</span>
      <span style={{ fontFamily: brand.font.sans, fontSize: 12, fontWeight: 500, color: brand.colors.ink, textAlign: 'right' }}>{value}</span>
    </div>
  )
}

function SidebarContent({ strap, watches, overrides, onClose, onSetOverride, onRemoveOverride, onEdit, onDelete, onOpenWatch }: StrapSidebarProps) {
  const [showOther, setShowOther] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  const fits = watches.filter(w => effectiveCompatibility(strap, w, overrides) === 'fits')
  const others = watches.filter(w => effectiveCompatibility(strap, w, overrides) !== 'fits')
  const title = strapTitle(strap)
  const photo = strap.photoUrl ?? findTemplatePhoto(strap.material, strap.subMaterial, strap.color)
  const price = money(strap.purchasePrice)

  return (
    <div className="sd-sheet-scroll" style={{ height: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 3, background: brand.colors.slot, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 22px', borderBottom: `1px solid ${brand.colors.border}` }}>
        <Kicker color={brand.colors.muted}>Strap detail</Kicker>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: brand.colors.muted, padding: 4, display: 'flex' }}><StrapIcon name="close" size={18} /></button>
      </div>

      <div style={{ padding: '0 22px 24px' }}>
        <div style={{ margin: '18px -22px 0', borderBottom: `1px solid ${brand.colors.border}` }}>
          {photo
            ? (
              <div style={{ background: `radial-gradient(ellipse 120% 80% at 50% 30%, #FFFFFF 0%, #FBF8F2 72%, ${brand.colors.paper} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 280 }}>
                <img src={photo} alt={title} style={{ height: '100%', objectFit: 'contain', padding: '20px 0' }} />
              </div>
            )
            : <StrapPhotoFallback height={260} />}
        </div>

        <div style={{ padding: '20px 0 8px' }}>
          {strap.brand && <Kicker color={brand.colors.goldDeep} style={{ marginBottom: 6 }}>{strap.brand}</Kicker>}
          <h2 style={{ fontFamily: brand.font.serif, fontSize: 28, fontWeight: 400, color: brand.colors.ink, lineHeight: 1.08, margin: '0 0 4px' }}>{title}</h2>
          <div style={{ fontFamily: brand.font.sans, fontSize: 14, color: brand.colors.muted }}>
            {strap.color}{strap.subMaterial ? ` · ${strap.subMaterial} ${materialLabel(strap.material).toLowerCase()}` : ` ${materialLabel(strap.material).toLowerCase()}`}
          </div>
          {strap.notes && (
            <div style={{ fontFamily: brand.font.serif, fontStyle: 'italic', fontSize: 14.5, color: brand.colors.inkSoft, lineHeight: 1.5, marginTop: 14, paddingLeft: 12, borderLeft: `2px solid ${brand.colors.gold}` }}>{strap.notes}</div>
          )}
        </div>

        <div style={{ marginTop: 8 }}>
          <SpecLine label="Material" value={strap.subMaterial ? `${materialLabel(strap.material)} · ${strap.subMaterial}` : materialLabel(strap.material)} />
          <SpecLine label="Color" value={strap.color} />
          <SpecLine label="Lug width" value={`${strap.lugWidthMm} mm`} />
          <SpecLine label="Tapered to" value={strap.taperedToMm ? `${strap.taperedToMm} mm` : null} />
          <SpecLine label="Length" value={strap.lengthMm ? `${strap.lengthMm} mm` : null} />
          <SpecLine label="Clasp" value={strap.claspType} />
          <SpecLine label="Style" value={strap.style ? strap.style.charAt(0).toUpperCase() + strap.style.slice(1) : null} />
        </div>

        {price != null && (
          <div style={{ marginTop: 18, background: brand.colors.bg, border: `1px solid ${brand.colors.border}`, borderRadius: brand.radius.lg, padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Kicker color={brand.colors.muted} style={{ marginBottom: 4 }}>{strap.purchaseUrl ? `Bought from ${hostOf(strap.purchaseUrl)}` : 'Paid'}</Kicker>
                <div style={{ fontFamily: brand.font.sans, fontSize: 18, fontWeight: 600, color: brand.colors.goldDeep }}>{price}</div>
              </div>
              {strap.purchaseUrl && (
                <a href={strap.purchaseUrl} target="_blank" rel="noopener noreferrer" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: brand.font.sans, fontSize: 12,
                  fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: brand.colors.ink,
                  textDecoration: 'none', border: `1px solid ${brand.colors.borderLight}`, borderRadius: brand.radius.btn, padding: '8px 12px',
                }}>Buy another <StrapIcon name="arrowUpRight" size={12} /></a>
              )}
            </div>
          </div>
        )}

        <div style={{ marginTop: 26 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
            <h3 style={{ fontFamily: brand.font.serif, fontSize: 19, fontWeight: 500, color: brand.colors.ink, margin: 0 }}>Fits these watches</h3>
            <span style={{ fontFamily: brand.font.sans, fontSize: 11, fontWeight: 600, color: brand.colors.goldDeep }}>{fits.length}</span>
          </div>
          {fits.length === 0
            ? <div style={{ fontFamily: brand.font.serif, fontStyle: 'italic', fontSize: 14, color: brand.colors.muted, padding: '8px 0 4px' }}>None of your current watches match this strap.</div>
            : fits.map(w => (
              <WatchRow key={w.id} strap={strap} watch={w} overrides={overrides} state={effectiveCompatibility(strap, w, overrides)} onSetOverride={onSetOverride} onRemoveOverride={onRemoveOverride} onOpenWatch={onOpenWatch} />
            ))}
        </div>

        {others.length > 0 && (
          <div style={{ marginTop: 22 }}>
            <button onClick={() => setShowOther(o => !o)} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
              background: 'none', border: 'none', padding: '6px 0', cursor: 'pointer', borderTop: `1px solid ${brand.colors.border}`,
            }}>
              <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontFamily: brand.font.serif, fontSize: 18, fontWeight: 500, color: brand.colors.inkSoft }}>Other watches</span>
                <span style={{ fontFamily: brand.font.sans, fontSize: 11, color: brand.colors.muted }}>{others.length}</span>
              </span>
              <span style={{ color: brand.colors.muted, display: 'flex', transform: showOther ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}><StrapIcon name="chevDown" size={15} /></span>
            </button>
            {showOther && (
              <div style={{ marginTop: 2 }}>
                <p style={{ fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.muted, lineHeight: 1.5, margin: '2px 0 8px' }}>Override the automatic call when you know better.</p>
                {others.map(w => (
                  <WatchRow key={w.id} strap={strap} watch={w} overrides={overrides} state={effectiveCompatibility(strap, w, overrides)} onSetOverride={onSetOverride} onRemoveOverride={onRemoveOverride} onOpenWatch={onOpenWatch} />
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 26 }}>
          <GhostBtn full onClick={() => onEdit(strap)}><StrapIcon name="edit" size={14} /> Edit</GhostBtn>
          <button onClick={() => setConfirmDel(true)} style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, width: 52,
            fontFamily: brand.font.sans, fontSize: 11, fontWeight: 500, background: 'transparent', color: brand.fit.destructive,
            border: `1px solid ${brand.colors.borderLight}`, borderRadius: brand.radius.btn, cursor: 'pointer',
          }}><StrapIcon name="trash" size={15} /></button>
        </div>
      </div>

      {confirmDel && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(26,20,16,0.45)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: brand.colors.slot, borderRadius: brand.radius.xl, padding: 24, maxWidth: 300, textAlign: 'center', boxShadow: '0 12px 40px rgba(26,20,16,0.3)' }}>
            <h3 style={{ fontFamily: brand.font.serif, fontSize: 21, fontWeight: 400, color: brand.colors.ink, margin: '0 0 8px' }}>Delete this strap?</h3>
            <p style={{ fontFamily: brand.font.sans, fontSize: 14, color: brand.colors.mutedDark, lineHeight: 1.5, margin: '0 0 18px' }}>This removes the strap and any fit overrides you set for it.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <GhostBtn full onClick={() => setConfirmDel(false)}>Cancel</GhostBtn>
              <button onClick={() => { setConfirmDel(false); onDelete(strap) }} style={{
                flex: 1, fontFamily: brand.font.sans, fontSize: 11, fontWeight: 500, letterSpacing: '0.1em',
                textTransform: 'uppercase', background: brand.fit.destructive, color: brand.colors.white, border: 'none',
                borderRadius: brand.radius.btn, cursor: 'pointer', padding: '10px',
              }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export interface StrapSidebarProps {
  strap: UserStrap
  watches: StrapDrawerWatch[]
  overrides: StrapWatchOverride[]
  onClose: () => void
  onSetOverride: (watchId: string, override: 'fits' | 'excluded') => void
  onRemoveOverride: (watchId: string) => void
  onEdit: (strap: UserStrap) => void
  onDelete: (strap: UserStrap) => void
  onOpenWatch?: (watch: StrapDrawerWatch) => void
}

export function StrapSidebar(props: StrapSidebarProps) {
  useEffect(() => {
    document.documentElement.classList.add('sheet-lock')
    return () => document.documentElement.classList.remove('sheet-lock')
  }, [])

  return (
    <>
      <div className="sd-sheet-scrim" onClick={props.onClose} />
      <div className="sd-sheet-panel" role="dialog" aria-modal="true">
        <div className="sd-sheet-grab"><div style={{ width: 38, height: 4, borderRadius: 2, background: brand.colors.borderLight }} /></div>
        <SidebarContent {...props} />
      </div>
    </>
  )
}
