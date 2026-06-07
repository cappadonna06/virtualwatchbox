'use client'

// components/serviceRoom/onboarding/GhostHorizon.tsx
// Screen 1's decorative "preview of your service horizon". Desktop reuses the
// real ServiceHorizon (placement math intact) rendered faded + non-interactive
// with hand-rolled sample watches; mobile shows a small vertical agenda list.
// SAMPLE_GHOST_WATCHES are fabricated for display only and are NEVER persisted.

import { useEffect, useState } from 'react'
import { brand } from '@/lib/brand'
import { addMonths, formatMonthYear, serviceStatus, type ServiceWatch } from '@/lib/serviceRoom/derive'
import type { ResolvedOwnedWatch, ServiceIntervalYears } from '@/types/watch'
import { Meta, WatchShot } from '@/components/serviceRoom/primitives'
import { ServiceHorizon } from '@/components/serviceRoom/ServiceHorizon'

const sans = brand.font.sans

function sampleWatch(
  id: string, brandName: string, model: string, reference: string, dialColor: string,
  monthsSincePurchase: number, intervalYears: ServiceIntervalYears, now: Date,
): ServiceWatch {
  const purchase = addMonths(now, -monthsSincePurchase)
  const watch: ResolvedOwnedWatch = {
    id, watchId: id, brand: brandName, model, reference,
    caseSizeMm: 40, caseMaterial: 'Steel', dialColor, movement: 'Automatic',
    complications: [], estimatedValue: 0,
    dialConfig: { dialColor, markerColor: '#C9A84C', handColor: '#C9A84C' },
    watchType: 'Dress', condition: 'Excellent', notes: '',
    purchaseDate: purchase.toISOString().slice(0, 10), purchasePrice: 0,
    ownershipStatus: 'Owned', slot: 0,
  }
  return { watch, records: [], documents: [], intervalYears }
}

// Spread across the zones: overdue · due-soon · on-track · on-track (far).
export function sampleGhostWatches(now: Date): ServiceWatch[] {
  return [
    sampleWatch('ghost-ap', 'Audemars Piguet', 'Royal Oak Offshore', '26170ST', '#23314A', 67, 5, now),
    sampleWatch('ghost-omega', 'Omega', 'Speedmaster', '3551.20.00', '#111111', 56, 5, now),
    sampleWatch('ghost-rolex', 'Rolex', 'Datejust 41', '126331', '#4A6FA5', 45, 5, now),
    sampleWatch('ghost-patek', 'Patek Philippe', 'Calatrava', '6000G-012', '#E9E4D8', 38, 5, now),
  ]
}

export function GhostHorizon({ now, isMobile }: { now: Date; isMobile: boolean }) {
  const samples = sampleGhostWatches(now)
  // The horizon renders watch dials (DialSVG), whose trig coordinates serialize
  // to subtly different float strings on the server vs the client. As a purely
  // decorative preview, render it only after mount to avoid a hydration
  // mismatch; reserve height so nothing shifts.
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  return (
    <div>
      <Meta style={{ display: 'block', textAlign: 'center', color: brand.colors.goldDeep, marginBottom: 14 }}>
        A preview of your service horizon
      </Meta>
      {!mounted ? (
        <div aria-hidden="true" style={{ minHeight: isMobile ? 186 : 215 }} />
      ) : isMobile ? (
        <GhostAgendaList watches={samples.slice(0, 3)} now={now} />
      ) : (
        <div aria-hidden="true" style={{ filter: 'grayscale(.35)', opacity: 0.62, pointerEvents: 'none', userSelect: 'none' }}>
          <ServiceHorizon watches={samples} now={now} onPick={() => {}} activeId={null} isMobile={false} />
        </div>
      )}
      <p style={{ fontFamily: sans, fontSize: brand.text.bodySm, color: brand.colors.muted, textAlign: 'center', margin: '14px 0 0' }}>
        Each watch lands on the horizon, marked by when it&apos;s next due.
      </p>
    </div>
  )
}

function GhostAgendaList({ watches, now }: { watches: ServiceWatch[]; now: Date }) {
  return (
    <div aria-hidden="true" style={{
      border: `1px solid ${brand.colors.border}`, borderRadius: brand.radius.xl, overflow: 'hidden',
      filter: 'grayscale(.35)', opacity: 0.7, userSelect: 'none',
    }}>
      {watches.map((sw, i) => {
        const st = serviceStatus(sw, now)
        return (
          <div key={sw.watch.id} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
            borderTop: i > 0 ? `1px solid ${brand.colors.border}` : 'none', background: brand.colors.white,
          }}>
            <WatchShot watch={sw.watch} size={38} shadow="0 2px 5px rgba(26,20,16,0.18)" />
            <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1, lineHeight: 1.25 }}>
              <span style={{ fontFamily: sans, fontSize: 13, fontWeight: 600, color: brand.colors.ink }}>{sw.watch.brand}</span>
              <span style={{ fontFamily: sans, fontSize: 12, color: brand.colors.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sw.watch.model}</span>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: sans, fontSize: 12, fontWeight: 600, color: st.fg, whiteSpace: 'nowrap' }}>
              <span style={{ width: 7, height: 7, borderRadius: 7, background: st.dot }} />
              {st.key === 'overdue' ? 'Overdue' : formatMonthYear(st.due)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
