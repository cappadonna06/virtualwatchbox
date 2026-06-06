'use client'

import { useMemo, useRef, useState, type ReactNode } from 'react'
import { brand } from '@/lib/brand'
import type { StrapStyle, UserStrap } from '@/types/watch'
import { watchesAtWidth } from '@/lib/strapCompatibility'
import {
  COMMON_COLORS,
  COMMON_WIDTHS,
  MATERIALS,
  materialLabel,
  STYLES,
  SUB_MATERIALS,
} from '@/lib/strapDrawer/constants'
import { StrapPhotoFallback } from './StrapPhotoFallback'
import { GhostBtn, Kicker, PrimaryBtn, SpecBadge, StrapIcon, type StrapDrawerWatch } from './atoms'
import type { StrapInput } from '@/app/collection/CollectionSessionProvider'
import { findTemplatePhoto, getTemplatesByMaterial, type StrapTemplate } from '@/lib/strapTemplates'

const inputStyle: React.CSSProperties = {
  width: '100%', fontFamily: brand.font.sans, fontSize: 16, color: brand.colors.ink, background: brand.colors.slot,
  border: `1px solid ${brand.colors.borderMid}`, borderRadius: brand.radius.sm, padding: '9px 11px', outline: 'none',
}

function PillRow<T extends string | number>({ options, value, onChange, counts }: {
  options: Array<[T, string]>
  value: T | T[] | null | undefined
  onChange: (v: T) => void
  counts?: Record<string, number>
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
      {options.map(([val, lbl]) => {
        const on = Array.isArray(value) ? value.includes(val) : value === val
        return (
          <button key={String(val)} type="button" onClick={() => onChange(val)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontFamily: brand.font.sans, fontSize: 14, fontWeight: on ? 600 : 500, letterSpacing: '0.02em',
            padding: '8px 13px', borderRadius: 7, cursor: 'pointer',
            background: on ? brand.colors.ink : brand.colors.slot, color: on ? brand.colors.slot : brand.colors.inkSoft,
            border: `1px solid ${on ? brand.colors.ink : brand.colors.borderMid}`, transition: 'all 0.13s',
          }}>
            {lbl}
            {counts && counts[String(val)] != null && (
              <span style={{ fontSize: 11, fontWeight: 600, color: on ? 'rgba(255,255,255,0.7)' : (counts[String(val)] > 0 ? brand.colors.goldDeep : brand.colors.muted) }}>({counts[String(val)]})</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontFamily: brand.font.sans, fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: brand.colors.muted, marginBottom: 8 }}>
        {label}
        {hint && <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400, color: brand.colors.borderLight, marginLeft: 6 }}>{hint}</span>}
      </div>
      {children}
    </div>
  )
}

type FormState = {
  material: string
  subMaterial: string
  color: string
  colorHex: string
  lugWidthMm: number | null
  name: string
  brand: string
  style: StrapStyle | null
  taperedToMm: string
  lengthMm: string
  claspType: string
  priceDollars: string
  purchaseUrl: string
  notes: string
}

function initialForm(initial: UserStrap | null, suggestLug: number | null): FormState {
  if (initial) {
    return {
      material: initial.material,
      subMaterial: initial.subMaterial ?? (SUB_MATERIALS[initial.material]?.[0] ?? ''),
      color: initial.color,
      colorHex: initial.colorHex ?? '#6A4426',
      lugWidthMm: initial.lugWidthMm,
      name: initial.name ?? '',
      brand: initial.brand ?? '',
      style: initial.style ?? null,
      taperedToMm: initial.taperedToMm != null ? String(initial.taperedToMm) : '',
      lengthMm: initial.lengthMm != null ? String(initial.lengthMm) : '',
      claspType: initial.claspType ?? '',
      priceDollars: initial.purchasePrice != null ? String(Math.round(initial.purchasePrice / 100)) : '',
      purchaseUrl: initial.purchaseUrl ?? '',
      notes: initial.notes ?? '',
    }
  }
  return {
    material: 'leather', subMaterial: 'Smooth', color: '', colorHex: '#6A4426',
    lugWidthMm: suggestLug, name: '', brand: '', style: null, taperedToMm: '', lengthMm: '',
    claspType: '', priceDollars: '', purchaseUrl: '', notes: '',
  }
}

export function StrapModal({
  initial,
  watches,
  suggestLug,
  onSave,
  onClose,
}: {
  initial: UserStrap | null
  watches: StrapDrawerWatch[]
  suggestLug?: number | null
  onSave: (data: StrapInput, photoFile: File | null) => void | Promise<void>
  onClose: () => void
}) {
  const editing = !!initial
  const [f, setF] = useState<FormState>(() => initialForm(initial, suggestLug ?? null))
  const [showDetails, setShowDetails] = useState(editing)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(initial?.photoUrl ?? null)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const set = (patch: Partial<FormState>) => setF(prev => ({ ...prev, ...patch }))

  // Quick-pick template selection (new straps only): stages a hosted template image URL that
  // flows straight through createStrap (no file upload). Cleared if the user changes material.
  const templateGroups = useMemo(() => getTemplatesByMaterial(), [])
  const [templateId, setTemplateId] = useState<string | null>(null)
  const [templatePhotoUrl, setTemplatePhotoUrl] = useState<string | null>(null)
  const [tplTab, setTplTab] = useState<string>(templateGroups[0]?.material ?? 'leather')

  const clearTemplate = () => {
    setTemplateId(null)
    setTemplatePhotoUrl(null)
    if (!photoFile) setPhotoPreview(initial?.photoUrl ?? null)
  }
  const pickTemplate = (t: StrapTemplate) => {
    setF(prev => ({ ...prev, material: t.material, subMaterial: t.subMaterial, color: t.color, colorHex: t.colorHex, style: (t.style as StrapStyle) ?? prev.style }))
    setTemplateId(t.id)
    setTemplatePhotoUrl(t.imageUrl || null)
    if (t.imageUrl) { setPhotoFile(null); setPhotoPreview(t.imageUrl) }
  }

  const widthCounts = useMemo(() => {
    const m: Record<string, number> = {}
    COMMON_WIDTHS.forEach(w => { m[String(w)] = watchesAtWidth(watches, w) })
    return m
  }, [watches])

  const subs = SUB_MATERIALS[f.material as keyof typeof SUB_MATERIALS] ?? []
  const previewPhoto = photoPreview ?? findTemplatePhoto(f.material, f.subMaterial, f.color)
  const canSave = !!f.material && !!f.color.trim() && !!f.lugWidthMm && !saving
  const previewTitle = f.name.trim() || (f.color ? `${f.color} ${materialLabel(f.material)}` : `New ${materialLabel(f.material)} strap`)

  const pickFile = (file: File | null) => {
    setPhotoFile(file)
    setPhotoPreview(file ? URL.createObjectURL(file) : (initial?.photoUrl ?? null))
  }

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    const data: StrapInput = {
      material: f.material as UserStrap['material'],
      subMaterial: f.subMaterial || undefined,
      color: f.color.trim(),
      colorHex: f.colorHex,
      photoUrl: templatePhotoUrl ?? undefined,
      lugWidthMm: f.lugWidthMm!,
      name: f.name.trim() || undefined,
      brand: f.brand.trim() || undefined,
      style: f.style ?? undefined,
      taperedToMm: f.taperedToMm ? parseInt(f.taperedToMm, 10) : undefined,
      lengthMm: f.lengthMm ? parseInt(f.lengthMm, 10) : undefined,
      claspType: f.claspType.trim() || undefined,
      purchasePrice: f.priceDollars ? Math.round(parseFloat(f.priceDollars) * 100) : undefined,
      purchaseUrl: f.purchaseUrl.trim() || undefined,
      notes: f.notes.trim() || undefined,
    }
    try {
      await onSave(data, photoFile)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="sd-modal-scrim" onClick={onClose}>
      <div className="sd-modal-card" onClick={e => e.stopPropagation()} style={{
        background: brand.colors.slot, borderRadius: brand.radius.xl, width: 'min(880px, 100%)', maxHeight: '92vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 70px rgba(26,20,16,0.34)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: `1px solid ${brand.colors.border}`, flexShrink: 0 }}>
          <div>
            <Kicker color={brand.colors.goldDeep} style={{ marginBottom: 4 }}>{editing ? 'Edit strap' : 'Add strap'}</Kicker>
            <h2 style={{ fontFamily: brand.font.serif, fontSize: 23, fontWeight: 400, color: brand.colors.ink, margin: 0, whiteSpace: 'nowrap' }}>{editing ? 'Update the details' : 'New strap'}</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: brand.colors.muted, padding: 4, display: 'flex' }}><StrapIcon name="close" size={19} /></button>
        </div>

        <div className="sd-modal-body" style={{ display: 'flex', minHeight: 0, flex: 1 }}>
          <div className="sd-modal-preview" style={{ width: 270, flexShrink: 0, borderRight: `1px solid ${brand.colors.border}`, padding: 22, display: 'flex', flexDirection: 'column', background: brand.colors.bg }}>
            <div style={{ borderRadius: brand.radius.lg, overflow: 'hidden', border: `1px solid ${brand.colors.borderMid}` }}>
              {previewPhoto
                ? <div style={{ height: 230, background: brand.colors.white, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><img src={previewPhoto} alt="preview" style={{ height: '100%', objectFit: 'contain', padding: 16 }} /></div>
                : <StrapPhotoFallback height={230} />}
            </div>
            <div style={{ marginTop: 16 }}>
              <Kicker color={brand.colors.goldDeep} style={{ marginBottom: 5 }}>{f.brand || 'Your strap'}</Kicker>
              <div style={{ fontFamily: brand.font.serif, fontSize: 20, color: brand.colors.ink, lineHeight: 1.12, marginBottom: 8 }}>{previewTitle}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {f.lugWidthMm && <SpecBadge tone="width">{f.lugWidthMm} mm</SpecBadge>}
                <SpecBadge>{materialLabel(f.material)}</SpecBadge>
                {f.style && <SpecBadge>{f.style.charAt(0).toUpperCase() + f.style.slice(1)}</SpecBadge>}
              </div>
              {f.lugWidthMm && (
                <div style={{ marginTop: 14, fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.mutedDark, lineHeight: 1.5 }}>
                  <span style={{ color: brand.colors.goldDeep, fontWeight: 600 }}>{watchesAtWidth(watches, f.lugWidthMm)} </span>
                  of your watches use {f.lugWidthMm} mm lugs.
                </div>
              )}
            </div>
          </div>

          <div className="sd-modal-form" style={{ flex: 1, overflowY: 'auto', padding: '22px 24px' }}>
            {!editing && templateGroups.length > 0 && (
              <div style={{ marginBottom: 18, paddingBottom: 16, borderBottom: `1px solid ${brand.colors.border}` }}>
                <div style={{ fontFamily: brand.font.sans, fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: brand.colors.muted, marginBottom: 8 }}>
                  Quick pick from common straps
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 11 }}>
                  {templateGroups.map(g => {
                    const on = tplTab === g.material
                    return (
                      <button key={g.material} type="button" onClick={() => setTplTab(g.material)} style={{
                        fontFamily: brand.font.sans, fontSize: 12, fontWeight: on ? 600 : 500, letterSpacing: '0.02em',
                        padding: '6px 11px', borderRadius: 7, cursor: 'pointer',
                        background: on ? brand.colors.ink : brand.colors.slot, color: on ? brand.colors.slot : brand.colors.inkSoft,
                        border: `1px solid ${on ? brand.colors.ink : brand.colors.borderMid}`, transition: 'all 0.13s',
                      }}>{materialLabel(g.material)}</button>
                    )
                  })}
                </div>
                <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
                  {(templateGroups.find(g => g.material === tplTab)?.templates ?? []).map(t => {
                    const selected = templateId === t.id
                    return (
                      <button key={t.id} type="button" onClick={() => pickTemplate(t)} title={`${t.color} ${t.subMaterial}`} style={{ flexShrink: 0, width: 78, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                        <div style={{ width: 78, height: 96, borderRadius: brand.radius.md, overflow: 'hidden', border: `1.5px solid ${selected ? brand.colors.gold : brand.colors.borderMid}`, background: brand.colors.white, boxShadow: selected ? brand.shadow.gold : 'none' }}>
                          {t.imageUrl
                            ? <img src={t.imageUrl} alt={`${t.color} ${t.subMaterial}`} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }} />
                            : <StrapPhotoFallback height={96} />}
                        </div>
                        <div style={{ fontFamily: brand.font.sans, fontSize: 12, color: selected ? brand.colors.ink : brand.colors.inkSoft, fontWeight: selected ? 600 : 400, marginTop: 4, textAlign: 'center', lineHeight: 1.2 }}>{t.color}</div>
                      </button>
                    )
                  })}
                </div>
                <div style={{ fontFamily: brand.font.serif, fontStyle: 'italic', fontSize: 15, color: brand.colors.muted, marginTop: 11 }}>Or add your own below ↓</div>
              </div>
            )}

            <Field label="Material">
              <PillRow options={MATERIALS.map(m => [m, materialLabel(m)] as [string, string])} value={f.material} onChange={(m) => { clearTemplate(); set({ material: m, subMaterial: (SUB_MATERIALS[m as keyof typeof SUB_MATERIALS] ?? [])[0] ?? '' }) }} />
            </Field>

            {subs.length > 0 && (
              <Field label="Sub-material">
                <PillRow options={subs.map(s => [s, s] as [string, string])} value={f.subMaterial} onChange={(s) => set({ subMaterial: s })} />
              </Field>
            )}

            <Field label="Color" hint="· required">
              <input style={{ ...inputStyle, marginBottom: 9 }} placeholder="e.g. Cognac" value={f.color} onChange={e => set({ color: e.target.value })} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {COMMON_COLORS.map(([name, hex]) => (
                  <button key={name} type="button" onClick={() => set({ color: name, colorHex: hex })} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: brand.font.sans, fontSize: 12, fontWeight: 500,
                    padding: '5px 10px 5px 6px', borderRadius: brand.radius.pill, cursor: 'pointer',
                    background: f.color === name ? brand.colors.ink : brand.colors.slot, color: f.color === name ? brand.colors.slot : brand.colors.inkSoft,
                    border: `1px solid ${f.color === name ? brand.colors.ink : brand.colors.borderMid}`,
                  }}>
                    <span style={{ width: 14, height: 14, borderRadius: '50%', background: hex, border: '1px solid rgba(0,0,0,0.15)' }} />
                    {name}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Lug width" hint="· required · ( ) = your watches">
              <PillRow options={COMMON_WIDTHS.map(w => [w, `${w} mm`] as [number, string])} value={f.lugWidthMm} onChange={(w) => set({ lugWidthMm: w })} counts={widthCounts} />
            </Field>

            <button type="button" onClick={() => setShowDetails(d => !d)} style={{
              display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer',
              padding: '14px 0 6px', marginTop: 6, width: '100%', borderTop: `1px solid ${brand.colors.border}`,
            }}>
              <span style={{ color: brand.colors.muted, display: 'flex', transform: showDetails ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}><StrapIcon name="chevDown" size={15} /></span>
              <span style={{ fontFamily: brand.font.sans, fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: brand.colors.inkSoft }}>Details</span>
              <span style={{ fontFamily: brand.font.serif, fontStyle: 'italic', fontSize: 13, color: brand.colors.muted }}>optional</span>
            </button>

            {showDetails && (
              <div style={{ paddingTop: 10 }}>
                <div className="sd-form-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <Field label="Name"><input style={inputStyle} placeholder="e.g. Brown Hirsch Rally" value={f.name} onChange={e => set({ name: e.target.value })} /></Field>
                  <Field label="Brand"><input style={inputStyle} placeholder="e.g. Delugs" value={f.brand} onChange={e => set({ brand: e.target.value })} /></Field>
                </div>
                <Field label="Style">
                  <PillRow options={STYLES.map(s => [s, s.charAt(0).toUpperCase() + s.slice(1)] as [StrapStyle, string])} value={f.style} onChange={(s) => set({ style: f.style === s ? null : s })} />
                </Field>
                <div className="sd-form-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <Field label="Tapered to (mm)"><input type="number" style={inputStyle} placeholder="16" value={f.taperedToMm} onChange={e => set({ taperedToMm: e.target.value })} /></Field>
                  <Field label="Length (mm)"><input type="number" style={inputStyle} placeholder="115" value={f.lengthMm} onChange={e => set({ lengthMm: e.target.value })} /></Field>
                </div>
                <Field label="Clasp type"><input style={inputStyle} placeholder="e.g. Steel pin buckle" value={f.claspType} onChange={e => set({ claspType: e.target.value })} /></Field>
                <div className="sd-form-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <Field label="Price paid (USD)"><input type="number" style={inputStyle} placeholder="189" value={f.priceDollars} onChange={e => set({ priceDollars: e.target.value })} /></Field>
                  <Field label="Purchase URL"><input style={inputStyle} placeholder="https://…" value={f.purchaseUrl} onChange={e => set({ purchaseUrl: e.target.value })} /></Field>
                </div>
                <Field label="Notes"><textarea style={{ ...inputStyle, minHeight: 64, resize: 'vertical', lineHeight: 1.5 }} placeholder="When you reach for it, what it pairs with…" value={f.notes} onChange={e => set({ notes: e.target.value })} /></Field>
                <Field label="Photo">
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic" style={{ display: 'none' }} onChange={e => pickFile(e.target.files?.[0] ?? null)} />
                  <div
                    onClick={() => fileRef.current?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); pickFile(e.dataTransfer.files?.[0] ?? null) }}
                    style={{ border: `1.5px dashed ${brand.colors.borderLight}`, borderRadius: brand.radius.lg, padding: '22px 16px', textAlign: 'center', background: brand.colors.bg, cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8, color: brand.colors.borderLight }}><StrapIcon name="photo" size={22} /></div>
                    <div style={{ fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.mutedDark }}>
                      {photoFile ? photoFile.name : <>Drop a photo, or <span style={{ color: brand.colors.goldDeep, fontWeight: 600 }}>browse</span></>}
                    </div>
                    <div style={{ fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.muted, marginTop: 4 }}>JPG, PNG, WEBP or HEIC · processed to 1600px</div>
                  </div>
                </Field>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '14px 24px', borderTop: `1px solid ${brand.colors.border}`, flexShrink: 0, background: brand.colors.slot }}>
          <span style={{ fontFamily: brand.font.serif, fontStyle: 'italic', fontSize: 13, color: canSave ? brand.colors.muted : brand.colors.borderLight }}>
            {saving ? 'Saving…' : canSave ? 'Ready to save' : 'Material, color and lug width required'}
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            <GhostBtn onClick={onClose}>Cancel</GhostBtn>
            <PrimaryBtn onClick={handleSave} disabled={!canSave} style={{ opacity: canSave ? 1 : 0.4, pointerEvents: canSave ? 'auto' : 'none' }}>{editing ? 'Save changes' : 'Add strap'}</PrimaryBtn>
          </div>
        </div>
      </div>
    </div>
  )
}
