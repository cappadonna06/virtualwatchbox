'use client'

// components/serviceRoom/onboarding/Screen2Conversion.tsx
// The key onboarding screen: the collector owns watches but has logged no
// service data. Their pieces are shown present-but-unresolved (left), paired
// with the offer that resolves it (right). Opens the wizard.

import { brand } from '@/lib/brand'
import type { ServiceWatch } from '@/lib/serviceRoom/derive'
import { Icon, Meta, WatchShot } from '@/components/serviceRoom/primitives'
import { ChecklistItem, EstimateBadge, Eyebrow, Headline, PrivacyLine, ctaPrimary, goldLink, STRIP_BG } from './onboardingShared'

const sans = brand.font.sans
const serif = brand.font.serif

const CHECKLIST = ['An accurate service schedule', 'A provenance dossier', 'Resale-ready records', 'Warranty tracking']

function piecesLabel(n: number) {
  return `${n} ${n === 1 ? 'piece' : 'pieces'}`
}

function refLine(sw: ServiceWatch) {
  return [sw.watch.reference ? `Ref. ${sw.watch.reference}` : null, sw.watch.caseMaterial].filter(Boolean).join(' · ')
}

type Props = {
  watches: ServiceWatch[]
  onStart: () => void
  onDismiss: () => void
  isMobile: boolean
}

function SchedulePill() {
  const p = brand.serviceStatus.due
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: sans, fontSize: 12, fontWeight: 600,
      letterSpacing: '0.02em', padding: '5px 12px', borderRadius: brand.radius.pill, background: p.bg, color: p.fg, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 6, background: p.dot }} />Schedule not set
    </span>
  )
}

export function Screen2Conversion({ watches, onStart, onDismiss, isMobile }: Props) {
  if (isMobile) return <Screen2Mobile watches={watches} onStart={onStart} onDismiss={onDismiss} />

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.34fr) minmax(0,1fr)', gap: 30, alignItems: 'start' }}>
      {/* Left — unresolved collection */}
      <div style={{ background: brand.colors.white, border: `1px solid ${brand.colors.borderMid}`, borderRadius: brand.radius.xl, boxShadow: brand.shadow.xs, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '20px 26px', borderBottom: `1px solid ${brand.colors.border}` }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span style={{ fontFamily: serif, fontSize: 23, fontWeight: 400, color: brand.colors.ink }}>Your collection</span>
            <span style={{ fontFamily: sans, fontSize: 13, color: brand.colors.muted }}>{piecesLabel(watches.length)}</span>
          </div>
          <SchedulePill />
        </div>

        {watches.map((sw, i) => (
          <button key={sw.watch.id} type="button" onClick={onStart} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 20, padding: '20px 26px', textAlign: 'left',
            borderTop: i > 0 ? `1px solid ${brand.colors.border}` : 'none', background: 'transparent', border: 'none', cursor: 'pointer',
          }}>
            <WatchShot watch={sw.watch} size={88} shadow="0 5px 12px rgba(26,20,16,0.17)" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: sans, fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: brand.colors.goldDeep }}>{sw.watch.brand}</div>
              <div style={{ fontFamily: serif, fontSize: 23, fontWeight: 400, color: brand.colors.ink, lineHeight: 1.15, margin: '2px 0 3px' }}>{sw.watch.model}</div>
              <div style={{ fontFamily: sans, fontSize: 13, color: brand.colors.muted }}>{refLine(sw)}</div>
            </div>
            <div style={{ display: 'flex', gap: 28, flexShrink: 0 }}>
              <Stat label="Last serviced"><span style={{ fontFamily: serif, fontSize: 22, color: brand.colors.borderLight }}>—</span></Stat>
              <Stat label="Next service"><EstimateBadge /></Stat>
            </div>
          </button>
        ))}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 26px', background: STRIP_BG, borderTop: `1px solid ${brand.colors.border}` }}>
          <Icon name="clock" size={14} color={brand.colors.faint} />
          <span style={{ fontFamily: sans, fontSize: 13, color: brand.colors.muted }}>No service history on file yet.</span>
        </div>
      </div>

      {/* Right — offer */}
      <div style={{ background: brand.colors.slot, border: `1px solid ${brand.colors.borderMid}`, borderRadius: brand.radius.xl, boxShadow: brand.shadow.lg, padding: '34px 32px' }}>
        <Eyebrow style={{ marginBottom: 12 }}>Set up the room</Eyebrow>
        <Headline lead="Turn the box into a " em="documented" tail=" collection." size={33} />
        <p style={{ margin: '14px 0 0', fontFamily: sans, fontSize: brand.text.body, lineHeight: 1.6, color: brand.colors.muted }}>You&apos;ve shown what you own. Now make it maintained.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, margin: '26px 0' }}>
          {CHECKLIST.map(c => <ChecklistItem key={c} label={c} />)}
        </div>

        <div style={{ borderTop: `1px solid ${brand.colors.border}`, paddingTop: 22, display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
          <button type="button" onClick={onStart} style={{ ...ctaPrimary, width: '100%' }}>Set up my schedule</button>
          <button type="button" onClick={onDismiss} style={goldLink}>I&apos;ll do this later</button>
          <PrivacyLine />
        </div>
      </div>
    </div>
  )
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 7, minWidth: 84 }}>
      <Meta style={{ fontSize: 11 }}>{label}</Meta>
      {children}
    </div>
  )
}

