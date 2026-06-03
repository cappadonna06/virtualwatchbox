'use client'

// components/collection/WatchServiceSection.tsx
// Owned-watch detail-page sections: "Papers & Provenance" (document-type
// photos) + "Service History" (timeline, next-due estimate, running total).
// Reuses the Service Room derived logic, primitives, and Log-a-Service modal.

import { useMemo, useState } from 'react'
import { brand } from '@/lib/brand'
import { useCollectionSession, type ServiceRecordInput } from '@/app/collection/CollectionSessionProvider'
import {
  buildServiceWatch, docTypeMeta, formatCost, formatDate, formatMonthYear,
  lastFullService, lifetimeCostCents, nextDueDate, serviceStatus, serviceTypeMeta,
  type ServiceWatch,
} from '@/lib/serviceRoom/derive'
import type { ResolvedOwnedWatch, ServiceIntervalYears, UserWatchPhoto } from '@/types/watch'
import { DocTile, Icon } from '@/components/serviceRoom/primitives'
import { LogServiceModal } from '@/components/serviceRoom/LogServiceModal'
import WatchPhotoLightbox from './WatchPhotoLightbox'

const sans = brand.font.sans
const serif = brand.font.serif
const INTERVALS: ServiceIntervalYears[] = [3, 5, 7, 10]

function SectionTitle({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16, paddingBottom: 12, borderBottom: `1px solid ${brand.colors.borderLight}` }}>
      <h2 style={{ fontFamily: serif, fontSize: 22, fontWeight: 400, color: brand.colors.ink, margin: 0 }}>{children}</h2>
      {count != null && <span style={{ fontFamily: sans, fontSize: 11, color: brand.colors.muted }}>{count} on file</span>}
    </div>
  )
}

