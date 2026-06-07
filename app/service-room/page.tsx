'use client'

// app/service-room/page.tsx — The Service Room: collection-wide maintenance &
// provenance hub. Recreated from docs/design-system/design_handoff_service_room
// on our real stack (CollectionSessionProvider + brand tokens).

import { useEffect, useMemo, useState } from 'react'
import { brand, masthead } from '@/lib/brand'
import { useCollectionSession, type ServiceRecordInput } from '@/app/collection/CollectionSessionProvider'
import {
  buildServiceWatch,
  formatCost,
  formatMonthYear,
  hasServiceData,
  lifetimeCostCents,
  serviceStatus,
  type ServiceWatch,
} from '@/lib/serviceRoom/derive'
import type { ServiceIntervalYears, WatchServiceRecord } from '@/types/watch'
import { useIsMobile } from '@/components/collection/useResponsiveState'
import { Icon, Meta, btnSecondary } from '@/components/serviceRoom/primitives'
import { HubAgenda } from '@/components/serviceRoom/HubAgenda'
import { HubLedger } from '@/components/serviceRoom/HubLedger'
import { HubGallery } from '@/components/serviceRoom/HubGallery'
import { PartnerBand } from '@/components/serviceRoom/PartnerBand'
import { WatchDrawer } from '@/components/serviceRoom/WatchDrawer'
import { LogServiceModal } from '@/components/serviceRoom/LogServiceModal'
import { Screen1Empty } from '@/components/serviceRoom/onboarding/Screen1Empty'
import { Screen2Conversion } from '@/components/serviceRoom/onboarding/Screen2Conversion'
import { OnboardingWizard } from '@/components/serviceRoom/onboarding/OnboardingWizard'
import { downloadDossier } from '@/lib/serviceRoom/dossier'

type LayoutId = 'agenda' | 'ledger' | 'gallery'

