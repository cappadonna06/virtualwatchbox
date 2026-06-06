'use client'

// components/serviceRoom/WatchDossier.tsx
// The single rich "service dossier" surface for an owned watch: ownership
// strip + Papers & Provenance (incl. PDFs) + Service History timeline with
// per-record attachments + next-due estimate + running total + Export.
// Rendered as the "Service Dossier" tab on /collection/watch/[id].

import { useMemo, useState } from 'react'
import { brand } from '@/lib/brand'
import { useCollectionSession, type ServiceRecordInput } from '@/app/collection/CollectionSessionProvider'
import {
  ACQ_LABEL, buildServiceWatch, docTypeMeta, formatCost, formatDate, formatMonthYear,
  lastFullService, lifetimeCostCents, nextDueDate, serviceStatus, serviceTypeMeta, warrantyStatus,
  type ServiceWatch,
} from '@/lib/serviceRoom/derive'
import type { ResolvedOwnedWatch, ServiceIntervalYears, UserWatchPhoto, WatchServiceRecord } from '@/types/watch'
import { DocTile, Icon } from '@/components/serviceRoom/primitives'
import { LogServiceModal } from '@/components/serviceRoom/LogServiceModal'
import { downloadDossier } from '@/lib/serviceRoom/dossier'
import WatchPhotoLightbox from '@/components/collection/WatchPhotoLightbox'

const sans = brand.font.sans
const serif = brand.font.serif
const INTERVALS: ServiceIntervalYears[] = [3, 5, 7, 10]
const isImagePhoto = (p: UserWatchPhoto) => !p.mimeType || p.mimeType.startsWith('image/')

function SectionTitle({ children, count, action }: { children: React.ReactNode; count?: number; action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16, paddingBottom: 12, borderBottom: `1px solid ${brand.colors.borderLight}` }}>
      <h2 style={{ fontFamily: serif, fontSize: 22, fontWeight: 400, color: brand.colors.ink, margin: 0 }}>{children}</h2>
      {count != null && <span style={{ fontFamily: sans, fontSize: 12, color: brand.colors.muted }}>{count} on file</span>}
      {action && <span style={{ marginLeft: 'auto' }}>{action}</span>}
    </div>
  )
}

