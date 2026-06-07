'use client'

// components/serviceRoom/onboarding/WizardStep2.tsx
// Wizard Step 2 · "Build the dossier" (optional) — one watch at a time. Box /
// Papers chips, an optional warranty date, and a drag-and-drop upload zone
// with editable document types. Skippable per piece.

import { useRef, type CSSProperties } from 'react'
import { brand } from '@/lib/brand'
import { DOC_TYPES, type ServiceWatch } from '@/lib/serviceRoom/derive'
import type { PhotoType } from '@/types/watch'
import { DocTile, Icon, Meta, WatchShot } from '@/components/serviceRoom/primitives'
import type { WatchDraft } from './wizardDraft'

const sans = brand.font.sans
const serif = brand.font.serif

const ACCEPT = 'image/jpeg,image/png,image/heic,image/webp,image/*,application/pdf'

const dateInput: CSSProperties = {
  width: '100%', fontFamily: sans, fontSize: 15, color: brand.colors.ink, background: brand.colors.white,
  border: `1px solid ${brand.colors.borderLight}`, borderRadius: brand.radius.md, padding: '9px 12px', outline: 'none',
}

type Props = {
  sw: ServiceWatch
  index: number
  total: number
  d: WatchDraft
  onPatch: (partial: Partial<WatchDraft>) => void
  onAddFiles: (files: FileList | File[]) => void
  onSetDocType: (docId: string, type: PhotoType) => void
  onRemoveDoc: (docId: string) => void
  isMobile: boolean
}

export function WizardStep2({ sw, index, total, d, onPatch, onAddFiles, onSetDocType, onRemoveDoc, isMobile }: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null)
  const skipped = d.step2Skipped

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
        <WatchShot watch={sw.watch} size={60} shadow="0 4px 10px rgba(26,20,16,0.18)" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: serif, fontSize: 19, fontWeight: 400, color: brand.colors.ink, lineHeight: 1.2 }}>{sw.watch.brand} {sw.watch.model}</div>
          <div style={{ fontFamily: sans, fontSize: 12, color: brand.colors.muted }}>
            {sw.watch.reference ? `Ref. ${sw.watch.reference} · ` : ''}piece {index + 1} of {total}
          </div>
        </div>
        <button type="button" onClick={() => onPatch({ step2Skipped: !skipped })} style={{
          fontFamily: sans, fontSize: 12.5, fontWeight: 500, color: skipped ? brand.colors.goldDeep : brand.colors.muted,
          background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 2px', flexShrink: 0,
        }}>{skipped ? 'Undo' : 'Skip piece'}</button>
      </div>

      {!skipped && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, opacity: 1 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <ToggleChip icon="box" label="Box" active={!!d.hasBox} onClick={() => onPatch({ hasBox: !d.hasBox })} />
            <ToggleChip icon="doc" label="Papers" active={!!d.hasPapers} onClick={() => onPatch({ hasPapers: !d.hasPapers })} />
          </div>

          <div>
            <Meta style={{ display: 'block', marginBottom: 8, fontSize: 11 }}>
              Warranty expiry <span style={{ textTransform: 'none', letterSpacing: 0, color: brand.colors.faint, fontWeight: 400 }}>· optional</span>
            </Meta>
            <input
              type="date"
              value={d.warrantyExpiresAt ?? ''}
              onChange={e => onPatch({ warrantyExpiresAt: e.target.value || null })}
              style={{ ...dateInput, maxWidth: isMobile ? '100%' : 260 }}
            />
          </div>

          <div>
            <input ref={fileRef} type="file" accept={ACCEPT} multiple
              onChange={e => { if (e.target.files) onAddFiles(e.target.files); if (fileRef.current) fileRef.current.value = '' }}
              style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }} />
            <div
              role="button" tabIndex={0}
              onClick={() => fileRef.current?.click()}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileRef.current?.click() } }}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); if (e.dataTransfer.files.length) onAddFiles(e.dataTransfer.files) }}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center', cursor: 'pointer',
                background: '#FCFAF6', border: `1.5px dashed ${brand.colors.borderLight}`, borderRadius: brand.radius.lg, padding: '22px 16px',
              }}>
              <span style={{ width: 38, height: 38, borderRadius: 9, background: brand.colors.paper, display: 'grid', placeItems: 'center', marginBottom: 2 }}>
                <Icon name="upload" size={18} color={brand.colors.goldDeep} />
              </span>
              <span style={{ fontFamily: sans, fontSize: 14, fontWeight: 500, color: brand.colors.ink }}>Drop receipts, warranty cards, service records</span>
              <span style={{ fontFamily: sans, fontSize: 12.5, color: brand.colors.muted }}>PDF or image, or click to choose.</span>
            </div>

            {d.docs.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, marginTop: 12 }}>
                {d.docs.map(doc => (
                  <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', background: brand.colors.white, border: `1px solid ${brand.colors.border}`, borderRadius: brand.radius.lg }}>
                    <DocTile type={doc.type} size={30} />
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontFamily: sans, fontSize: 11.5, color: brand.colors.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.file.name}</span>
                      <select value={doc.type} onChange={e => onSetDocType(doc.id, e.target.value as PhotoType)} aria-label={`Type for ${doc.file.name}`}
                        style={{ fontFamily: sans, fontSize: 11.5, color: brand.colors.ink, background: brand.colors.bg, border: `1px solid ${brand.colors.borderLight}`, borderRadius: brand.radius.sm, padding: '4px 6px', outline: 'none', width: '100%' }}>
                        {DOC_TYPES.map(dt => <option key={dt.id} value={dt.id}>{dt.label}</option>)}
                      </select>
                    </div>
                    <button type="button" onClick={() => onRemoveDoc(doc.id)} aria-label={`Remove ${doc.file.name}`} style={{
                      width: 24, height: 24, flexShrink: 0, borderRadius: brand.radius.sm, border: `1px solid ${brand.colors.border}`, background: brand.colors.white,
                      display: 'grid', placeItems: 'center', cursor: 'pointer', padding: 0,
                    }}>
                      <Icon name="close" size={11} color={brand.colors.muted} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ToggleChip({ icon, label, active, onClick }: { icon: 'box' | 'doc'; label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: sans, fontSize: 14, fontWeight: 500,
      padding: '9px 15px', borderRadius: brand.radius.pill, cursor: 'pointer', transition: `all ${brand.transition.fast}`,
      background: active ? brand.serviceStatus.ok.bg : 'transparent',
      color: active ? brand.serviceStatus.ok.fg : brand.colors.ink,
      border: `1px solid ${active ? brand.serviceStatus.ok.bg : brand.colors.borderLight}`,
    }}>
      <Icon name={active ? 'check' : icon} size={14} color={active ? brand.serviceStatus.ok.fg : brand.colors.muted} />{label}
    </button>
  )
}
