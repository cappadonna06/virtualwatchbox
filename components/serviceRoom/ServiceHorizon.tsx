'use client'

// components/serviceRoom/ServiceHorizon.tsx — the Agenda hero. A horizontal
// "service runway": overdue bucket (left) · 24-month dated axis (centre) ·
// beyond-2yr bucket (right). The colored DOT marks the exact due month — the
// client's central UX requirement. Greedy 3-lane packing avoids pill overlap.

import { brand } from '@/lib/brand'
import { addMonths, formatDate, formatMonthYear, monthsBetween, serviceStatus, type ServiceWatch } from '@/lib/serviceRoom/derive'
import { Meta, WatchShot } from '@/components/serviceRoom/primitives'

const sans = brand.font.sans

type Props = {
  watches: ServiceWatch[]
  now: Date
  onPick: (sw: ServiceWatch) => void
  activeId: string | null
}

const HORIZON = 24    // months on the axis
const zL = 13         // % — overdue zone width / NOW line
const zR = 87         // % — axis end / beyond zone start
const LANES = 3
const trackH = 178

export function ServiceHorizon({ watches, now, onPick, activeId }: Props) {
  const placed = watches.map(sw => {
    const st = serviceStatus(sw, now)
    const m = monthsBetween(now, st.due)
    let xPct: number
    let bucket: 'overdue' | 'beyond' | null = null
    if (m < 0) { bucket = 'overdue'; xPct = zL / 2 }
    else if (m > HORIZON) { bucket = 'beyond'; xPct = (zR + 100) / 2 }
    else { xPct = zL + (m / HORIZON) * (zR - zL) }
    return { sw, st, m, xPct, bucket, lane: 0 }
  })

  // Greedy lane assignment to avoid overlap.
  const laneLast = Array(LANES).fill(-100)
  ;[...placed].sort((a, b) => a.xPct - b.xPct).forEach(p => {
    let lane = laneLast.indexOf(Math.min(...laneLast))
    for (let i = 0; i < LANES; i++) { if (p.xPct - laneLast[i] > 20) { lane = i; break } }
    laneLast[lane] = p.xPct
    p.lane = lane
  })

  const ticks = [0, 6, 12, 18, 24]
  const overdueN = placed.filter(p => p.bucket === 'overdue').length
  const beyondN = placed.filter(p => p.bucket === 'beyond').length
  const xOf = (t: number) => zL + (t / HORIZON) * (zR - zL)

  return (
    <div>
      {/* axis labels */}
      <div style={{ position: 'relative', height: 15, marginBottom: 5 }}>
        <div style={{ position: 'absolute', left: `${zL / 2}%`, transform: 'translateX(-50%)' }}>
          <Meta style={{ fontSize: 9 }} color={overdueN ? brand.serviceStatus.overdue.fg : brand.colors.muted}>Overdue</Meta>
        </div>
        {ticks.map(t => (
          <div key={t} style={{ position: 'absolute', left: `${xOf(t)}%`, transform: 'translateX(-50%)' }}>
            <Meta style={{ fontSize: 9 }}>{t === 0 ? 'Now' : formatMonthYear(addMonths(now, t))}</Meta>
          </div>
        ))}
        <div style={{ position: 'absolute', left: `${(zR + 100) / 2}%`, transform: 'translateX(-50%)' }}>
          <Meta style={{ fontSize: 9 }}>Beyond</Meta>
        </div>
      </div>

      {/* track */}
      <div style={{ position: 'relative', height: trackH, borderRadius: brand.radius.xl, background: brand.colors.white, border: `1px solid ${brand.colors.border}`, overflow: 'hidden' }}>
        {/* zone tints */}
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${zL}%`, background: brand.serviceHorizon.overdueZoneBg, borderRight: `1px solid ${brand.serviceHorizon.overdueZoneBorder}` }} />
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${zR}%`, right: 0, background: brand.colors.bg, borderLeft: `1px dashed ${brand.colors.borderLight}` }} />
        {/* gridlines */}
        {ticks.map(t => (
          <div key={t} style={{ position: 'absolute', top: 0, bottom: 0, left: `${xOf(t)}%`, borderLeft: t === 0 ? `1.5px solid ${brand.colors.ink}` : `1px dashed ${brand.colors.border}`, opacity: t === 0 ? 0.5 : 1 }} />
        ))}

        {/* markers — the status dot sits EXACTLY on the due month */}
        {placed.map(p => {
          const top = 20 + p.lane * ((trackH - 40 - 40) / (LANES - 1))
          const nearRight = p.xPct > 68
          const isActive = activeId === p.sw.watch.id
          const dated = p.bucket === null
          const sub = p.bucket === 'overdue' ? `${Math.round(Math.abs(p.m))} mo overdue` : formatMonthYear(p.st.due)
          return (
            <div key={p.sw.watch.id} style={{ position: 'absolute', left: `${p.xPct}%`, top: top + 18 }}>
              {dated && (
                <div style={{ position: 'absolute', left: 0, top: 0, width: 1.5, height: trackH - (top + 18) - 4, transform: 'translateX(-50%)', background: p.st.dot, opacity: 0.28 }} />
              )}
              <span style={{ position: 'absolute', left: 0, top: 0, transform: 'translate(-50%,-50%)', width: 12, height: 12, borderRadius: 12, background: p.st.dot, border: `2.5px solid ${brand.colors.white}`, boxShadow: `0 0 0 1px ${p.st.dot}55`, zIndex: 3 }} />
              <button
                type="button"
                onClick={() => onPick(p.sw)}
                title={`${p.sw.watch.brand} ${p.sw.watch.model} — ${p.st.label} · ${formatDate(p.st.due)}`}
                style={{
                  position: 'absolute', top: 0, left: 0,
                  transform: `translateY(-50%) translateX(${nearRight ? 'calc(-100% - 13px)' : '13px'})`,
                  display: 'flex', alignItems: 'center', gap: 9,
                  background: isActive ? brand.colors.goldWash : brand.colors.white,
                  border: `1px solid ${isActive ? p.st.dot : brand.colors.border}`,
                  boxShadow: isActive ? `0 4px 14px ${p.st.dot}33` : brand.shadow.xs,
                  borderRadius: 26, padding: '5px 13px 5px 5px', cursor: 'pointer',
                  transition: `all ${brand.transition.fast}`, whiteSpace: 'nowrap', zIndex: isActive ? 5 : 2,
                }}
              >
                <WatchShot watch={p.sw.watch} size={36} shadow="0 2px 5px rgba(26,20,16,0.22)" />
                <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.18, textAlign: 'left' }}>
                  <span style={{ fontFamily: sans, fontSize: 11.5, fontWeight: 600, color: brand.colors.ink }}>{p.sw.watch.brand}</span>
                  <span style={{ fontFamily: sans, fontSize: 10, fontWeight: 500, color: p.st.fg, letterSpacing: '0.02em' }}>{sub}</span>
                </span>
              </button>
            </div>
          )
        })}
      </div>

      {/* legend */}
      <div style={{ display: 'flex', gap: 18, marginTop: 12, flexWrap: 'wrap' }}>
        {[brand.serviceStatus.overdue, brand.serviceStatus.due, brand.serviceStatus.ok].map((s, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: sans, fontSize: 11, color: brand.colors.muted }}>
            <span style={{ width: 7, height: 7, borderRadius: 7, background: s.dot }} />
            {['Overdue', 'Due soon', 'On track'][i]}
          </span>
        ))}
        {beyondN > 0 && <span style={{ fontFamily: sans, fontSize: 11, color: brand.colors.muted, marginLeft: 'auto' }}>{beyondN} resting comfortably past two years</span>}
      </div>
    </div>
  )
}
