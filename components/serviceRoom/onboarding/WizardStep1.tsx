'use client'

// components/serviceRoom/onboarding/WizardStep1.tsx
// Wizard Step 1 · "Set the clock" — the minimum needed to estimate a schedule.
// An "interval for all" control + one row per watch (last full service date +
// per-watch interval). Every row is skippable.

import type { CSSProperties } from 'react'
import { brand } from '@/lib/brand'
import { formatMonthYear, type ServiceWatch } from '@/lib/serviceRoom/derive'
import type { ServiceIntervalYears } from '@/types/watch'
import { Icon, Meta, WatchShot } from '@/components/serviceRoom/primitives'
import { EstimateBadge, IntervalToggle } from './onboardingShared'
import type { WizardDraft } from './wizardDraft'

const sans = brand.font.sans
const serif = brand.font.serif

const dateInput: CSSProperties = {
  width: '100%', fontFamily: sans, fontSize: 15, color: brand.colors.ink, background: brand.colors.white,
  border: `1px solid ${brand.colors.borderLight}`, borderRadius: brand.radius.md, padding: '9px 12px', outline: 'none',
}

type Props = {
  watches: ServiceWatch[]
  draft: WizardDraft
  allInterval: ServiceIntervalYears
  onAllInterval: (y: ServiceIntervalYears) => void
  patchWatch: (id: string, partial: Partial<WizardDraft[string]>) => void
  isMobile: boolean
}

export function WizardStep1({ watches, draft, allInterval, onAllInterval, patchWatch, isMobile }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* set one interval for all */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
        background: brand.colors.paper, borderRadius: brand.radius.lg, padding: '14px 16px', marginBottom: 8,
      }}>
        <div>
          <div style={{ fontFamily: sans, fontSize: 14.5, fontWeight: 600, color: brand.colors.ink }}>Set one interval for all</div>
          <div style={{ fontFamily: sans, fontSize: 12.5, color: brand.colors.muted, marginTop: 2 }}>Most automatics run a 5-year cadence.</div>
        </div>
        <IntervalToggle value={allInterval} onChange={onAllInterval} />
      </div>

      {watches.map((sw, i) => {
        const d = draft[sw.watch.id]
        if (!d) return null
        const skipped = d.step1Skipped
        return (
          <div key={sw.watch.id} style={{ borderTop: i > 0 ? `1px solid ${brand.colors.border}` : 'none', padding: '18px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <WatchShot watch={sw.watch} size={56} shadow="0 4px 10px rgba(26,20,16,0.18)" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: serif, fontSize: 18, fontWeight: 400, color: brand.colors.ink, lineHeight: 1.2 }}>{sw.watch.brand} {sw.watch.model}</div>
                {sw.watch.reference && <div style={{ fontFamily: sans, fontSize: 12, color: brand.colors.muted }}>Ref. {sw.watch.reference}</div>}
              </div>
              <button type="button" onClick={() => patchWatch(sw.watch.id, { step1Skipped: !skipped })} style={{
                fontFamily: sans, fontSize: 12.5, fontWeight: 500, color: skipped ? brand.colors.goldDeep : brand.colors.muted,
                background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 2px', flexShrink: 0,
              }}>{skipped ? 'Undo' : 'Skip'}</button>
            </div>

            {!skipped && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr auto', gap: 16, alignItems: 'end', marginTop: 14 }}>
                  <Field label="Last full service">
                    {d.usePurchaseDate ? (
                      <div style={{ ...dateInput, display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: brand.colors.muted, background: brand.colors.paper }}>
                        <span>Purchase date · {formatMonthYear(sw.watch.purchaseDate)}</span>
                        <Icon name="calendar" size={15} color={brand.colors.muted} />
                      </div>
                    ) : (
                      <input
                        type="date"
                        value={d.lastServiceDate ?? ''}
                        max={new Date().toISOString().slice(0, 10)}
                        onChange={e => patchWatch(sw.watch.id, { lastServiceDate: e.target.value || null })}
                        style={dateInput}
                      />
                    )}
                  </Field>
                  <Field label="Service every">
                    <IntervalToggle value={d.intervalYears} onChange={y => patchWatch(sw.watch.id, { intervalYears: y, intervalTouched: true })} />
                  </Field>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginTop: 11 }}>
                  <Checkbox
                    checked={d.usePurchaseDate}
                    onChange={v => patchWatch(sw.watch.id, { usePurchaseDate: v, ...(v ? { lastServiceDate: null } : {}) })}
                    label="Never serviced or not sure? Use purchase date"
                  />
                  {d.usePurchaseDate && <EstimateBadge />}
                </div>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Meta style={{ display: 'block', marginBottom: 8, fontSize: 11 }}>{label}</Meta>
      {children}
    </div>
  )
}

function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} style={{
      display: 'inline-flex', alignItems: 'center', gap: 9, fontFamily: sans, fontSize: 13, color: brand.colors.ink,
      background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
    }}>
      <span style={{
        width: 18, height: 18, borderRadius: 5, flexShrink: 0, display: 'grid', placeItems: 'center',
        background: checked ? brand.colors.ink : brand.colors.white,
        border: `1px solid ${checked ? brand.colors.ink : brand.colors.borderLight}`,
      }}>
        {checked && <Icon name="check" size={12} color={brand.colors.slot} />}
      </span>
      {label}
    </button>
  )
}
