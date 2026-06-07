'use client'

// components/serviceRoom/LogServiceModal.tsx — the working "log / edit a
// service" form. 8 type pills, date, cost (USD), provider + quick-fill +
// affiliate link, notes, and document attachments tied to the record. Without
// a `record` prop it creates; with one it edits in place.

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { brand } from '@/lib/brand'
import { docTypeMeta, DOC_TYPES, formatCost, formatDate, serviceTypeMeta, SERVICE_TYPES, type ServiceWatch } from '@/lib/serviceRoom/derive'
import { useCollectionSession, type ServiceRecordInput } from '@/app/collection/CollectionSessionProvider'
import type { PhotoType, ServiceType, WatchServiceRecord } from '@/types/watch'
import { DocTile, Icon, Meta, TypeTag, WatchTile, bookingUrl, btnPrimary, btnSecondary, iconBtn } from '@/components/serviceRoom/primitives'

// Auto-guess the document type from the filename (editable). Falls back to
// service_record (the 4-type taxonomy has no appraisal/manual).
function guessDocType(name: string): PhotoType {
  const n = (name || '').toLowerCase()
  if (/receipt|invoice|bill/.test(n)) return 'receipt'
  if (/warrant|guarantee/.test(n)) return 'warranty_card'
  if (/box|paper|tag/.test(n)) return 'box_papers'
  return 'service_record'
}

type AttachDoc = { id: string; file: File; type: PhotoType }

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
  /** When set, the modal edits this existing record instead of creating one. */
  record?: WatchServiceRecord | null
  onClose: () => void
  /** Create: returns the new record (or null on failure) so attachments tie to it. */
  onSave: (sw: ServiceWatch, data: ServiceRecordInput) => Promise<WatchServiceRecord | null>
  /** Edit: persists changes to `record`. Returns false on failure. */
  onUpdate?: (sw: ServiceWatch, recordId: string, data: ServiceRecordInput) => Promise<boolean>
}

