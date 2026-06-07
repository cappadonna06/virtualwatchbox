'use client'

// components/serviceRoom/onboarding/WizardCompletion.tsx
// Wizard completion · "Your schedule is live" — re-derives the resolved list
// from the now-updated session state, showing each watch's real next-service
// month and computed status pill.

import { brand } from '@/lib/brand'
import { formatMonthYear, serviceStatus, type ServiceWatch } from '@/lib/serviceRoom/derive'
import { Icon, StatusChip, WatchShot } from '@/components/serviceRoom/primitives'
import { PrivacyLine } from './onboardingShared'

const sans = brand.font.sans
const serif = brand.font.serif

export function WizardCompletion({ watches, now }: { watches: ServiceWatch[]; now: Date }) {
  const sorted = [...watches].sort((a, b) => serviceStatus(a, now).due.getTime() - serviceStatus(b, now).due.getTime())
  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 8, marginBottom: 24 }}>
        <span style={{ width: 52, height: 52, borderRadius: brand.radius.circle, background: brand.serviceStatus.ok.bg, display: 'grid', placeItems: 'center', marginBottom: 4 }}>
          <Icon name="check" size={24} color={brand.serviceStatus.ok.fg} />
        </span>
        <div style={{ fontFamily: sans, fontSize: brand.text.label, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: brand.serviceStatus.ok.fg }}>All set</div>
        <h3 style={{ fontFamily: serif, fontSize: 30, fontWeight: 400, color: brand.colors.ink, margin: 0 }}>Your schedule is live</h3>
        <p style={{ fontFamily: sans, fontSize: brand.text.body, color: brand.colors.muted, margin: 0, maxWidth: '40ch' }}>Every piece has a next-service date. We&apos;ll keep it current.</p>
      </div>

      <div style={{ border: `1px solid ${brand.colors.border}`, borderRadius: brand.radius.xl, overflow: 'hidden' }}>
        {sorted.map((sw, i) => {
          const st = serviceStatus(sw, now)
          return (
            <div key={sw.watch.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderTop: i > 0 ? `1px solid ${brand.colors.border}` : 'none' }}>
              <WatchShot watch={sw.watch} size={56} shadow="0 4px 10px rgba(26,20,16,0.18)" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: sans, fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: brand.colors.goldDeep }}>{sw.watch.brand}</div>
                <div style={{ fontFamily: serif, fontSize: 18, fontWeight: 400, color: brand.colors.ink, lineHeight: 1.15 }}>{sw.watch.model}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
                <StatusChip status={st} size="sm" />
                <span style={{ fontFamily: sans, fontSize: 12, color: brand.colors.muted, whiteSpace: 'nowrap' }}>
                  {st.key === 'overdue' ? 'Was due ' : 'Next '}<b style={{ fontWeight: 600, color: brand.colors.ink }}>{formatMonthYear(st.due)}</b>
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <PrivacyLine style={{ justifyContent: 'flex-start', marginTop: 20 }} />
    </div>
  )
}