function Screen2Mobile({ watches, onStart, onDismiss }: { watches: ServiceWatch[]; onStart: () => void; onDismiss: () => void }) {
  return (
    <div style={{ paddingBottom: 132 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        <Meta style={{ color: brand.colors.goldDeep }}>Your collection · {piecesLabel(watches.length)}</Meta>
        <SchedulePill />
      </div>

      <div style={{ background: brand.colors.white, border: `1px solid ${brand.colors.borderMid}`, borderRadius: brand.radius.xl, overflow: 'hidden' }}>
        {watches.map((sw, i) => (
          <button key={sw.watch.id} type="button" onClick={onStart} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', textAlign: 'left',
            borderTop: i > 0 ? `1px solid ${brand.colors.border}` : 'none', background: 'transparent', border: 'none', cursor: 'pointer',
          }}>
            <WatchShot watch={sw.watch} size={68} shadow="0 4px 10px rgba(26,20,16,0.16)" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: sans, fontSize: 10.5, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: brand.colors.goldDeep }}>{sw.watch.brand}</div>
              <div style={{ fontFamily: serif, fontSize: 20, fontWeight: 400, color: brand.colors.ink, lineHeight: 1.15, margin: '1px 0 5px' }}>{sw.watch.model}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Meta style={{ fontSize: 10 }}>Next service</Meta><EstimateBadge />
              </div>
            </div>
          </button>
        ))}
      </div>

      <div style={{ background: brand.colors.paper, borderRadius: 14, padding: '24px 22px', marginTop: 22 }}>
        <Eyebrow isMobile style={{ marginBottom: 10 }}>Set up the room</Eyebrow>
        <Headline lead="Turn the box into a " em="documented" tail=" collection." size={27} isMobile />
        <p style={{ margin: '12px 0 0', fontFamily: sans, fontSize: brand.text.body, lineHeight: 1.6, color: brand.colors.muted }}>You&apos;ve shown what you own. Now make it maintained.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 13, marginTop: 20 }}>
          {CHECKLIST.map(c => <ChecklistItem key={c} label={c} />)}
        </div>
      </div>

      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, background: STRIP_BG,
        borderTop: `1px solid ${brand.colors.border}`, boxShadow: '0 -10px 26px rgba(26,20,16,0.06)',
        padding: '14px 16px calc(12px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center',
      }}>
        <button type="button" onClick={onStart} style={{ ...ctaPrimary, width: '100%' }}>Set up my schedule</button>
        <button type="button" onClick={onDismiss} style={goldLink}>I&apos;ll do this later</button>
        <PrivacyLine style={{ fontSize: 12 }} />
      </div>
    </div>
  )
}