export function LogServiceModal({ sw, record, onClose, onSave, onUpdate }: Props) {
  const { uploadWatchPhotos, getWatchPhotos, deleteWatchPhoto } = useCollectionSession()
  const today = new Date().toISOString().slice(0, 10)
  const editing = !!record
  const [date, setDate] = useState(today)
  const [type, setType] = useState<ServiceType>('full')
  const [provider, setProvider] = useState('')
  const [cost, setCost] = useState('')
  const [notes, setNotes] = useState('')
  const [docs, setDocs] = useState<AttachDoc[]>([])
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set())
  const [attachError, setAttachError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const attachInputRef = useRef<HTMLInputElement | null>(null)

  const watchId = sw?.watch.id
  const recordId = record?.id

  // Attachments already tied to the record being edited (minus any cleared).
  const existing = editing && watchId
    ? getWatchPhotos(watchId).filter(p => p.serviceRecordId === recordId && !removedIds.has(p.id))
    : []

  // Re-seed when the target watch OR record changes: prefill from the record in
  // edit mode, otherwise reset to a blank "log" form.
  useEffect(() => {
    if (record) {
      setDate(record.serviceDate)
      setType(record.serviceType)
      setProvider(record.provider ?? '')
      setCost(record.cost != null ? String(record.cost / 100) : '')
      setNotes(record.notes ?? '')
    } else {
      setDate(today); setType('full'); setProvider(''); setCost(''); setNotes('')
    }
    setDocs([]); setRemovedIds(new Set()); setAttachError(null); setSaving(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchId, recordId])

  const addFiles = (list: FileList | File[]) => {
    const next: AttachDoc[] = Array.from(list).map((file, i) => ({
      id: `doc-${Date.now()}-${i}`, file, type: guessDocType(file.name),
    }))
    setDocs(d => [...d, ...next])
  }
  const setDocType = (id: string, type: PhotoType) => setDocs(d => d.map(x => x.id === id ? { ...x, type } : x))
  const removeDoc = (id: string) => setDocs(d => d.filter(x => x.id !== id))

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
    const data: ServiceRecordInput = {
      serviceDate: date,
      serviceType: type,
      provider: provider.trim() || undefined,
      cost: costCents ?? null,
      notes: notes.trim() || undefined,
    }

    // Resolve the record id new attachments hang off: the edited record, or a
    // freshly created one.
    let targetId: string
    if (editing && record && onUpdate) {
      const ok = await onUpdate(sw, record.id, data)
      if (!ok) { setSaving(false); return }  // parent surfaced the error
      targetId = record.id
      if (removedIds.size > 0) {
        try { for (const id of removedIds) await deleteWatchPhoto(sw.watch.id, id) }
        catch { setAttachError('Saved, but an attachment could not be removed.'); setSaving(false); return }
      }
    } else {
      const rec = await onSave(sw, data)
      if (!rec) { setSaving(false); return }  // parent surfaced the error
      targetId = rec.id
    }

    if (docs.length > 0) {
      try {
        // Group by chosen doc type → one upload per type, all tied to the record.
        const byType = new Map<PhotoType, File[]>()
        for (const d of docs) {
          const list = byType.get(d.type) ?? []
          list.push(d.file)
          byType.set(d.type, list)
        }
        for (const [docType, groupFiles] of byType) {
          await uploadWatchPhotos(sw.watch.id, groupFiles, docType, targetId)
        }
      } catch {
        // Record is saved; keep the modal open so the user can retry the files.
        setAttachError(`${editing ? 'Saved' : 'Service saved'}, but the attachments failed to upload.`)
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
      <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`${editing ? 'Edit service' : 'Log a service'} for ${sw.watch.brand} ${sw.watch.model}`} style={{
        width: 'min(540px, 100%)', maxHeight: '92vh', overflowY: 'auto', background: brand.colors.slot,
        border: `1px solid ${brand.colors.borderMid}`, borderRadius: 16, boxShadow: '0 24px 64px rgba(26,20,16,0.28)',
      }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '20px 24px', borderBottom: `1px solid ${brand.colors.border}` }}>
          <WatchTile watch={sw.watch} size={48} radius={brand.radius.lg} pad={0.14} />
          <div style={{ flex: 1 }}>
            <Meta style={{ color: brand.colors.goldDeep }}>{editing ? 'Edit service' : 'Log a service'}</Meta>
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
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, marginTop: 10 }}>
                <Icon name="spark" size={13} color={brand.colors.gold} style={{ flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontFamily: sans, fontSize: 12, color: brand.colors.goldDeep, lineHeight: 1.45 }}>Resets the service clock. Next due recalculates to {sw.intervalYears} years out.</span>
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
                <button key={p} type="button" onClick={() => setProvider(p)} style={{ fontFamily: sans, fontSize: 12, color: brand.colors.muted, background: 'transparent', border: `1px solid ${brand.colors.border}`, borderRadius: brand.radius.pill, padding: '4px 10px', cursor: 'pointer' }}>{p}</button>
              ))}
              <a href={bookingUrl(sw.watch.brand)} target="_blank" rel="noopener noreferrer sponsored" style={{ fontFamily: sans, fontSize: 12, fontWeight: 600, color: brand.colors.goldDeep, marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4 }}>Find a {sw.watch.brand} center ↗</a>
            </div>
          </Field>

          <Field label="Notes">
            <textarea value={notes} maxLength={500} placeholder="Amplitude, parts replaced, who handled it…" onChange={e => setNotes(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} />
          </Field>

          <Field label="Attach documents">
            <input
              ref={attachInputRef}
              type="file"
              accept={ATTACH_ACCEPT}
              multiple
              onChange={e => { if (e.target.files) addFiles(e.target.files); if (attachInputRef.current) attachInputRef.current.value = '' }}
              style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
            />
            <button type="button" onClick={() => attachInputRef.current?.click()} style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, minHeight: 48,
              fontFamily: sans, fontSize: 14, fontWeight: 500, color: brand.colors.muted, cursor: 'pointer',
              background: brand.colors.bg, border: `1.5px dashed ${brand.colors.borderLight}`, borderRadius: brand.radius.lg, padding: '14px 16px',
            }}>
              <Icon name="download" size={15} color={brand.colors.gold} style={{ transform: 'rotate(180deg)' }} />
              Upload receipt, warranty card or service record
            </button>
            <div style={{ fontFamily: sans, fontSize: 12, color: brand.colors.muted, marginTop: 7 }}>
              Keep proof of work with the record: receipts, certificates, before/after photos.
            </div>

            {existing.length > 0 && (
              <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
                {existing.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 11px', background: brand.colors.white, border: `1px solid ${brand.colors.border}`, borderRadius: brand.radius.lg }}>
                    {(!p.mimeType || p.mimeType.startsWith('image/'))
                      ? (/* eslint-disable-next-line @next/next/no-img-element */ <img src={p.photoUrl} alt="" style={{ width: 30, height: 30, borderRadius: 5, objectFit: 'cover', flexShrink: 0 }} />)
                      : <DocTile type={p.photoType ?? 'service_record'} size={30} />}
                    <span style={{ flex: 1, minWidth: 0, fontFamily: sans, fontSize: 14, fontWeight: 500, color: brand.colors.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.caption?.trim() || docTypeMeta(p.photoType ?? '').label}</span>
                    <span style={{ fontFamily: sans, fontSize: 11, color: brand.colors.muted, flexShrink: 0 }}>On file</span>
                    <button type="button" onClick={() => setRemovedIds(s => new Set(s).add(p.id))} aria-label="Remove attachment" title="Remove" style={{ ...iconBtn, width: 26, height: 26, flexShrink: 0 }}>
                      <Icon name="close" size={12} color={brand.colors.muted} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {docs.length > 0 && (
              <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
                {docs.map(d => (
                  <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 11px', background: brand.colors.white, border: `1px solid ${brand.colors.border}`, borderRadius: brand.radius.lg }}>
                    <DocTile type={d.type} size={30} />
                    <span style={{ flex: 1, minWidth: 0, fontFamily: sans, fontSize: 14, fontWeight: 500, color: brand.colors.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.file.name}</span>
                    <select
                      value={d.type}
                      onChange={e => setDocType(d.id, e.target.value as PhotoType)}
                      aria-label={`Document type for ${d.file.name}`}
                      style={{ fontFamily: sans, fontSize: 11, color: brand.colors.ink, background: brand.colors.bg, border: `1px solid ${brand.colors.borderLight}`, borderRadius: brand.radius.sm, padding: '5px 7px', outline: 'none', flexShrink: 0, maxWidth: 132 }}
                    >
                      {DOC_TYPES.map(dt => <option key={dt.id} value={dt.id}>{dt.label}</option>)}
                    </select>
                    <button type="button" onClick={() => removeDoc(d.id)} aria-label={`Remove ${d.file.name}`} title="Remove" style={{ ...iconBtn, width: 26, height: 26, flexShrink: 0 }}>
                      <Icon name="close" size={12} color={brand.colors.muted} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {attachError && (
              <div style={{ marginTop: 8, fontFamily: sans, fontSize: 12, color: brand.serviceStatus.due.fg }}>{attachError}</div>
            )}
          </Field>
        </div>

        {/* footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '16px 24px', borderTop: `1px solid ${brand.colors.border}`, position: 'sticky', bottom: 0, background: brand.colors.slot }}>
          <span style={{ fontFamily: sans, fontSize: 12, color: brand.colors.muted }}>
            {t.label} · {formatDate(date)}{costCents ? ` · ${formatCost(costCents)}` : ''}{(existing.length + docs.length) ? ` · ${existing.length + docs.length} doc${existing.length + docs.length > 1 ? 's' : ''}` : ''}
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={onClose} style={{ ...btnSecondary, padding: '10px 18px' }}>Cancel</button>
            <button type="button" onClick={submit} disabled={saving} style={{ ...btnPrimary, padding: '10px 22px', opacity: saving ? 0.6 : 1 }}>
              <Icon name="check" size={13} color={brand.colors.slot} />{saving ? 'Saving…' : editing ? 'Save changes' : 'Save record'}
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
