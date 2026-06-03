'use client'

// components/serviceRoom/LogServiceModal.tsx — the working "log a service"
// form. 8 type pills, date, cost (USD), provider + quick-fill + affiliate
// link, notes. Saving inserts a record and live-updates the hub.

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { brand } from '@/lib/brand'
import { formatCost, formatDate, PHOTO_TYPE_GROUPS, PHOTO_TYPE_LABELS, serviceTypeMeta, SERVICE_TYPES, type ServiceWatch } from '@/lib/serviceRoom/derive'
import { useCollectionSession, type ServiceRecordInput } from '@/app/collection/CollectionSessionProvider'
import type { PhotoType, ServiceType, WatchServiceRecord } from '@/types/watch'
import { Icon, Meta, TypeTag, WatchTile, bookingUrl, btnPrimary, btnSecondary, iconBtn } from '@/components/serviceRoom/primitives'

const ATTACH_ACCEPT = 'image/jpeg,image/png,image/heic,image/webp,image/*,application/pdf'

const sans = brand.font.sans
const serif = brand.font.serif

const SUGGESTED_PROVIDERS = ['Brand Boutique Service', 'Authorized Service Center', 'Independent Watchmaker']

const inputStyle: CSSProperties = {
  width: '100%', fontFamily: sans, fontSize: 16, color: brand.colors.ink, background: brand.colors.white,
  border: `1px solid ${brand.colors.borderLight}`, borderRadius: brand.radius.md, padding: '10px 13px', outline: 'none',
}

type Props = {
  sw: ServiceWatch | null
  onClose: () => void
  /** Returns the created record (or null on failure) so attachments can be tied to it. */
  onSave: (sw: ServiceWatch, data: ServiceRecordInput) => Promise<WatchServiceRecord | null>
}