const HUB_DISMISS_KEY = 'vwb:serviceRoomHubDismissed'

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
    uploadWatchPhotos, updateCollectionWatch,
  } = session

  const isMobile = useIsMobile()
  const gx = isMobile ? 16 : 24
  const [layout, setLayout] = useState<LayoutId>('agenda')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [logForId, setLogForId] = useState<string | null>(null)
  const [now] = useState(() => new Date())
  const [wizardOpen, setWizardOpen] = useState(false)
  const [hubDismissed, setHubDismissed] = useState(false)

  // First-run dismissal ("I'll do this later") persists for the session.
  useEffect(() => {
    try { setHubDismissed(sessionStorage.getItem(HUB_DISMISS_KEY) === '1') } catch { /* no-op */ }
  }, [])

  const dismissHub = () => {
    try { sessionStorage.setItem(HUB_DISMISS_KEY, '1') } catch { /* no-op */ }
    setHubDismissed(true)
  }
  const clearHubDismiss = () => {
    try { sessionStorage.removeItem(HUB_DISMISS_KEY) } catch { /* no-op */ }
    setHubDismissed(false)
  }

  const watches: ServiceWatch[] = useMemo(
    () => collectionWatches.map(w =>
      buildServiceWatch(w, getWatchServiceRecords(w.id), getWatchPhotos(w.id))),
    [collectionWatches, getWatchServiceRecords, getWatchPhotos],
  )

  // empty → no watches · convert → watches with no service data (first-run) ·
  // hub → the populated maintenance hub.
  const anyData = watches.some(hasServiceData)
  const screen: 'empty' | 'convert' | 'hub' =
    watches.length === 0 ? 'empty'
    : (!anyData && !hubDismissed) ? 'convert'
    : 'hub'

  // Pieces whose service interval was never explicitly set — i.e. still on the
  // estimate default. Keeps the setup wizard reachable from the populated hub.
  const needsSchedule = watches.filter(w => w.watch.intervalYears == null).length

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

  const subtitle = screen === 'empty'
    ? 'Service dates, papers, and lifetime upkeep, kept in one place.'
    : screen === 'convert'
      ? `${watches.length} ${watches.length === 1 ? 'piece' : 'pieces'} in the box. None have a schedule yet.`
      : 'Every service, document, and cost for your collection.'

  return (
    <div style={{ background: brand.colors.bg, minHeight: '70vh' }}>
      <div style={{ padding: `36px ${gx}px 16px` }}>
        {/* header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24, marginBottom: 26, flexWrap: 'wrap' }}>
          <div>
            <div style={{ ...masthead.eyebrow, marginBottom: 10 }}>Maintenance &amp; provenance</div>
            <h1 style={masthead.title}>
              The Service Room
            </h1>
            <p style={{ ...masthead.subtitle, margin: '12px 0 0', maxWidth: 460 }}>
              {subtitle}
            </p>
          </div>
          {!isMobile && screen === 'hub' && (
            <button type="button" onClick={onExportAll} style={{ ...btnSecondary, padding: '10px 16px' }}>
              <Icon name="download" size={14} color={brand.colors.ink} />Export dossier
            </button>
          )}
        </div>

        {screen === 'hub' && (
          <>
            {needsSchedule > 0 && (
              <button
                type="button"
                onClick={() => setWizardOpen(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left',
                  background: brand.colors.goldWash, border: `1px solid ${brand.colors.goldLine}`, borderRadius: brand.radius.lg,
                  padding: '12px 16px', marginBottom: 18, cursor: 'pointer',
                }}
              >
                <Icon name="spark" size={16} color={brand.colors.goldDeep} />
                <span style={{ flex: 1, fontFamily: sans, fontSize: 13.5, color: brand.colors.ink }}>
                  <b style={{ fontWeight: 600 }}>{needsSchedule} {needsSchedule === 1 ? 'piece' : 'pieces'}</b> {needsSchedule === 1 ? "doesn't" : "don't"} have a service schedule yet — running on an estimate.
                </span>
                <span style={{ fontFamily: sans, fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: brand.colors.goldDeep, display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                  Set up <span aria-hidden>→</span>
                </span>
              </button>
            )}
            <SummaryStrip watches={watches} now={now} isMobile={isMobile} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, margin: '28px 0 4px', flexWrap: 'wrap' }}>
              <LayoutSwitch value={layout} onChange={setLayout} />
              {isMobile && (
                <button type="button" onClick={onExportAll} style={{ ...btnSecondary, padding: '9px 14px' }}>
                  <Icon name="download" size={13} color={brand.colors.ink} />Export
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <div style={{ padding: `8px ${gx}px 40px`, display: 'flex', flexDirection: 'column', gap: 40 }}>
        {screen === 'empty' && <Screen1Empty now={now} isMobile={isMobile} />}
        {screen === 'convert' && (
          <Screen2Conversion watches={watches} onStart={() => setWizardOpen(true)} onDismiss={dismissHub} isMobile={isMobile} />
        )}
        {screen === 'hub' && (
          <>
            <Layout watches={watches} now={now} onPick={onPick} onLog={onLog} activeId={selectedId} isMobile={isMobile} />
            <div style={{ height: 1, background: brand.colors.border }} />
            <PartnerBand />
          </>
        )}
      </div>

      {screen === 'hub' && (
        <footer style={{ padding: `24px ${gx}px 48px`, borderTop: `1px solid ${brand.colors.border}`, display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontFamily: sans, fontSize: 11, color: brand.colors.muted, letterSpacing: '0.04em' }}>VIRTUAL WATCHBOX · THE SERVICE ROOM</span>
        </footer>
      )}

      <WatchDrawer
        sw={selected}
        now={now}
        onClose={() => setSelectedId(null)}
        onLog={onLog}
        onInterval={onInterval}
        onExport={onExport}
      />
      <LogServiceModal sw={logFor} onClose={() => setLogForId(null)} onSave={onSaveService} />

      {wizardOpen && (
        <OnboardingWizard
          watches={watches}
          now={now}
          isMobile={isMobile}
          setWatchInterval={setWatchInterval}
          logServiceRecord={logServiceRecord}
          uploadWatchPhotos={uploadWatchPhotos}
          updateCollectionWatch={updateCollectionWatch}
          showToast={showToast}
          onClose={() => setWizardOpen(false)}
          onDone={dest => { setWizardOpen(false); clearHubDismiss(); if (dest === 'agenda') setLayout('agenda') }}
        />
      )}
    </div>
  )
}

// ─── Summary stat strip ──────────────────────────────────────────────────
function SummaryStrip({ watches, now, isMobile }: { watches: ServiceWatch[]; now: Date; isMobile: boolean }) {
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
      display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 0, background: brand.colors.white,
      border: `1px solid ${brand.colors.border}`, borderRadius: brand.radius.xl, overflow: 'hidden',
    }}>
      {stats.map((s, i) => {
        // 2×2 grid borders: left border on the right column; top border on row 2.
        const borderLeft = isMobile ? (i % 2 === 1) : i > 0
        const borderTop = isMobile && i >= 2
        return (
          <div key={s.label} style={{
            padding: isMobile ? '15px 16px' : '18px 22px',
            borderLeft: borderLeft ? `1px solid ${brand.colors.border}` : 'none',
            borderTop: borderTop ? `1px solid ${brand.colors.border}` : 'none',
            minWidth: 0,
          }}>
            <Meta style={{ display: 'block', marginBottom: 8 }}>{s.label}</Meta>
            <div style={{ fontFamily: serif, fontSize: isMobile ? 28 : 34, fontWeight: 400, color: s.accent ?? brand.colors.ink, lineHeight: 0.95, marginBottom: 6 }}>{s.value}</div>
            <span style={{ fontFamily: sans, fontSize: 11, color: brand.colors.muted, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.meta}</span>
          </div>
        )
      })}
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
