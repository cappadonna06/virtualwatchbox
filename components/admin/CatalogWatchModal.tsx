'use client'

import Link from 'next/link'
import { useEffect, useState, type CSSProperties } from 'react'
import { brand } from '@/lib/brand'
import type { CatalogWatch, WatchType } from '@/types/watch'
import WatchImageOrDial from '@/components/watchbox/WatchImageOrDial'
import { useWatchImages } from '@/lib/watchImages/WatchImagesProvider'

const WATCH_TYPES: WatchType[] = [
  'Diver', 'Dress', 'Sport', 'Chronograph', 'GMT',
  'Pilot', 'Field', 'Integrated Bracelet', 'Vintage',
]

type Props = {
  watch: CatalogWatch
  initialMode?: 'view' | 'edit'
  onClose: () => void
  onSaved: (watch: CatalogWatch) => void
}

type FormState = {
  brand: string
  model: string
  reference: string
  watch_type: WatchType
  case_size_mm: string
  lug_width_mm: string
  case_material: string
  dial_color: string
  movement: string
  complications: string
  estimated_value: string
  dial_color_hex: string
  marker_color_hex: string
  hand_color_hex: string
}

function watchToForm(w: CatalogWatch): FormState {
  return {
    brand: w.brand,
    model: w.model,
    reference: w.reference,
    watch_type: w.watchType,
    case_size_mm: String(w.caseSizeMm),
    lug_width_mm: w.lugWidthMm ? String(w.lugWidthMm) : '',
    case_material: w.caseMaterial,
    dial_color: w.dialColor,
    movement: w.movement,
    complications: w.complications.join(', '),
    estimated_value: String(w.estimatedValue),
    dial_color_hex: w.dialConfig.dialColor,
    marker_color_hex: w.dialConfig.markerColor,
    hand_color_hex: w.dialConfig.handColor,
  }
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

export default function CatalogWatchModal({ watch, initialMode = 'view', onClose, onSaved }: Props) {
  const [mode, setMode] = useState<'view' | 'edit'>(initialMode)
  const [form, setForm] = useState<FormState>(() => watchToForm(watch))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { getImageUrl } = useWatchImages()
  const curatedImageUrl = getImageUrl(watch.id) ?? watch.imageUrl ?? null

  useEffect(() => {
    setForm(watchToForm(watch))
  }, [watch])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && mode !== 'edit') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, onClose])

  const upd = (k: keyof FormState, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  async function handleSave() {
    setBusy(true)
    setError(null)
    try {
      const payload = {
        id: watch.id,
        brand: form.brand,
        model: form.model,
        reference: form.reference,
        watch_type: form.watch_type,
        case_size_mm: Number(form.case_size_mm) || 0,
        lug_width_mm: form.lug_width_mm ? Number(form.lug_width_mm) : null,
        case_material: form.case_material,
        dial_color: form.dial_color,
        movement: form.movement,
        complications: form.complications.split(',').map(s => s.trim()).filter(Boolean),
        estimated_value: Number(form.estimated_value || 0),
        dial_color_hex: form.dial_color_hex || '#1A1410',
        marker_color_hex: form.marker_color_hex || '#C8BCAF',
        hand_color_hex: form.hand_color_hex || '#FFFFFF',
        source: 'manual',
      }
      // Upsert via the existing POST endpoint (id present → upsert path).
      const res = await fetch('/api/admin/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? `HTTP ${res.status}`)
      }
      // Build the resolved CatalogWatch the parent should swap in.
      const next: CatalogWatch = {
        id: watch.id,
        brand: form.brand,
        model: form.model,
        reference: form.reference,
        caseSizeMm: Number(form.case_size_mm) || 0,
        lugWidthMm: form.lug_width_mm ? Number(form.lug_width_mm) : undefined,
        caseMaterial: form.case_material,
        dialColor: form.dial_color,
        movement: form.movement,
        complications: form.complications.split(',').map(s => s.trim()).filter(Boolean),
        estimatedValue: Number(form.estimated_value || 0),
        watchType: form.watch_type,
        imageUrl: watch.imageUrl,
        imageTransparentUrl: watch.imageTransparentUrl,
        imageSourceUrl: watch.imageSourceUrl,
        dialConfig: {
          dialColor: form.dial_color_hex || '#1A1410',
          markerColor: form.marker_color_hex || '#C8BCAF',
          handColor: form.hand_color_hex || '#FFFFFF',
        },
      }
      onSaved(next)
      setMode('view')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  function handleCancelEdit() {
    setForm(watchToForm(watch))
    setError(null)
    setMode('view')
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={() => { if (mode !== 'edit') onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 320,
        background: 'rgba(26,20,16,0.55)', backdropFilter: 'blur(2px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: 24, overflowY: 'auto',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: brand.colors.bg,
          borderRadius: brand.radius.xl,
          width: 'min(820px, 100%)',
          maxWidth: '100%',
          padding: 28,
          boxShadow: brand.shadow.xl,
          marginTop: 32,
          marginBottom: 32,
        }}
      >
        <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}>
          <div>
            <div style={{ fontFamily: brand.font.sans, fontSize: 9, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: brand.colors.muted, marginBottom: 6 }}>
              Catalog Watch · {watch.id}
            </div>
            <h2 style={{
              margin: 0, fontFamily: brand.font.serif, fontSize: 28, fontWeight: 400,
              color: brand.colors.ink, lineHeight: 1.05,
            }}>
              {mode === 'view' ? `${watch.brand} ${watch.model}` : 'Edit catalog details'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'transparent', border: 'none', fontSize: 22, cursor: 'pointer',
              color: brand.colors.muted, padding: 4, lineHeight: 1, flexShrink: 0,
            }}
          >
            ✕
          </button>
        </header>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '220px 1fr',
          gap: 24,
          marginBottom: 22,
          alignItems: 'flex-start',
        }}>
          <div>
            <div style={{
              width: 220, aspectRatio: '1 / 1',
              background: brand.colors.slot,
              border: `1px solid ${brand.colors.border}`,
              borderRadius: brand.radius.lg,
              overflow: 'hidden',
              position: 'relative',
            }}>
              <WatchImageOrDial
                watch={watch}
                fill
                sizes="220px"
                imageStyle={{ objectFit: 'contain', padding: 16 }}
                dialSize={140}
              />
            </div>
            <div style={{
              marginTop: 8,
              fontFamily: brand.font.sans,
              fontSize: 10,
              color: brand.colors.muted,
              letterSpacing: '0.04em',
              textAlign: 'center',
            }}>
              {curatedImageUrl ? 'Curated photo' : 'No photo · using SVG dial'}
            </div>
            <Link
              href={`/admin/images?watchId=${watch.id}`}
              style={{
                display: 'block',
                marginTop: 10,
                padding: '10px 14px',
                textAlign: 'center',
                background: 'transparent',
                color: brand.colors.ink,
                border: `1px solid ${brand.colors.ink}`,
                borderRadius: brand.radius.btn,
                fontFamily: brand.font.sans, fontSize: 11, fontWeight: 500,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                textDecoration: 'none',
              }}
            >
              {curatedImageUrl ? 'Replace photo →' : 'Upload photo →'}
            </Link>
          </div>

          <div style={{ minWidth: 0 }}>
            {mode === 'view' ? (
              <ViewFields watch={watch} />
            ) : (
              <EditFields form={form} setField={upd} />
            )}
          </div>
        </div>

        {error && (
          <div style={{
            padding: '10px 12px', borderRadius: brand.radius.sm,
            background: 'rgba(208,64,64,0.08)', border: '1px solid rgba(208,64,64,0.3)',
            color: '#9A2222', fontFamily: brand.font.sans, fontSize: 12,
            marginBottom: 12,
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          {mode === 'view' ? (
            <>
              <button type="button" onClick={onClose} style={ghostBtn}>Close</button>
              <button type="button" onClick={() => setMode('edit')} style={primaryBtn}>
                ✎ Edit details
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={handleCancelEdit} disabled={busy} style={ghostBtn}>Cancel</button>
              <button type="button" onClick={handleSave} disabled={busy} style={primaryBtn}>
                {busy ? 'Saving…' : 'Save to Supabase'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ViewFields({ watch }: { watch: CatalogWatch }) {
  const rows: Array<[string, string]> = [
    ['Brand', watch.brand],
    ['Model', watch.model],
    ['Reference', watch.reference || '—'],
    ['Watch Type', watch.watchType],
    ['Case Size', `${watch.caseSizeMm}mm`],
    ...(watch.lugWidthMm ? [['Lug Width', `${watch.lugWidthMm}mm`] as [string, string]] : []),
    ['Case Material', watch.caseMaterial || '—'],
    ['Dial Color', watch.dialColor || '—'],
    ['Movement', watch.movement || '—'],
    ['Complications', watch.complications.join(', ') || '—'],
    ['Est. Market Value', watch.estimatedValue > 0 ? fmt(watch.estimatedValue) : '—'],
  ]
  return (
    <div>
      <div style={{
        fontFamily: brand.font.sans, fontSize: 10, fontWeight: 600,
        letterSpacing: '0.14em', textTransform: 'uppercase', color: brand.colors.gold,
        marginBottom: 4,
      }}>
        {watch.brand}
      </div>
      <div style={{
        fontFamily: brand.font.serif, fontSize: 22, color: brand.colors.ink,
        lineHeight: 1.1, marginBottom: 12,
      }}>
        {watch.model} · {watch.reference || '—'}
      </div>
      <div style={{ display: 'grid', gap: 0 }}>
        {rows.map(([label, value]) => (
          <div
            key={label}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              gap: 16,
              padding: '8px 0',
              borderBottom: `1px solid ${brand.colors.borderLight}`,
            }}
          >
            <span style={{ fontFamily: brand.font.sans, fontSize: 11, color: brand.colors.muted }}>{label}</span>
            <span style={{ fontFamily: brand.font.sans, fontSize: 12, fontWeight: 500, color: brand.colors.ink, textAlign: 'right' }}>
              {value}
            </span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
        <ColorSwatch label="Dial" hex={watch.dialConfig.dialColor} />
        <ColorSwatch label="Marker" hex={watch.dialConfig.markerColor} />
        <ColorSwatch label="Hand" hex={watch.dialConfig.handColor} />
      </div>
    </div>
  )
}

function ColorSwatch({ label, hex }: { label: string; hex: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{
        width: 16, height: 16, borderRadius: '50%',
        background: hex, border: `1px solid ${brand.colors.border}`,
        flexShrink: 0,
      }} />
      <span style={{
        fontFamily: brand.font.sans, fontSize: 10, color: brand.colors.muted,
        letterSpacing: '0.06em', textTransform: 'uppercase',
      }}>
        {label} {hex}
      </span>
    </div>
  )
}

function EditFields({
  form,
  setField,
}: {
  form: FormState
  setField: (k: keyof FormState, v: string) => void
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      <Field label="Brand"     value={form.brand}     onChange={v => setField('brand', v)} />
      <Field label="Model"     value={form.model}     onChange={v => setField('model', v)} />
      <Field label="Reference" value={form.reference} onChange={v => setField('reference', v)} full />
      <SelectField
        label="Watch Type"
        value={form.watch_type}
        onChange={v => setField('watch_type', v)}
        options={WATCH_TYPES}
      />
      <Field label="Est. value (USD)" value={form.estimated_value} onChange={v => setField('estimated_value', v)} type="number" />
      <Field label="Case size (mm)"   value={form.case_size_mm} onChange={v => setField('case_size_mm', v)} type="number" />
      <Field label="Lug width (mm)"   value={form.lug_width_mm} onChange={v => setField('lug_width_mm', v)} type="number" />
      <Field label="Case material"    value={form.case_material} onChange={v => setField('case_material', v)} />
      <Field label="Dial color"       value={form.dial_color}    onChange={v => setField('dial_color', v)} />
      <Field label="Movement"         value={form.movement}      onChange={v => setField('movement', v)} full />
      <Field label="Complications (comma-separated)" value={form.complications} onChange={v => setField('complications', v)} full />
      <Field label="Dial hex"   value={form.dial_color_hex}  onChange={v => setField('dial_color_hex', v)} />
      <Field label="Marker hex" value={form.marker_color_hex} onChange={v => setField('marker_color_hex', v)} />
      <Field label="Hand hex"   value={form.hand_color_hex}   onChange={v => setField('hand_color_hex', v)} full />
    </div>
  )
}

function Field({
  label, value, onChange, type = 'text', full = false,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: 'text' | 'number'
  full?: boolean
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 3, gridColumn: full ? 'span 2' : undefined }}>
      <span style={fieldLabel}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={fieldInput}
      />
    </label>
  )
}

function SelectField({
  label, value, options, onChange,
}: {
  label: string
  value: string
  options: readonly string[]
  onChange: (v: string) => void
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={fieldLabel}>{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ ...fieldInput, cursor: 'pointer' }}
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  )
}

const fieldLabel: CSSProperties = {
  fontFamily: brand.font.sans, fontSize: 9, fontWeight: 600,
  letterSpacing: '0.1em', textTransform: 'uppercase', color: brand.colors.muted,
}

const fieldInput: CSSProperties = {
  padding: '7px 9px',
  fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.ink,
  background: brand.colors.bg,
  border: `1px solid ${brand.colors.borderMid}`,
  borderRadius: brand.radius.sm,
  outline: 'none',
  width: '100%',
}

const primaryBtn: CSSProperties = {
  padding: '10px 18px',
  background: brand.colors.ink,
  color: brand.colors.bg,
  border: `1px solid ${brand.colors.ink}`,
  borderRadius: brand.radius.btn,
  fontFamily: brand.font.sans, fontSize: 12, fontWeight: 500, letterSpacing: '0.06em',
  cursor: 'pointer',
}

const ghostBtn: CSSProperties = {
  padding: '10px 14px',
  background: 'transparent',
  color: brand.colors.ink,
  border: `1px solid ${brand.colors.border}`,
  borderRadius: brand.radius.btn,
  fontFamily: brand.font.sans, fontSize: 12, fontWeight: 500, letterSpacing: '0.04em',
  cursor: 'pointer',
}
