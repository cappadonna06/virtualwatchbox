'use client'

// components/serviceRoom/ServiceHorizon.tsx — the Agenda hero. A horizontal
// "service runway": overdue bucket (left) · 24-month dated axis (centre) ·
// beyond-2yr bucket (right). The colored DOT marks the exact due month — the
// client's central UX requirement. Collision-aware lane stacking grows the
// band vertically so every watch keeps its own pill without overlap.

import { brand } from '@/lib/brand'
import { addMonths, formatDate, formatMonthYear, monthsBetween, serviceStatus, type ServiceWatch } from '@/lib/serviceRoom/derive'
import { Meta, WatchShot } from '@/components/serviceRoom/primitives'

const sans = brand.font.sans

type Props = {
  watches: ServiceWatch[]
  now: Date
  onPick: (sw: ServiceWatch) => void
  activeId: string | null
  isMobile: boolean
}

// On mobile the band can't fit 24 months at phone width, so the axis + track
// live on a fixed-width canvas inside a horizontal scroller (still swipeable,
// dots still mark the exact due month).
const MOBILE_CANVAS = 660

const HORIZON = 24    // months on the axis
const zL = 13         // % — overdue zone width / NOW line
const zR = 87         // % — axis end / beyond zone start

// Vertical layout — the band grows with the busiest column, then scrolls.
const PILL_H = 50         // approximate pill height
const GAP = 12            // vertical gap between stacked pills
const ROW = PILL_H + GAP  // lane pitch
const PAD = 16            // top/bottom padding inside the track
const MIN_TRACK_H = 160
const MAX_TRACK_H = 380   // ≈ 5-6 rows before the band scrolls internally
const PILL_W_PCT = 16     // estimated pill footprint as a share of track width
const FLOW_RIGHT_MAX = 68 // pills past this xPct flow left instead of right