export default function WatchServiceSection({ watch }: { watch: ResolvedOwnedWatch }) {
  const {
    getWatchServiceRecords, getWatchPhotos, getWatchDocuments,
    logServiceRecord, deleteServiceRecord, setWatchInterval, showToast,
  } = useCollectionSession()

  const [now] = useState(() => new Date())
  const [logging, setLogging] = useState(false)
  const [docLightboxStart, setDocLightboxStart] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const records = getWatchServiceRecords(watch.id)
  const photos = getWatchPhotos(watch.id)
  const documents = getWatchDocuments(watch.id)
  const sw: ServiceWatch = useMemo(() => buildServiceWatch(watch, records, photos), [watch, records, photos])

  const onSave = async (target: ServiceWatch, data: ServiceRecordInput) => {
    try {
      await logServiceRecord(target.watch.id, data)
      setLogging(false)
      showToast('Service logged.')
    } catch {
      showToast('Could not save the service record')
    }
  }

  const onDelete = async (recordId: string) => {
    try { await deleteServiceRecord(watch.id, recordId); showToast('Service record removed') }
    catch { showToast('Could not remove the record') }
  }

  const lf = lastFullService(sw)
  const sorted = [...records].sort((a, b) => (a.serviceDate < b.serviceDate ? 1 : a.serviceDate > b.serviceDate ? -1 : 0))
  const totalCents = lifetimeCostCents(sw)
  const due = nextDueDate(sw)
  const overdue = due.getTime() < now.getTime()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
      {/* ── Papers & Provenance ─────────────────────────────────────────── */}
      {documents.length > 0 && (
        <section>
          <SectionTitle count={documents.length}>Papers &amp; Provenance</SectionTitle>
          <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 6 }}>
            {documents.map(d => (
              <DocCard key={d.id} doc={d} onOpen={() => setDocLightboxStart(d.id)} />
            ))}
          </div>
          <div style={{ marginTop: 10, fontFamily: sans, fontSize: 11, color: brand.colors.muted }}>Tap to view full size</div>
        </section>
      )}

      {/* ── Service History ─────────────────────────────────────────────── */}
      <section>
        <SectionTitle count={records.length || undefined}>Service History</SectionTitle>

        {records.length === 0 ? (
          <div style={{
            background: brand.colors.slot, border: `1px dashed ${brand.colors.borderLight}`, borderRadius: brand.radius.lg,
            padding: '28px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center',
          }}>
            <div style={{ fontFamily: serif, fontSize: 18, color: brand.colors.ink }}>No service history yet</div>
            <div style={{ fontFamily: sans, fontSize: 12, color: brand.colors.muted }}>Track services, receipts, and what&apos;s next.</div>
            <button type="button" onClick={() => setLogging(true)} style={primaryBtn}>+ Log a service</button>
          </div>
        ) : (
          <>
            {/* next-due banner (when a clock-resetting service exists) */}
            {lf && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, padding: '12px 16px', borderRadius: brand.radius.md,
                background: overdue ? brand.serviceStatus.due.bg : brand.colors.slot,
                border: `1px solid ${overdue ? brand.serviceStatus.due.fg + '40' : brand.colors.borderLight}`,
                color: overdue ? brand.serviceStatus.due.fg : brand.colors.mutedDark,
              }}>
                <Icon name={overdue ? 'clock' : 'calendar'} size={15} color={overdue ? brand.serviceStatus.due.fg : brand.colors.muted} />
                <span style={{ fontFamily: sans, fontSize: 12.5, fontWeight: 500 }}>
                  Next full service: ~{formatMonthYear(due)}{overdue ? ' · overdue' : ''}
                </span>
                <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontFamily: sans, fontSize: 9, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: brand.colors.muted }}>Every</span>
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

            {/* timeline */}
            <div style={{ position: 'relative' }}>
              {sorted.map((r, i) => {
                const t = serviceTypeMeta(r.serviceType)
                const last = i === sorted.length - 1
                const expanded = expandedId === r.id
                return (
                  <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '20px 1fr', gap: 14, paddingBottom: last ? 0 : 16 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ width: 13, height: 13, borderRadius: 13, border: `2px solid ${t.resets ? brand.colors.gold : brand.colors.borderLight}`, background: t.resets ? brand.colors.gold : brand.colors.white, marginTop: 3, flexShrink: 0 }} />
                      {!last && <span style={{ width: 1.5, flex: 1, background: brand.colors.border, marginTop: 4 }} />}
                    </div>
                    <button type="button" onClick={() => setExpandedId(expanded ? null : r.id)} style={{ textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0, width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 4 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: sans, fontSize: 12.5, fontWeight: 600, color: brand.colors.ink }}>
                          <span style={{ color: t.resets ? brand.colors.gold : brand.colors.muted, fontSize: 13 }}>{t.glyph}</span>{t.label}
                        </span>
                        <span style={{ fontFamily: sans, fontSize: 11, color: brand.colors.muted, whiteSpace: 'nowrap', flexShrink: 0 }}>{formatDate(r.serviceDate)}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {r.provider && <span style={{ fontFamily: sans, fontSize: 11.5, color: brand.colors.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.provider}</span>}
                        {r.cost ? <span style={{ fontFamily: sans, fontSize: 12, fontWeight: 700, color: brand.colors.ink, marginLeft: 'auto', whiteSpace: 'nowrap' }}>{formatCost(r.cost)}</span> : <span style={{ fontFamily: sans, fontSize: 11.5, color: brand.serviceStatus.ok.fg, marginLeft: 'auto' }}>No charge</span>}
                      </div>
                      {r.notes && (
                        <p style={{ fontFamily: sans, fontSize: 11.5, color: brand.colors.ink, opacity: 0.75, lineHeight: 1.5, margin: '6px 0 0', ...(expanded ? {} : { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }) }}>{r.notes}</p>
                      )}
                      {expanded && (
                        <div style={{ marginTop: 8 }}>
                          <span role="button" tabIndex={0} onClick={e => { e.stopPropagation(); void onDelete(r.id) }} style={{ fontFamily: sans, fontSize: 10.5, color: brand.serviceStatus.overdue.fg, cursor: 'pointer', letterSpacing: '0.04em' }}>Remove record</span>
                        </div>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>

            {/* total + CTA */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 20, paddingTop: 16, borderTop: `1px solid ${brand.colors.borderLight}`, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: sans, fontSize: 12.5, color: brand.colors.ink }}>
                Total service cost: <span style={{ fontWeight: 700, color: brand.colors.gold }}>{formatCost(totalCents)}</span>
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <a href="/service-room" style={{ fontFamily: sans, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', color: brand.colors.muted, textDecoration: 'none' }}>Manage in Service Room →</a>
                <button type="button" onClick={() => setLogging(true)} style={primaryBtn}>+ Log a service</button>
              </div>
            </div>
          </>
        )}
      </section>

      {logging && <LogServiceModal sw={sw} onClose={() => setLogging(false)} onSave={onSave} />}
      {docLightboxStart && documents.length > 0 && (
        <WatchPhotoLightbox photos={documents} startId={docLightboxStart} ownedWatchId={watch.id} onClose={() => setDocLightboxStart(null)} />
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={doc.photoUrl} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <span style={{ position: 'absolute', top: 5, left: 5 }}><DocTile type={type} size={20} /></span>
      </div>
      <div style={{ marginTop: 6, fontFamily: sans, fontSize: 9.5, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: brand.colors.gold, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{docTypeMeta(type).label}</div>
    </button>
  )
}

const primaryBtn: React.CSSProperties = {
  fontFamily: sans, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
  padding: '9px 16px', background: brand.colors.ink, color: brand.colors.slot,
  border: 'none', borderRadius: brand.radius.btn, cursor: 'pointer',
}