export default function WatchDossier({ watch }: { watch: ResolvedOwnedWatch }) {
  const {
    getWatchServiceRecords, getWatchPhotos, getWatchDocuments,
    logServiceRecord, deleteServiceRecord, setWatchInterval, showToast,
  } = useCollectionSession()

  const [now] = useState(() => new Date())
  const [logging, setLogging] = useState(false)
  const [lightbox, setLightbox] = useState<{ list: UserWatchPhoto[]; startId: string } | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const records = getWatchServiceRecords(watch.id)
  const photos = getWatchPhotos(watch.id)
  const documents = getWatchDocuments(watch.id)
  const sw: ServiceWatch = useMemo(() => buildServiceWatch(watch, records, photos), [watch, records, photos])

  // Returns the created record so the modal can attach files to it.
  const onSave = async (target: ServiceWatch, data: ServiceRecordInput): Promise<WatchServiceRecord | null> => {
    try {
      const rec = await logServiceRecord(target.watch.id, data)
      showToast('Service logged.')
      return rec
    } catch {
      showToast('Could not save the service record')
      return null
    }
  }

  const onDelete = async (recordId: string) => {
    try { await deleteServiceRecord(watch.id, recordId); showToast('Service record removed') }
    catch { showToast('Could not remove the record') }
  }

  const ws = warrantyStatus(sw, now)
  const lf = lastFullService(sw)
  const sorted = [...records].sort((a, b) => (a.serviceDate < b.serviceDate ? 1 : a.serviceDate > b.serviceDate ? -1 : 0))
  const totalCents = lifetimeCostCents(sw)
  const due = nextDueDate(sw)
  const overdue = due.getTime() < now.getTime()

  const ownershipChips: { ok: boolean; label: string }[] = [
    { ok: watch.hasBox === true, label: watch.hasBox ? 'Box' : 'No box' },
    { ok: watch.hasPapers === true, label: watch.hasPapers ? 'Papers' : 'No papers' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
      {/* ── Ownership strip ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        {ownershipChips.map((c, i) => (
          <span key={i} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: sans, fontSize: 11, fontWeight: 500,
            padding: '5px 11px', borderRadius: brand.radius.pill,
            background: c.ok ? brand.ownershipChip.presentBg : brand.ownershipChip.absentBg,
            color: c.ok ? brand.serviceStatus.ok.fg : brand.colors.muted,
            border: `1px solid ${c.ok ? brand.ownershipChip.presentBorder : brand.colors.border}`,
          }}>
            <Icon name={c.ok ? 'check' : 'doc'} size={12} color={c.ok ? brand.serviceStatus.ok.fg : brand.colors.muted} />{c.label}
          </span>
        ))}
        {watch.acquisitionMethod && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: sans, fontSize: 11, fontWeight: 500, padding: '5px 11px', borderRadius: brand.radius.pill, background: brand.ownershipChip.absentBg, color: brand.colors.ink, border: `1px solid ${brand.colors.border}` }}>
            <Icon name="receipt" size={12} color={brand.colors.muted} />{ACQ_LABEL[watch.acquisitionMethod]}
          </span>
        )}
        {ws && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: sans, fontSize: 11, fontWeight: 500, padding: '5px 11px', borderRadius: brand.radius.pill, background: ws.bg, color: ws.fg }}>
            <Icon name="shield" size={11} color={ws.fg} />
            {ws.key === 'expired' ? 'Warranty expired' : `Warranty to ${formatMonthYear(ws.date)}`}
          </span>
        )}
      </div>

      {/* ── Papers & Provenance ─────────────────────────────────────────── */}
      {documents.length > 0 && (
        <section>
          <SectionTitle count={documents.length}>Papers &amp; Provenance</SectionTitle>
          <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 6 }}>
            {documents.map(d => (
              <DocCard key={d.id} doc={d} onOpen={() => setLightbox({ list: documents, startId: d.id })} />
            ))}
          </div>
          <div style={{ marginTop: 10, fontFamily: sans, fontSize: 12, color: brand.colors.muted }}>Tap to view full size</div>
        </section>
      )}

      {/* ── Service History ─────────────────────────────────────────────── */}
      <section>
        <SectionTitle
          count={records.length || undefined}
          action={records.length > 0 ? (
            <button type="button" onClick={() => downloadDossier([sw], `${watch.brand}-${watch.model}-dossier`, now)} style={secondaryBtn}>
              <Icon name="download" size={12} color={brand.colors.ink} />Export
            </button>
          ) : undefined}
        >Service History</SectionTitle>

        {records.length === 0 ? (
          <div style={{
            background: brand.colors.slot, border: `1px dashed ${brand.colors.borderLight}`, borderRadius: brand.radius.lg,
            padding: '28px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center',
          }}>
            <div style={{ fontFamily: serif, fontSize: 18, color: brand.colors.ink }}>No service history yet</div>
            <div style={{ fontFamily: sans, fontSize: 14, color: brand.colors.muted }}>Track services, receipts, and what&apos;s next.</div>
            <button type="button" onClick={() => setLogging(true)} style={primaryBtn}>+ Log a service</button>
          </div>
        ) : (
          <>
            {lf && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, padding: '12px 16px', borderRadius: brand.radius.md,
                background: overdue ? brand.serviceStatus.due.bg : brand.colors.slot,
                border: `1px solid ${overdue ? brand.serviceStatus.due.fg + '40' : brand.colors.borderLight}`,
                color: overdue ? brand.serviceStatus.due.fg : brand.colors.mutedDark,
              }}>
                <Icon name={overdue ? 'clock' : 'calendar'} size={15} color={overdue ? brand.serviceStatus.due.fg : brand.colors.muted} />
                <span style={{ fontFamily: sans, fontSize: 14, fontWeight: 500 }}>
                  Next full service: ~{formatMonthYear(due)}{overdue ? ' · overdue' : ''}
                </span>
                <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontFamily: sans, fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: brand.colors.muted }}>Every</span>
                  <span style={{ display: 'inline-flex', border: `1px solid ${brand.colors.borderLight}`, borderRadius: brand.radius.sm, overflow: 'hidden', background: brand.colors.white }}>
                    {INTERVALS.map(n => (
                      <button key={n} type="button" onClick={() => void setWatchInterval(watch.id, n)} style={{
                        fontFamily: sans, fontSize: 11, fontWeight: 600, padding: '4px 8px', border: 'none', cursor: 'pointer',
                        background: sw.intervalYears === n ? brand.colors.ink : 'transparent', color: sw.intervalYears === n ? brand.colors.slot : brand.colors.muted,
                      }}>{n}y</button>
                    ))}
                  </span>
                </span>
              </div>
            )}

            <div style={{ position: 'relative' }}>
              {sorted.map((r, i) => {
                const t = serviceTypeMeta(r.serviceType)
                const last = i === sorted.length - 1
                const expanded = expandedId === r.id
                const attachments = photos.filter(p => p.serviceRecordId === r.id)
                return (
                  <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '20px 1fr', gap: 14, paddingBottom: last ? 0 : 16 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ width: 13, height: 13, borderRadius: 13, border: `2px solid ${t.resets ? brand.colors.gold : brand.colors.borderLight}`, background: t.resets ? brand.colors.gold : brand.colors.white, marginTop: 3, flexShrink: 0 }} />
                      {!last && <span style={{ width: 1.5, flex: 1, background: brand.colors.border, marginTop: 4 }} />}
                    </div>
                    <div>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setExpandedId(expanded ? null : r.id)}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedId(expanded ? null : r.id) } }}
                        style={{ cursor: 'pointer' }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 4 }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: sans, fontSize: 14, fontWeight: 600, color: brand.colors.ink }}>
                            <span style={{ color: t.resets ? brand.colors.goldDeep : brand.colors.muted, fontSize: 13 }}>{t.glyph}</span>{t.label}
                          </span>
                          <span style={{ fontFamily: sans, fontSize: 12, color: brand.colors.muted, whiteSpace: 'nowrap', flexShrink: 0 }}>{formatDate(r.serviceDate)}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {r.provider && <span style={{ fontFamily: sans, fontSize: 12, color: brand.colors.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.provider}</span>}
                          {r.cost ? <span style={{ fontFamily: sans, fontSize: 14, fontWeight: 700, color: brand.colors.ink, marginLeft: 'auto', whiteSpace: 'nowrap' }}>{formatCost(r.cost)}</span> : <span style={{ fontFamily: sans, fontSize: 12, color: brand.serviceStatus.ok.fg, marginLeft: 'auto' }}>No charge</span>}
                        </div>
                        {r.notes && (
                          <p style={{ fontFamily: sans, fontSize: 12, color: brand.colors.ink, opacity: 0.75, lineHeight: 1.5, margin: '6px 0 0', ...(expanded ? {} : { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }) }}>{r.notes}</p>
                        )}
                      </div>

                      {/* linked attachments */}
                      {attachments.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                          {attachments.map(a => (
                            <button key={a.id} type="button" onClick={() => setLightbox({ list: photos, startId: a.id })} title={a.caption || docTypeMeta(a.photoType ?? '').label} style={{ padding: 0, border: `1px solid ${brand.colors.border}`, borderRadius: brand.radius.sm, background: brand.colors.slot, cursor: 'pointer', width: 30, height: 30, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {isImagePhoto(a)
                                ? (/* eslint-disable-next-line @next/next/no-img-element */ <img src={a.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />)
                                : <DocTile type={a.photoType ?? 'service_record'} size={16} />}
                            </button>
                          ))}
                        </div>
                      )}

                      {expanded && (
                        <div style={{ marginTop: 8 }}>
                          <button type="button" onClick={() => void onDelete(r.id)} style={{ fontFamily: sans, fontSize: 12, color: brand.serviceStatus.overdue.fg, cursor: 'pointer', letterSpacing: '0.04em', background: 'none', border: 'none', padding: 0 }}>Remove record</button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 20, paddingTop: 16, borderTop: `1px solid ${brand.colors.borderLight}`, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: sans, fontSize: 14, color: brand.colors.ink }}>
                Total service cost: <span style={{ fontWeight: 700, color: brand.colors.goldDeep }}>{formatCost(totalCents)}</span>
              </span>
              <button type="button" onClick={() => setLogging(true)} style={primaryBtn}>+ Log a service</button>
            </div>
          </>
        )}
      </section>

      {logging && <LogServiceModal sw={sw} onClose={() => setLogging(false)} onSave={onSave} />}
      {lightbox && lightbox.list.length > 0 && (
        <WatchPhotoLightbox photos={lightbox.list} startId={lightbox.startId} ownedWatchId={watch.id} onClose={() => setLightbox(null)} />
      )}
    </div>
  )
}