export function ServiceHorizon({ watches, now, onPick, activeId, isMobile }: Props) {
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

  // Collision-aware lane assignment by interval partitioning. Each pill
  // occupies an x-interval — its dot plus the pill body, which flows right for
  // left/centre watches and left for right-edge watches. Lanes grow as needed
  // so two pills whose footprints overlap never share a row (the band height
  // follows). Same-x bucket pills (Overdue / Beyond) share an interval, so each
  // is pushed to its own row; well-separated dated pills reuse lower lanes.
  const laneEnd: number[] = []
  placed
    .map(p => {
      const flowsRight = p.xPct <= FLOW_RIGHT_MAX
      return {
        p,
        lo: flowsRight ? p.xPct - 1 : p.xPct - PILL_W_PCT - 1,
        hi: flowsRight ? p.xPct + PILL_W_PCT + 1 : p.xPct + 1,
      }
    })
    .sort((a, b) => (a.lo - b.lo) || (a.p.st.due.getTime() - b.p.st.due.getTime()))
    .forEach(it => {
      let lane = laneEnd.findIndex(end => end <= it.lo)
      if (lane === -1) { lane = laneEnd.length; laneEnd.push(it.hi) }
      else laneEnd[lane] = it.hi
      it.p.lane = lane
    })

  const laneCount = Math.max(1, laneEnd.length)
  const blockH = laneCount * PILL_H + (laneCount - 1) * GAP
  const contentH = PAD * 2 + blockH
  const trackH = Math.max(MIN_TRACK_H, Math.min(MAX_TRACK_H, contentH))
  const bandH = Math.max(trackH, contentH)
  const scrolls = contentH > trackH
  const offsetTop = Math.max(PAD, (trackH - blockH) / 2)
  const laneCenterY = (lane: number) => offsetTop + PILL_H / 2 + lane * ROW

  const ticks = [0, 6, 12, 18, 24]
  const overdueN = placed.filter(p => p.bucket === 'overdue').length
  const beyondN = placed.filter(p => p.bucket === 'beyond').length
  const xOf = (t: number) => zL + (t / HORIZON) * (zR - zL)

  return (
    <div>
      {/* mobile: horizontal-scroll canvas so the 24-month axis stays swipeable */}
      <div style={{ overflowX: isMobile ? 'auto' : 'visible', WebkitOverflowScrolling: 'touch' }}>
      <div style={{ minWidth: isMobile ? MOBILE_CANVAS : undefined }}>
      {/* axis labels */}
      <div style={{ position: 'relative', height: 15, marginBottom: 5 }}>
        <div style={{ position: 'absolute', left: `${zL / 2}%`, transform: 'translateX(-50%)' }}>
          <Meta style={{ fontSize: 11 }} color={overdueN ? brand.serviceStatus.overdue.fg : brand.colors.muted}>Overdue</Meta>
        </div>
        {ticks.map(t => (
          <div key={t} style={{ position: 'absolute', left: `${xOf(t)}%`, transform: 'translateX(-50%)' }}>
            <Meta style={{ fontSize: 11 }}>{t === 0 ? 'Now' : formatMonthYear(addMonths(now, t))}</Meta>
          </div>
        ))}
        <div style={{ position: 'absolute', left: `${(zR + 100) / 2}%`, transform: 'translateX(-50%)' }}>
          <Meta style={{ fontSize: 11 }}>Beyond</Meta>
        </div>
      </div>

      {/* track */}
      <div style={{ position: 'relative', height: trackH, borderRadius: brand.radius.xl, background: brand.colors.white, border: `1px solid ${brand.colors.border}`, overflowX: 'hidden', overflowY: scrolls ? 'auto' : 'hidden' }}>
        {/* inner band — grows past the visible track height when the busiest
            column overflows, so all stacked pills remain reachable by scroll */}
        <div style={{ position: 'relative', height: bandH }}>
        {/* zone tints */}
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${zL}%`, background: brand.serviceHorizon.overdueZoneBg, borderRight: `1px solid ${brand.serviceHorizon.overdueZoneBorder}` }} />
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${zR}%`, right: 0, background: brand.colors.bg, borderLeft: `1px dashed ${brand.colors.borderLight}` }} />
        {/* gridlines */}
        {ticks.map(t => (
          <div key={t} style={{ position: 'absolute', top: 0, bottom: 0, left: `${xOf(t)}%`, borderLeft: t === 0 ? `1.5px solid ${brand.colors.ink}` : `1px dashed ${brand.colors.border}`, opacity: t === 0 ? 0.5 : 1 }} />
        ))}

        {/* markers — the status dot sits EXACTLY on the due month */}
        {placed.map(p => {
          const cy = laneCenterY(p.lane)
          const nearRight = p.xPct > 68
          const isActive = activeId === p.sw.watch.id
          const dated = p.bucket === null
          const sub = p.bucket === 'overdue' ? `${Math.round(Math.abs(p.m))} mo overdue` : formatMonthYear(p.st.due)
          return (
            <div key={p.sw.watch.id} style={{ position: 'absolute', left: `${p.xPct}%`, top: cy }}>
              {dated && (
                <div style={{ position: 'absolute', left: 0, top: 0, width: 1.5, height: Math.max(0, bandH - cy - 4), transform: 'translateX(-50%)', background: p.st.dot, opacity: 0.28 }} />
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
                  <span style={{ fontFamily: sans, fontSize: 12, fontWeight: 600, color: brand.colors.ink }}>{p.sw.watch.brand}</span>
                  <span style={{ fontFamily: sans, fontSize: 12, fontWeight: 500, color: p.st.fg, letterSpacing: '0.02em' }}>{sub}</span>
                </span>
              </button>
            </div>
          )
        })}
        </div>
      </div>
      </div>
      </div>

      {/* legend */}
      <div style={{ display: 'flex', gap: 18, marginTop: 12, flexWrap: 'wrap' }}>
        {[brand.serviceStatus.overdue, brand.serviceStatus.due, brand.serviceStatus.ok].map((s, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: sans, fontSize: 12, color: brand.colors.muted }}>
            <span style={{ width: 7, height: 7, borderRadius: 7, background: s.dot }} />
            {['Overdue', 'Due soon', 'On track'][i]}
          </span>
        ))}
        {beyondN > 0 && <span style={{ fontFamily: sans, fontSize: 12, color: brand.colors.muted, marginLeft: 'auto' }}>{isMobile ? `+${beyondN} past two years` : `${beyondN} resting comfortably past two years`}</span>}
      </div>
    </div>
  )
}
