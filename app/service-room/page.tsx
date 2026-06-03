'use client'

// app/service-room/page.tsx — The Service Room: collection-wide maintenance &
// provenance hub. Recreated from docs/design-system/design_handoff_service_room
// on our real stack (CollectionSessionProvider + brand tokens).

import { useMemo, useState } from 'react'
import { brand } from '@/lib/brand'
import { useCollectionSession, type ServiceRecordInput } from '@/app/collection/CollectionSessionProvider'
import {
  buildServiceWatch,
  formatCost,
  formatMonthYear,
  lifetimeCostCents,
  serviceStatus,
  type ServiceWatch,
} from '@/lib/serviceRoom/derive'
import type { ServiceIntervalYears, WatchServiceRecord } from '@/types/watch'
import { Icon, Meta, btnSecondary } from '@/components/serviceRoom/primitives'
import { HubAgenda } from '@/components/serviceRoom/HubAgenda'
import { HubLedger } from '@/components/serviceRoom/HubLedger'
import { HubGallery } from '@/components/serviceRoom/HubGallery'
import { PartnerBand } from '@/components/serviceRoom/PartnerBand'
import { WatchDrawer } from '@/components/serviceRoom/WatchDrawer'
import { LogServiceModal } from '@/components/serviceRoom/LogServiceModal'
import { downloadDossier } from '@/lib/serviceRoom/dossier'

type LayoutId = 'agenda' | 'ledger' | 'gallery'

const sans = brand.font.sans
const serif = brand.font.serif

const LAYOUTS: { id: LayoutId; label: string; icon: 'rows' | 'list' | 'grid' }[] = [
  { id: 'agenda', label: 'Agenda', icon: 'rows' },
  { id: 'ledger', label: 'Ledger', icon: 'list' },
  { id: 'gallery', label: 'Gallery', icon: 'grid' },
]

