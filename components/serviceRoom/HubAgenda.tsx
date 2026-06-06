'use client'

// components/serviceRoom/HubAgenda.tsx — the hero layout: Service Horizon +
// "On the bench" attention queue + "Resting easy" on-track list.

import { brand } from '@/lib/brand'
import {
  byAttention, formatCost, formatDate, formatMonthYear, lastFullService,
  lifetimeCostCents, relTime, serviceStatus, type ServiceWatch,
} from '@/lib/serviceRoom/derive'
import {
  Icon, Meta, SectionHead, StatusChip, WatchShot,
  bookingUrl, btnPrimary, btnSecondary, emptyNote, iconBtn,
} from '@/components/serviceRoom/primitives'
import { ServiceHorizon } from '@/components/serviceRoom/ServiceHorizon'
import WatchImageOrDial from '@/components/watchbox/WatchImageOrDial'
import type { LayoutProps } from '@/components/serviceRoom/layoutTypes'

const sans = brand.font.sans
const serif = brand.font.serif

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Meta style={{ display: 'block', marginBottom: 3, fontSize: 11, whiteSpace: 'nowrap' }}>{label}</Meta>
      <span style={{ fontFamily: sans, fontSize: 15, fontWeight: 600, color: brand.colors.ink, whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  )
}

