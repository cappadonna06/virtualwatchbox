'use client'

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import type { OwnershipStatus, ResolvedOwnedWatch, WatchCondition } from '@/types/watch'
import { brand } from '@/lib/brand'
import WatchImageOrDial from '@/components/watchbox/WatchImageOrDial'

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

const CONDITIONS: WatchCondition[] = ['Unworn', 'Like New', 'Excellent', 'Good', 'Fair']

type AcquisitionMethod = NonNullable<ResolvedOwnedWatch['acquisitionMethod']>
const ACQUISITION_METHODS: { value: AcquisitionMethod; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'pre-owned', label: 'Pre-Owned' },
  { value: 'gift', label: 'Gift' },
  { value: 'inherited', label: 'Inherited' },
  { value: 'trade', label: 'Trade' },
  { value: 'auction', label: 'Auction' },
]

export type EditWatchUpdates = {
  condition: WatchCondition
  ownershipStatus: OwnershipStatus
  purchasePrice: number
  purchaseDate: string
  notes: string
  hasBox?: boolean
  hasPapers?: boolean
  acquisitionMethod?: AcquisitionMethod
  warrantyExpiresAt?: string
  lastServicedAt?: string
  serviceNotes?: string
}

interface Props {
  watch: ResolvedOwnedWatch
  onClose: () => void
  onSave: (updates: EditWatchUpdates) => void
}

const labelStyle: CSSProperties = {
  fontFamily: brand.font.sans,
  fontSize: 9,
  fontWeight: 600,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: brand.colors.muted,
  marginBottom: 6,
}

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '10px 12px',
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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      {children}
    </div>
  )
}

function ChoicePill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '7px 13px',
        borderRadius: brand.radius.pill,
        border: active ? `1.5px solid ${brand.colors.ink}` : `1px solid ${brand.colors.borderLight}`,
        background: active ? brand.colors.ink : brand.colors.white,
        color: active ? brand.colors.bg : brand.colors.ink,
        fontFamily: brand.font.sans,
        fontSize: 11,
        fontWeight: 500,
        cursor: 'pointer',
        transition: brand.transition.fast,
      }}
    >
      {children}
    </button>
  )
}

