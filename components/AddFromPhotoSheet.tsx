'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { brand } from '@/lib/brand'
import type { CatalogWatch, WatchCondition, WatchType } from '@/types/watch'
import { useCollectionSession } from '@/app/collection/CollectionSessionProvider'
import { useCatalog } from '@/lib/catalog/CatalogProvider'

const CONDITIONS: WatchCondition[] = ['Unworn', 'Like New', 'Excellent', 'Good', 'Fair']
const WATCH_TYPES: WatchType[] = [
  'Diver', 'Dress', 'Sport', 'Chronograph', 'GMT',
  'Pilot', 'Field', 'Integrated Bracelet', 'Vintage',
]

type Prefill = {
  brand: string
  model: string
  reference: string
  dialColor: string
  watchType: WatchType | ''
  caseSizeMm: number | null
  caseMaterial: string
  movement: string
  estimatedValue: number | null
}

type DialBbox = { x: number; y: number; w: number; h: number }

type Props = {
  imageFile: File
  imageDataUrl: string | null
  prefill: Prefill
  dialBbox?: DialBbox | null
  onClose: () => void
  onAdded: () => void
}

export default function AddFromPhotoSheet({ imageFile, imageDataUrl, prefill, dialBbox, onClose, onAdded }: Props) {
  const router = useRouter()
  const { addToCollection } = useCollectionSession()
  const { refresh: refreshCatalog } = useCatalog()
  const sheetRef = useRef<HTMLDivElement | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  const [brandField, setBrandField] = useState(prefill.brand)
  const [model, setModel] = useState(prefill.model)
  const [reference, setReference] = useState(prefill.reference)
  const [dialColor, setDialColor] = useState(prefill.dialColor)
  const [watchType, setWatchType] = useState<WatchType>(prefill.watchType || 'Sport')
  const [caseSizeMm, setCaseSizeMm] = useState(prefill.caseSizeMm ? String(prefill.caseSizeMm) : '')
  const [caseMaterial, setCaseMaterial] = useState(prefill.caseMaterial)
  const [estimatedValue, setEstimatedValue] = useState(prefill.estimatedValue ? String(prefill.estimatedValue) : '')
  const [condition, setCondition] = useState<WatchCondition | null>(null)
  const [purchasePrice, setPurchasePrice] = useState('')
  const [purchaseDate, setPurchaseDate] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 768)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSubmit() {
    if (!brandField.trim() || !model.trim() || !condition) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const formData = new FormData()
      formData.append('image', imageFile, imageFile.name || 'watch.jpg')
      formData.append('brand', brandField.trim())
      formData.append('model', model.trim())
      formData.append('reference', reference.trim())
      formData.append('dialColor', dialColor.trim())
      formData.append('watchType', watchType)
      if (caseSizeMm) formData.append('caseSizeMm', caseSizeMm)
      formData.append('caseMaterial', caseMaterial.trim())
      if (estimatedValue) formData.append('estimatedValue', estimatedValue)
      if (dialBbox) {
        formData.append('bboxX', String(dialBbox.x))
        formData.append('bboxY', String(dialBbox.y))
        formData.append('bboxW', String(dialBbox.w))
        formData.append('bboxH', String(dialBbox.h))
      }

      const res = await fetch('/api/user-watches/create-from-photo', { method: 'POST', body: formData })
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody.detail ?? errBody.error ?? `HTTP ${res.status}`)
      }
      const body = await res.json() as { catalogWatch: CatalogWatch; photoUrl?: string }

      // Pull the new pending row into the catalog provider so renderers can resolve it.
      await refreshCatalog()

      const newOwnedId = addToCollection(body.catalogWatch, condition, {
        price: purchasePrice ? Number(purchasePrice) : undefined,
        date: purchaseDate || undefined,
        notes: notes.trim() || undefined,
        photoUrl: body.photoUrl,
      })

      // Register the user's uploaded photo into the gallery for this owned watch
      // so it appears in the new detail-page surface and sidebar gallery.
      if (body.photoUrl && newOwnedId) {
        try {
          await fetch(`/api/user-watches/${newOwnedId}/photos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ photoUrl: body.photoUrl }),
          })
        } catch { /* non-fatal */ }
      }

      onAdded()
      router.push('/collection')
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to add watch')
      setSubmitting(false)
    }
  }

  const canSubmit = !!brandField.trim() && !!model.trim() && !!condition && !submitting

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Add this watch to your collection"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 320,
        background: 'rgba(26,20,16,0.55)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        padding: isMobile ? 0 : 16,
        overflowY: 'auto',
      }}
    >
      <div
        ref={sheetRef}
        onClick={e => e.stopPropagation()}
        style={{
          background: brand.colors.bg,
          borderRadius: isMobile ? '16px 16px 0 0' : brand.radius.xl,
          width: isMobile ? '100%' : 'min(720px, 100%)',
          maxHeight: isMobile ? '92vh' : '90vh',
          overflowY: 'auto',
          padding: isMobile ? '20px 18px 28px' : '28px 32px 32px',
          boxShadow: brand.shadow.xl,
        }}
      >
        <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
          <div>
            <div style={{ fontFamily: brand.font.sans, fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: brand.colors.goldDeep, marginBottom: 4 }}>
              Watchbox Concierge
            </div>
            <h2 style={{
              margin: 0,
              fontFamily: brand.font.serif,
              fontSize: isMobile ? 24 : 28,
              fontWeight: 400,
              color: brand.colors.ink,
              lineHeight: 1.1,
            }}>
              Add this watch to your collection
            </h2>
            <p style={{
              fontFamily: brand.font.sans,
              fontSize: 14,
              color: brand.colors.muted,
              marginTop: 6,
              lineHeight: 1.5,
            }}>
              We&apos;ll save your photo and the details we found. Edit anything that looks wrong before saving.
            </p>
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
          gridTemplateColumns: isMobile ? '1fr' : '180px 1fr',
          gap: isMobile ? 14 : 24,
          marginBottom: 22,
          alignItems: 'flex-start',
        }}>
          {imageDataUrl && (
            <div style={{
              width: isMobile ? '100%' : 180,
              aspectRatio: '1 / 1',
              borderRadius: brand.radius.md,
              overflow: 'hidden',
              background: brand.colors.slot,
              border: `1px solid ${brand.colors.border}`,
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageDataUrl} alt="Your watch" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}

          <div style={{ display: 'grid', gap: 10 }}>
            <Field label="Brand" value={brandField} onChange={setBrandField} required />
            <Field label="Model" value={model} onChange={setModel} required />
            <Field label="Reference" value={reference} onChange={setReference} placeholder="e.g. L3.830.4.92.6" />
            <Field label="Dial Color" value={dialColor} onChange={setDialColor} placeholder="e.g. Sunburst Blue" />
            <div>
              <FieldLabel>Watch Type</FieldLabel>
              <select
                value={watchType}
                onChange={e => setWatchType(e.target.value as WatchType)}
                style={selectStyle}
              >
                {WATCH_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Case Size (mm)" value={caseSizeMm} onChange={setCaseSizeMm} placeholder="e.g. 41" type="number" />
              <Field label="Case Material" value={caseMaterial} onChange={setCaseMaterial} placeholder="e.g. Stainless Steel" />
            </div>
            <Field
              label="Est. Market Value (USD)"
              value={estimatedValue}
              onChange={setEstimatedValue}
              placeholder={prefill.estimatedValue ? `Concierge: $${prefill.estimatedValue}` : 'e.g. 2200'}
              type="number"
            />
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${brand.colors.border}`, paddingTop: 18, marginBottom: 18 }}>
          <FieldLabel>Condition</FieldLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {CONDITIONS.map(option => {
              const active = condition === option
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setCondition(option)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: brand.radius.pill,
                    border: active ? `1.5px solid ${brand.colors.ink}` : `1px solid ${brand.colors.border}`,
                    background: active ? brand.colors.ink : brand.colors.white,
                    color: active ? brand.colors.bg : brand.colors.ink,
                    fontFamily: brand.font.sans,
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  {option}
                </button>
              )
            })}
          </div>
        </div>

        <details style={{ marginBottom: 20 }}>
          <summary style={{ fontFamily: brand.font.sans, fontSize: 14, color: brand.colors.muted, cursor: 'pointer', listStyle: 'none' }}>
            <span style={{ color: brand.colors.goldDeep, marginRight: 6 }}>+</span>Purchase details (optional)
          </summary>
          <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
            <Field label="Purchase Price" value={purchasePrice} onChange={setPurchasePrice} placeholder="USD" type="number" />
            <div>
              <FieldLabel>Purchase Date</FieldLabel>
              <input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <FieldLabel>Notes</FieldLabel>
              <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
          </div>
        </details>

        <div style={{
          padding: '12px 14px',
          borderRadius: brand.radius.md,
          background: brand.colors.goldWash,
          border: `1px solid ${brand.colors.goldLine}`,
          marginBottom: 16,
          fontFamily: brand.font.sans,
          fontSize: 12,
          color: brand.colors.ink,
          lineHeight: 1.5,
        }}>
          <span style={{ fontWeight: 600 }}>Pending review.</span> Your watch will appear in your collection right away. Our team reviews user-submitted watches before they show up in the public catalog.
        </div>

        {submitError && (
          <div style={{
            padding: '10px 12px',
            borderRadius: brand.radius.sm,
            background: 'rgba(208,64,64,0.08)',
            border: '1px solid rgba(208,64,64,0.3)',
            color: '#9A2222',
            fontFamily: brand.font.sans,
            fontSize: 14,
            marginBottom: 12,
          }}>
            {submitError}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              flex: 1,
              minWidth: 200,
              padding: '14px 20px',
              background: canSubmit ? brand.colors.ink : brand.colors.muted,
              color: brand.colors.bg,
              border: 'none',
              borderRadius: brand.radius.btn,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              fontFamily: brand.font.sans,
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            {submitting ? 'Saving…' : 'Add to my watchbox →'}
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '14px 18px',
              background: 'transparent',
              color: brand.colors.ink,
              border: `1px solid ${brand.colors.border}`,
              borderRadius: brand.radius.btn,
              cursor: 'pointer',
              fontFamily: brand.font.sans,
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: '0.06em',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      display: 'block',
      fontFamily: brand.font.sans,
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: brand.colors.muted,
      marginBottom: 4,
    }}>
      {children}
    </span>
  )
}

function Field({
  label, value, onChange, placeholder, required, type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
  type?: 'text' | 'number'
}) {
  return (
    <div>
      <FieldLabel>{label}{required && <span style={{ color: brand.colors.goldDeep, marginLeft: 4 }}>*</span>}</FieldLabel>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={inputStyle}
      />
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 12px',
  border: `1px solid ${brand.colors.border}`,
  borderRadius: brand.radius.sm,
  fontFamily: brand.font.sans,
  // 16px is the iOS Safari focus-zoom threshold — anything smaller
  // triggers an auto-zoom that persists and breaks the layout.
  fontSize: 16,
  color: brand.colors.ink,
  background: brand.colors.white,
  outline: 'none',
}

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: 'none',
  cursor: 'pointer',
}