function AttentionCard({ sw, now, onPick, onLog, isMobile }: { sw: ServiceWatch; now: Date; onPick: (sw: ServiceWatch) => void; onLog: (sw: ServiceWatch) => void; isMobile: boolean }) {
  const st = serviceStatus(sw, now)
  const lf = lastFullService(sw)
  const overdue = st.key === 'overdue'
  const need = overdue
    ? `Full service overdue by ${Math.round(Math.abs(st.months))} months`
    : `Full service due ${relTime(st.due, now)} — ${formatDate(st.due)}`
  const imgCol = isMobile ? 84 : 128

  return (
    <div className="service-attention-card" style={{
      display: 'grid', gridTemplateColumns: `${imgCol}px 1fr`, gap: isMobile ? 14 : 22, padding: isMobile ? 15 : 20,
      background: brand.colors.white, border: `1px solid ${brand.colors.border}`,
      borderLeft: `3px solid ${st.dot}`, borderRadius: brand.radius.xl, boxShadow: brand.shadow.xs,
    }}>
      <button type="button" onClick={() => onPick(sw)} aria-label={`Open ${sw.watch.brand} ${sw.watch.model} dossier`} style={{ width: imgCol, height: '100%', minHeight: imgCol, alignSelf: 'stretch', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {isMobile ? (
          <span style={{ position: 'relative', width: imgCol, height: '100%', minHeight: imgCol, display: 'block' }}>
            <WatchImageOrDial watch={sw.watch} fill sizes="84px" dialSize={64} imageStyle={{ objectFit: 'contain', filter: 'drop-shadow(0 8px 16px rgba(26,20,16,0.22))' }} />
          </span>
        ) : (
          <WatchShot watch={sw.watch} size={128} shadow="0 8px 16px rgba(26,20,16,0.22)" />
        )}
      </button>

      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div onClick={() => onPick(sw)} style={{ cursor: 'pointer', flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
              <Meta style={{ whiteSpace: 'nowrap' }}>{sw.watch.brand}</Meta>
              <span style={{ fontFamily: sans, fontSize: 12, fontWeight: 500, letterSpacing: '0.06em', color: brand.colors.muted, whiteSpace: 'nowrap' }}>REF {sw.watch.reference}</span>
            </div>
            <div style={{ fontFamily: serif, fontSize: isMobile ? 20 : 23, fontWeight: 400, color: brand.colors.ink, lineHeight: 1.06 }}>{sw.watch.model}</div>
          </div>
          <StatusChip status={st} size={isMobile ? 'sm' : 'md'} />
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: isMobile ? 10 : 12, marginBottom: isMobile ? 12 : 14, fontFamily: sans, fontSize: 14, fontWeight: 500, color: st.fg }}>
          <Icon name={overdue ? 'clock' : 'calendar'} size={14} color={st.fg} style={{ flexShrink: 0, marginTop: 1 }} />{need}
        </div>

        <div style={{ display: 'flex', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between', gap: isMobile ? 14 : 12, flexDirection: isMobile ? 'column' : 'row', flexWrap: 'wrap' }}>
          <div style={isMobile ? { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 } : { display: 'flex', gap: 22 }}>
            <Stat label={isMobile ? 'Last' : 'Last full'} value={lf ? formatMonthYear(lf.serviceDate) : 'Never'} />
            <Stat label={isMobile ? 'Every' : 'Interval'} value={`${sw.intervalYears} yr`} />
            <Stat label={isMobile ? 'Upkeep' : 'Lifetime upkeep'} value={formatCost(lifetimeCostCents(sw))} />
          </div>
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 8, width: isMobile ? '100%' : 'auto' }}>
            <button type="button" onClick={() => onLog(sw)} style={{ ...btnPrimary, width: isMobile ? '100%' : 'auto' }}>
              <Icon name="plus" size={13} color={brand.colors.slot} />Log a service
            </button>
            <a href={bookingUrl(sw.watch.brand)} target="_blank" rel="noopener noreferrer sponsored" style={{ ...btnSecondary, width: isMobile ? '100%' : 'auto' }}>
              Find a center <span style={{ opacity: 0.6 }}>↗</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

function OnTrackRow({ sw, now, onPick, onLog, isMobile }: { sw: ServiceWatch; now: Date; onPick: (sw: ServiceWatch) => void; onLog: (sw: ServiceWatch) => void; isMobile: boolean }) {
  const st = serviceStatus(sw, now)
  const lf = lastFullService(sw)

  if (isMobile) {
    return (
      <div style={{
        display: 'grid', gridTemplateColumns: '52px 1fr auto', alignItems: 'center', gap: 12,
        padding: '11px 14px', background: brand.colors.white, border: `1px solid ${brand.colors.border}`, borderRadius: brand.radius.lg,
      }}>
        <button type="button" onClick={() => onPick(sw)} aria-label={`Open ${sw.watch.brand} ${sw.watch.model} dossier`} style={{ width: 52, height: 52, background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <WatchShot watch={sw.watch} size={52} shadow="0 4px 8px rgba(26,20,16,0.18)" />
        </button>
        <div onClick={() => onPick(sw)} style={{ cursor: 'pointer', minWidth: 0 }}>
          <div style={{ fontFamily: sans, fontSize: 15, fontWeight: 600, color: brand.colors.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {sw.watch.brand} <span style={{ fontWeight: 400, color: brand.colors.muted }}>{sw.watch.model}</span>
          </div>
          <span style={{ fontFamily: sans, fontSize: 12, color: brand.colors.muted }}>Next {formatDate(st.due, { year: 'numeric', month: 'short' })} · {formatCost(lifetimeCostCents(sw))}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 7 }}>
          <StatusChip status={st} size="sm" />
          <button type="button" onClick={() => onLog(sw)} title="Log a service" style={{ ...iconBtn, width: 30, height: 30 }}>
            <Icon name="plus" size={14} color={brand.colors.muted} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '64px 1.5fr 1fr 1fr auto', alignItems: 'center', gap: 16,
      padding: '12px 18px', background: brand.colors.white, border: `1px solid ${brand.colors.border}`, borderRadius: brand.radius.lg,
    }}>
      <button type="button" onClick={() => onPick(sw)} aria-label={`Open ${sw.watch.brand} ${sw.watch.model} dossier`} style={{ width: 64, height: 64, background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <WatchShot watch={sw.watch} size={64} shadow="0 5px 10px rgba(26,20,16,0.18)" />
      </button>
      <div onClick={() => onPick(sw)} style={{ cursor: 'pointer', minWidth: 0 }}>
        <div style={{ fontFamily: sans, fontSize: 13, fontWeight: 600, color: brand.colors.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {sw.watch.brand} <span style={{ fontWeight: 400, color: brand.colors.muted }}>{sw.watch.model}</span>
        </div>
        <span style={{ fontFamily: sans, fontSize: 12, color: brand.colors.muted }}>Last full · {lf ? formatMonthYear(lf.serviceDate) : 'Never serviced'}</span>
      </div>
      <div><Meta style={{ display: 'block', marginBottom: 2 }}>Next due</Meta>
        <span style={{ fontFamily: sans, fontSize: 14, color: brand.colors.ink }}>{formatDate(st.due, { year: 'numeric', month: 'short' })}</span>
      </div>
      <div><Meta style={{ display: 'block', marginBottom: 2 }}>Upkeep</Meta>
        <span style={{ fontFamily: sans, fontSize: 14, color: brand.colors.ink }}>{formatCost(lifetimeCostCents(sw))}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <StatusChip status={st} size="sm" />
        <button type="button" onClick={() => onLog(sw)} title="Log a service" style={iconBtn}>
          <Icon name="plus" size={14} color={brand.colors.muted} />
        </button>
      </div>
    </div>
  )
}

export function HubAgenda({ watches, now, onPick, onLog, activeId, isMobile }: LayoutProps) {
  const sorted = [...watches].sort((a, b) => byAttention(a, b, now))
  const attention = sorted.filter(sw => serviceStatus(sw, now).key !== 'ok')
  const onTrack = sorted.filter(sw => serviceStatus(sw, now).key === 'ok')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 34 }}>
      <section>
        <SectionHead eyebrow="Service horizon" title="The next two years" hint="Each colored dot marks the next full-service date" />
        <ServiceHorizon watches={watches} now={now} onPick={onPick} activeId={activeId} isMobile={isMobile} />
      </section>

      <section>
        <SectionHead eyebrow={`Needs attention · ${attention.length}`} title="On the bench" hint="Overdue and due-soon pieces, most urgent first" />
        {attention.length ? (
          <div style={{ display: 'grid', gap: 14 }}>
            {attention.map(sw => <AttentionCard key={sw.watch.id} sw={sw} now={now} onPick={onPick} onLog={onLog} isMobile={isMobile} />)}
          </div>
        ) : (
          <div style={emptyNote}>Nothing needs servicing right now. The whole box is on track.</div>
        )}
      </section>

      {onTrack.length > 0 && (
        <section>
          <SectionHead eyebrow={`On track · ${onTrack.length}`} title="Resting easy" />
          <div style={{ display: 'grid', gap: 8 }}>
            {onTrack.map(sw => <OnTrackRow key={sw.watch.id} sw={sw} now={now} onPick={onPick} onLog={onLog} isMobile={isMobile} />)}
          </div>
        </section>
      )}
    </div>
  )
}