export default function ServiceRoomPage() {
  const session = useCollectionSession()
  const {
    collectionWatches, getWatchServiceRecords, getWatchPhotos,
    logServiceRecord, setWatchInterval, showToast,
  } = session

  const [layout, setLayout] = useState<LayoutId>('agenda')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [logForId, setLogForId] = useState<string | null>(null)
  const [now] = useState(() => new Date())

  const watches: ServiceWatch[] = useMemo(
    () => collectionWatches.map(w =>
      buildServiceWatch(w, getWatchServiceRecords(w.id), getWatchPhotos(w.id))),
    [collectionWatches, getWatchServiceRecords, getWatchPhotos],
  )

  const selected = watches.find(sw => sw.watch.id === selectedId) ?? null
  const logFor = watches.find(sw => sw.watch.id === logForId) ?? null

  const onPick = (sw: ServiceWatch) => setSelectedId(sw.watch.id)
  const onLog = (sw: ServiceWatch) => setLogForId(sw.watch.id)

  // Returns the created record so the modal can tie attachments to it; the
  // modal closes itself after the record + any attachments are saved.
  const onSaveService = async (sw: ServiceWatch, data: ServiceRecordInput): Promise<WatchServiceRecord | null> => {
    try {
      const rec = await logServiceRecord(sw.watch.id, data)
      showToast(`Service logged for ${sw.watch.brand} ${sw.watch.model}`)
      return rec
    } catch {
      showToast('Could not save the service record')
      return null
    }
  }

  const onInterval = (sw: ServiceWatch, years: ServiceIntervalYears) => {
    void setWatchInterval(sw.watch.id, years)
  }

  const onExport = (sw: ServiceWatch) => {
    downloadDossier([sw], `${sw.watch.brand}-${sw.watch.model}-dossier`, now)
    showToast(`Dossier exported for ${sw.watch.brand} ${sw.watch.model}`)
  }
  const onExportAll = () => {
    if (watches.length === 0) { showToast('Add a watch to your collection first'); return }
    downloadDossier(watches, 'collection-service-dossier', now)
    showToast('Full collection dossier exported')
  }

  const Layout = { agenda: HubAgenda, ledger: HubLedger, gallery: HubGallery }[layout]

  return (
    <div style={{ background: brand.colors.bg, minHeight: '70vh' }}>
      <div style={{ padding: '36px 24px 16px' }}>
        {/* header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24, marginBottom: 26, flexWrap: 'wrap' }}>
          <div>
            <Meta style={{ color: brand.colors.gold, display: 'block', marginBottom: 10 }}>Maintenance &amp; provenance</Meta>
            <h1 style={{ fontFamily: serif, fontSize: 'clamp(38px, 6vw, 52px)', fontWeight: 300, color: brand.colors.ink, lineHeight: 0.98, letterSpacing: '-0.01em', margin: 0 }}>
              The Service Room
            </h1>
            <p style={{ fontFamily: sans, fontSize: 14, color: brand.colors.mutedDark, lineHeight: 1.6, margin: '12px 0 0', maxWidth: 460 }}>
              Every service, document, and cost for your collection — and a clear read on what to send to the bench next.
            </p>
          </div>
          <button type="button" onClick={onExportAll} style={{ ...btnSecondary, padding: '10px 16px' }}>
            <Icon name="download" size={14} color={brand.colors.ink} />Export dossier
          </button>
        </div>

        <SummaryStrip watches={watches} now={now} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, margin: '28px 0 4px', flexWrap: 'wrap' }}>
          <LayoutSwitch value={layout} onChange={setLayout} />
          <span style={{ fontFamily: sans, fontSize: 12, color: brand.colors.muted }}>
            Three reads on the same box — pick the one that suits the moment.
          </span>
        </div>
      </div>

      <div style={{ padding: '8px 24px 40px', display: 'flex', flexDirection: 'column', gap: 40 }}>
        {watches.length === 0 ? (
          <EmptyState />
        ) : (
          <Layout watches={watches} now={now} onPick={onPick} onLog={onLog} activeId={selectedId} />
        )}
        <div style={{ height: 1, background: brand.colors.border }} />
        <PartnerBand />
      </div>

      <footer style={{ padding: '24px 24px 48px', borderTop: `1px solid ${brand.colors.border}`, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <span style={{ fontFamily: serif, fontSize: 17, color: brand.colors.muted, fontStyle: 'italic' }}>Your source of truth — for the life of every piece.</span>
        <span style={{ fontFamily: sans, fontSize: 11, color: brand.colors.muted, letterSpacing: '0.04em' }}>VIRTUAL WATCHBOX · THE SERVICE ROOM</span>
      </footer>

      <WatchDrawer
        sw={selected}
        now={now}
        onClose={() => setSelectedId(null)}
        onLog={onLog}
        onInterval={onInterval}
        onExport={onExport}
      />
      <LogServiceModal sw={logFor} onClose={() => setLogForId(null)} onSave={onSaveService} />
    </div>
  )
}

// ─── Summary stat strip ──────────────────────────────────────────────────
function SummaryStrip({ watches, now }: { watches: ServiceWatch[]; now: Date }) {
  const attention = watches.filter(w => serviceStatus(w, now).key !== 'ok')
  const totalCents = watches.reduce((s, w) => s + lifetimeCostCents(w), 0)
  const soonest = [...watches].sort((a, b) => serviceStatus(a, now).due.getTime() - serviceStatus(b, now).due.getTime())[0]
  const ss = soonest ? serviceStatus(soonest, now) : null

  const stats: { label: string; value: string | number; meta: string; accent?: string }[] = [
    { label: 'Pieces under care', value: watches.length, meta: 'in your box' },
    {
      label: 'Need attention', value: attention.length,
      meta: attention.length ? 'overdue or due soon' : 'all on track',
      accent: attention.length ? brand.serviceStatus.due.fg : brand.serviceStatus.ok.fg,
    },
    { label: 'Lifetime upkeep', value: formatCost(totalCents), meta: 'across all records', accent: brand.colors.gold },
    { label: 'Next on the bench', value: ss ? formatMonthYear(ss.due) : '—', meta: soonest ? `${soonest.watch.brand} ${soonest.watch.model}` : 'nothing scheduled' },
  ]

  return (
    <div className="service-summary-strip" style={{
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, background: brand.colors.white,
      border: `1px solid ${brand.colors.border}`, borderRadius: brand.radius.xl, overflow: 'hidden',
    }}>
      {stats.map((s, i) => (
        <div key={s.label} style={{ padding: '18px 22px', borderLeft: i ? `1px solid ${brand.colors.border}` : 'none' }}>
          <Meta style={{ display: 'block', marginBottom: 8 }}>{s.label}</Meta>
          <div style={{ fontFamily: serif, fontSize: 34, fontWeight: 400, color: s.accent ?? brand.colors.ink, lineHeight: 0.95, marginBottom: 6 }}>{s.value}</div>
          <span style={{ fontFamily: sans, fontSize: 11, color: brand.colors.muted }}>{s.meta}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Layout switcher ─────────────────────────────────────────────────────
function LayoutSwitch({ value, onChange }: { value: LayoutId; onChange: (id: LayoutId) => void }) {
  return (
    <div style={{ display: 'inline-flex', background: brand.colors.white, border: `1px solid ${brand.colors.border}`, borderRadius: brand.radius.lg, padding: 3, gap: 2 }}>
      {LAYOUTS.map(l => {
        const active = value === l.id
        return (
          <button key={l.id} type="button" onClick={() => onChange(l.id)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: sans, fontSize: 12, fontWeight: 600,
            letterSpacing: '0.02em', padding: '7px 14px', borderRadius: brand.radius.sm, border: 'none', cursor: 'pointer',
            background: active ? brand.colors.ink : 'transparent', color: active ? brand.colors.slot : brand.colors.muted, transition: `all ${brand.transition.fast}`,
          }}>
            <Icon name={l.icon} size={14} color={active ? brand.colors.slot : brand.colors.muted} />{l.label}
          </button>
        )
      })}
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{
      background: brand.colors.white, border: `1px solid ${brand.colors.border}`, borderRadius: brand.radius.xl,
      padding: '56px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
    }}>
      <Icon name="wrench" size={26} color={brand.colors.muted} />
      <div style={{ fontFamily: serif, fontSize: 24, fontWeight: 400, color: brand.colors.ink }}>No watches under care yet</div>
      <p style={{ fontFamily: sans, fontSize: 13, color: brand.colors.muted, maxWidth: 360, lineHeight: 1.6, margin: 0 }}>
        Add watches to your collection and they&apos;ll appear here with service history, documents, and a clear read on what&apos;s due next.
      </p>
      <a href="/collection/add" style={{
        fontFamily: sans, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
        padding: '10px 18px', background: brand.colors.ink, color: brand.colors.slot, borderRadius: brand.radius.btn, textDecoration: 'none', marginTop: 6,
      }}>Add a watch</a>
    </div>
  )
}