export default function EditWatchModal({ watch, onClose, onSave }: Props) {
  const [condition, setCondition] = useState<WatchCondition>(watch.condition)
  const [forSale, setForSale] = useState<boolean>(watch.ownershipStatus === 'For Sale')
  const [purchasePrice, setPurchasePrice] = useState<string>(
    watch.purchasePrice ? String(watch.purchasePrice) : '',
  )
  const [purchaseDate, setPurchaseDate] = useState<string>(watch.purchaseDate ?? '')
  const [notes, setNotes] = useState<string>(watch.notes ?? '')
  const [hasBox, setHasBox] = useState<boolean>(watch.hasBox ?? false)
  const [hasPapers, setHasPapers] = useState<boolean>(watch.hasPapers ?? false)
  const [acquisitionMethod, setAcquisitionMethod] = useState<AcquisitionMethod | undefined>(watch.acquisitionMethod)
  const [warrantyExpiresAt, setWarrantyExpiresAt] = useState<string>(watch.warrantyExpiresAt ?? '')

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleSave() {
    const numericPrice = Number.parseFloat(purchasePrice)
    onSave({
      condition,
      ownershipStatus: forSale ? 'For Sale' : 'Owned',
      purchasePrice: Number.isFinite(numericPrice) && numericPrice >= 0 ? numericPrice : 0,
      purchaseDate: purchaseDate.trim(),
      notes: notes.trim(),
      hasBox,
      hasPapers,
      acquisitionMethod,
      warrantyExpiresAt: warrantyExpiresAt.trim(),
    })
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(26,20,16,0.45)',
          zIndex: 210,
          backdropFilter: 'blur(2px)',
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Edit ${watch.brand} ${watch.model}`}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '94vw',
          maxWidth: 680,
          maxHeight: '90vh',
          overflowY: 'auto',
          background: brand.colors.white,
          border: `1px solid ${brand.colors.border}`,
          borderRadius: brand.radius.xl,
          boxShadow: brand.shadow.lg,
          zIndex: 211,
          padding: 20,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
          <div>
            <div
              style={{
                fontFamily: brand.font.sans,
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: brand.colors.muted,
                marginBottom: 4,
              }}
            >
              Edit Watch
            </div>
            <div
              style={{
                fontFamily: brand.font.sans,
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: brand.colors.gold,
              }}
            >
              {watch.brand}
            </div>
            <div style={{ fontFamily: brand.font.serif, fontSize: 22, color: brand.colors.ink, lineHeight: 1.1, marginTop: 2 }}>
              {watch.model}
            </div>
            <div style={{ fontFamily: brand.font.sans, fontSize: 11, color: brand.colors.muted, marginTop: 2 }}>
              Ref. {watch.reference}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: brand.colors.muted,
              fontSize: 18,
              lineHeight: 1,
              padding: 4,
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        <div
          className="grid grid-cols-1 md:grid-cols-[180px,1fr] gap-4"
          style={{
            alignItems: 'stretch',
            marginBottom: 14,
          }}
        >
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: 180,
              aspectRatio: '1 / 1',
              background: brand.colors.bg,
              border: `1px solid ${brand.colors.border}`,
              borderRadius: brand.radius.md,
              overflow: 'hidden',
              justifySelf: 'center',
            }}
          >
            <div style={{ position: 'absolute', inset: 12 }}>
              <WatchImageOrDial
                watch={watch}
                fill
                sizes="(max-width: 768px) 180px, 180px"
                imageStyle={{ objectFit: 'contain' }}
                dialSize={140}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '7px 12px',
                background: brand.colors.bg,
                border: `1px solid ${brand.colors.border}`,
                borderRadius: brand.radius.md,
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  fontFamily: brand.font.sans,
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: brand.colors.muted,
                }}
              >
                Est. Market Value
              </span>
              <span style={{ fontFamily: brand.font.sans, fontSize: 15, fontWeight: 600, color: brand.colors.gold }}>
                {fmt(watch.estimatedValue)}
              </span>
            </div>
            {(
              [
                ['Case Size', `${watch.caseSizeMm}mm`],
                ...(watch.lugWidthMm ? [['Lug Width', `${watch.lugWidthMm}mm`] as [string, string]] : []),
                ['Case Material', watch.caseMaterial],
                ['Dial Color', watch.dialColor],
                ['Movement', watch.movement],
                ['Complications', watch.complications.join(', ') || '—'],
              ] as [string, string][]
            ).map(([label, value]) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  gap: 12,
                  padding: '5px 0',
                  borderBottom: '1px solid #F0EBE3',
                  fontFamily: brand.font.sans,
                  fontSize: 12,
                }}
              >
                <span style={{ color: brand.colors.muted }}>{label}</span>
                <span style={{ color: brand.colors.ink, fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 12, marginBottom: 14 }}>
          <Field label="Condition">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {CONDITIONS.map(option => (
                <ChoicePill key={option} active={condition === option} onClick={() => setCondition(option)}>
                  {option}
                </ChoicePill>
              ))}
            </div>
          </Field>

          <Field label="Listing">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <ChoicePill active={!forSale} onClick={() => setForSale(false)}>Owned</ChoicePill>
              <ChoicePill active={forSale} onClick={() => setForSale(true)}>For Sale</ChoicePill>
            </div>
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Purchase Price (USD)">
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step={1}
                value={purchasePrice}
                placeholder="0"
                onChange={event => setPurchasePrice(event.target.value)}
                style={inputStyle}
              />
            </Field>
            <Field label="Purchase Date">
              <input
                type="date"
                value={purchaseDate}
                onChange={event => setPurchaseDate(event.target.value)}
                style={inputStyle}
              />
            </Field>
          </div>

          <Field label="Notes">
            <textarea
              rows={3}
              value={notes}
              placeholder="Provenance, papers, service history, why you love it…"
              onChange={event => setNotes(event.target.value)}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </Field>

          <div style={{ borderTop: `1px solid ${brand.colors.border}`, paddingTop: 18, marginTop: 4 }}>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: brand.font.serif, fontSize: 17, color: brand.colors.ink, lineHeight: 1.1 }}>
                Provenance &amp; Papers
              </div>
              <div style={{ fontFamily: brand.font.sans, fontSize: 11.5, color: brand.colors.muted, marginTop: 3, lineHeight: 1.45 }}>
                Box, papers, and warranty affect a watch&apos;s value and how it sells.
              </div>
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              <Field label="Box &amp; Papers">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  <ChoicePill active={hasBox} onClick={() => setHasBox(value => !value)}>Box</ChoicePill>
                  <ChoicePill active={hasPapers} onClick={() => setHasPapers(value => !value)}>Papers</ChoicePill>
                </div>
              </Field>

              <Field label="Acquisition Method">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {ACQUISITION_METHODS.map(method => (
                    <ChoicePill
                      key={method.value}
                      active={acquisitionMethod === method.value}
                      onClick={() => setAcquisitionMethod(prev => (prev === method.value ? undefined : method.value))}
                    >
                      {method.label}
                    </ChoicePill>
                  ))}
                </div>
              </Field>

              <Field label="Warranty Expires">
                <input
                  type="date"
                  value={warrantyExpiresAt}
                  onChange={event => setWarrantyExpiresAt(event.target.value)}
                  style={inputStyle}
                />
              </Field>

              <div
                style={{
                  fontFamily: brand.font.sans,
                  fontSize: 11,
                  color: brand.colors.muted,
                  lineHeight: 1.5,
                  paddingTop: 2,
                }}
              >
                Receipts, warranty cards, and service records attach as documents in the
                watch&apos;s photo gallery; service history lives in the Service Center on its detail page.
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              fontFamily: brand.font.sans,
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              padding: '10px 12px',
              background: 'transparent',
              color: brand.colors.ink,
              border: `1px solid ${brand.colors.borderLight}`,
              borderRadius: brand.radius.sm,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            style={{
              fontFamily: brand.font.sans,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              padding: '10px 12px',
              background: brand.colors.ink,
              color: brand.colors.bg,
              border: 'none',
              borderRadius: brand.radius.sm,
              cursor: 'pointer',
            }}
          >
            Save Changes
          </button>
        </div>
      </div>
    </>
  )
}