function DocCard({ doc, onOpen }: { doc: UserWatchPhoto; onOpen: () => void }) {
  const type = doc.photoType as string
  const label = doc.caption?.trim() || docTypeMeta(type).label
  return (
    <button type="button" onClick={onOpen} style={{ flexShrink: 0, width: 92, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'center' }}>
      <div style={{ width: 92, height: 92, borderRadius: brand.radius.md, overflow: 'hidden', border: `1px solid ${brand.colors.border}`, background: brand.colors.slot, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        {isImagePhoto(doc)
          ? (/* eslint-disable-next-line @next/next/no-img-element */ <img src={doc.photoUrl} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />)
          : <DocTile type={type} size={44} />}
        <span style={{ position: 'absolute', top: 5, left: 5 }}><DocTile type={type} size={20} /></span>
      </div>
      <div style={{ marginTop: 6, fontFamily: sans, fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: brand.colors.goldDeep, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{docTypeMeta(type).label}</div>
    </button>
  )
}

const primaryBtn: React.CSSProperties = {
  fontFamily: sans, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
  padding: '9px 16px', background: brand.colors.ink, color: brand.colors.slot,
  border: 'none', borderRadius: brand.radius.btn, cursor: 'pointer',
}
const secondaryBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: sans, fontSize: 11, fontWeight: 500, letterSpacing: '0.04em',
  padding: '7px 12px', background: 'transparent', color: brand.colors.ink,
  border: `1px solid ${brand.colors.borderLight}`, borderRadius: brand.radius.btn, cursor: 'pointer',
}