export function LogServiceModal({ sw, onClose, onSave }: Props) {
  const { uploadWatchPhotos } = useCollectionSession()
  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)
  const [type, setType] = useState<ServiceType>('full')
  const [provider, setProvider] = useState('')
  const [cost, setCost] = useState('')
  const [notes, setNotes] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [attachType, setAttachType] = useState<PhotoType>('service_record')
  const [attachError, setAttachError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const attachInputRef = useRef<HTMLInputElement | null>(null)

  const watchId = sw?.watch.id

  useEffect(() => {
    setDate(today); setType('full'); setProvider(''); setCost(''); setNotes('')
    setFiles([]); setAttachType('service_record'); setAttachError(null); setSaving(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchId])

  useEffect(() => {
    if (!sw) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sw, onClose])

  if (!sw) return null
  const t = serviceTypeMeta(type)
  const costNum = parseFloat(cost)
  const costCents = Number.isFinite(costNum) && costNum > 0 ? Math.round(costNum * 100) : undefined

  const submit = async () => {
    if (saving) return
    setSaving(true)
    setAttachError(null)
    const rec = await onSave(sw, {
      serviceDate: date,
      serviceType: type,
      provider: provider.trim() || undefined,
      cost: costCents ?? null,
      notes: notes.trim() || undefined,
    })
    if (!rec) { setSaving(false); return }  // parent surfaced the error
    if (files.length > 0) {
      try {
        await uploadWatchPhotos(sw.watch.id, files, attachType, rec.id)
      } catch {
        // Record is saved; keep the modal open so the user can retry the files.
        setAttachError('Service saved, but the attachments failed to upload.')
        setSaving(false)
        return
      }
    }
    setSaving(false)
    onClose()
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(26,20,16,0.4)', backdropFilter: 'blur(3px)',
      zIndex: 310, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Log a service for ${sw.watch.brand} ${sw.watch.model}`} style={{
        width: 'min(540px, 100%)', maxHeight: '92vh', overflowY: 'auto', background: brand.colors.slot,
        border: `1px solid ${brand.colors.borderMid}`, borderRadius: 16, boxShadow: '0 24px 64px rgba(26,20,16,0.28)',
      }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '20px 24px', borderBottom: `1px solid ${brand.colors.border}` }}>
          <WatchTile watch={sw.watch} size={48} radius={brand.radius.lg} pad={0.14} />
          <div style={{ flex: 1 }}>
            <Meta style={{ color: brand.colors.gold }}>Log a service</Meta>
            <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 400, color: brand.colors.ink, lineHeight: 1.05 }}>{sw.watch.brand} {sw.watch.model}</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ ...iconBtn, width: 30, height: 30 }}>
            <Icon name="close" size={14} color={brand.colors.muted} />
          </button>
        </div>

        {/* body */}
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 22 }}>
          <Field label="Service type">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {SERVICE_TYPES.map(s => (
                <TypeTag key={s.id} type={s.id} active={type === s.id} onClick={() => setType(s.id)} />
              ))}
            </div>
            {t.resets && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 10, fontFamily: sans, fontSize: 11.5, color: brand.colors.gold }}>
                <Icon name="spark" size={13} color={brand.colors.gold} />Resets the service clock — next due recalculates to {sw.intervalYears} years out.
              </div>
            )}
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Date">
              <input type="date" value={date} max={today} onChange={e => setDate(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Cost (USD)">
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontFamily: sans, fontSize: 14, color: brand.colors.muted }}>$</span>
                <input type="number" min="0" step="10" value={cost} placeholder="0" onChange={e => setCost(e.target.value)} style={{ ...inputStyle, paddingLeft: 26 }} />
              </div>
            </Field>
          </div>

          <Field label="Service provider">
            <input type="text" value={provider} placeholder="Rolex Service Center, local watchmaker, etc." onChange={e => setProvider(e.target.value)} style={inputStyle} />
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 7, marginTop: 9 }}>
              {SUGGESTED_PROVIDERS.map(p => (
                <button key={p} type="button" onClick={() => setProvider(p)} style={{ fontFamily: sans, fontSize: 10.5, color: brand.colors.muted, background: 'transparent', border: `1px solid ${brand.colors.border}`, borderRadius: brand.radius.pill, padding: '4px 10px', cursor: 'pointer' }}>{p}</button>
              ))}
              <a href={bookingUrl(sw.watch.brand)} target="_blank" rel="noopener noreferrer sponsored" style={{ fontFamily: sans, fontSize: 10.5, fontWeight: 600, color: brand.colors.gold, marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4 }}>Find a {sw.watch.brand} center ↗</a>
            </div>
          </Field>

          <Field label="Notes">
            <textarea value={notes} maxLength={500} placeholder="Amplitude, parts replaced, who handled it…" onChange={e => setNotes(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} />
          </Field>

          <Field label="Attachments">
            <input
              ref={attachInputRef}
              type="file"
              accept={ATTACH_ACCEPT}
              multiple
              onChange={e => { if (e.target.files) setFiles(prev => [...prev, ...Array.from(e.target.files!)]); if (attachInputRef.current) attachInputRef.current.value = '' }}
              style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
            />
            <button type="button" onClick={() => attachInputRef.current?.click()} style={{ ...btnSecondary, padding: '8px 14px' }}>
              <Icon name="doc" size={13} color={brand.colors.ink} />Add receipt / file
            </button>
            {files.length > 0 && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                  {files.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: sans, fontSize: 11.5, color: brand.colors.ink }}>
                      <Icon name="doc" size={13} color={brand.colors.muted} />
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                      <button type="button" onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))} aria-label={`Remove ${f.name}`} style={{ background: 'none', border: 'none', cursor: 'pointer', color: brand.colors.muted, padding: 2 }}>
                        <Icon name="close" size={12} color={brand.colors.muted} />
                      </button>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 10 }}>
                  <Meta style={{ display: 'block', marginBottom: 6 }}>Tag these as</Meta>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {PHOTO_TYPE_GROUPS.flatMap(g => g.types).map(pt => {
                      const active = attachType === pt
                      return (
                        <button key={pt} type="button" onClick={() => setAttachType(pt)} style={{
                          fontFamily: sans, fontSize: 11, fontWeight: 500, padding: '5px 11px', borderRadius: brand.radius.pill, cursor: 'pointer',
                          background: active ? brand.colors.ink : brand.colors.white, color: active ? brand.colors.slot : brand.colors.ink,
                          border: `1px solid ${active ? brand.colors.ink : brand.colors.borderLight}`,
                        }}>{PHOTO_TYPE_LABELS[pt]}</button>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
            {attachError && (
              <div style={{ marginTop: 8, fontFamily: sans, fontSize: 11, color: brand.serviceStatus.due.fg }}>{attachError}</div>
            )}
          </Field>
        </div>

        {/* footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '16px 24px', borderTop: `1px solid ${brand.colors.border}`, position: 'sticky', bottom: 0, background: brand.colors.slot }}>
          <span style={{ fontFamily: sans, fontSize: 11, color: brand.colors.muted }}>
            {t.label} · {formatDate(date)}{costCents ? ` · ${formatCost(costCents)}` : ''}
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={onClose} style={{ ...btnSecondary, padding: '10px 18px' }}>Cancel</button>
            <button type="button" onClick={submit} disabled={saving} style={{ ...btnPrimary, padding: '10px 22px', opacity: saving ? 0.6 : 1 }}>
              <Icon name="check" size={13} color={brand.colors.slot} />{saving ? 'Saving…' : 'Save record'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Meta style={{ display: 'block', marginBottom: 9 }}>{label}</Meta>
      {children}
    </div>
  )
}
