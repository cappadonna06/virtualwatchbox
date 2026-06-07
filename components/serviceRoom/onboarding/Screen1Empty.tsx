'use client'

// components/serviceRoom/onboarding/Screen1Empty.tsx
// Service Room empty state — no watches yet. Marketing-forward first
// impression: sell the room, preview the payoff (ghosted horizon), then ask
// for the first watch. Shares the empty-state vocabulary of
// CollectionEmptyState / PlaygroundEmptyState.

import Link from 'next/link'
import { brand } from '@/lib/brand'
import { Icon, Meta } from '@/components/serviceRoom/primitives'
import { BenefitRow, Eyebrow, Headline, ctaPrimary, goldLink, STRIP_BG } from './onboardingShared'
import { GhostHorizon } from './GhostHorizon'

const sans = brand.font.sans

const BENEFITS = [
  { icon: 'clock' as const, title: 'Never miss a service', desc: "We estimate every watch's next service date." },
  { icon: 'doc' as const, title: 'A dossier that travels', desc: 'Receipts, warranty cards, and records in one place.' },
  { icon: 'coins' as const, title: "Know what it's worth to keep", desc: 'Lifetime upkeep at a glance, piece by piece.' },
]

const SUB = "A watch is only as good as its records. We keep every service date, paper, and dollar of upkeep, so you don't have to."

export function Screen1Empty({ now, isMobile }: { now: Date; isMobile: boolean }) {
  if (isMobile) return <Screen1Mobile now={now} />

  return (
    <div style={{
      background: brand.colors.white, border: `1px solid ${brand.colors.borderMid}`, borderRadius: brand.radius.xl,
      boxShadow: brand.shadow.lg, padding: 44,
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.08fr) minmax(0,1fr)', gap: 64, alignItems: 'start' }}>
        <div>
          <Eyebrow style={{ marginBottom: 14 }}>The Service Room</Eyebrow>
          <Headline lead="Care is part of the " em="collection" tail="." size={42} style={{ lineHeight: 1.06 }} />
          <p style={{ margin: '16px 0 0', fontFamily: sans, fontSize: brand.text.body, lineHeight: 1.62, color: brand.colors.inkSoft, maxWidth: '46ch' }}>{SUB}</p>
        </div>
        <div>
          <Meta style={{ display: 'block', marginBottom: 16 }}>What the room keeps</Meta>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {BENEFITS.map(b => <BenefitRow key={b.title} {...b} isMobile={false} />)}
          </div>
        </div>
      </div>

      <div style={{ borderTop: `1px solid ${brand.colors.border}`, margin: '36px 0 0', paddingTop: 36 }}>
        <GhostHorizon now={now} isMobile={false} />
      </div>

      <div style={{ borderTop: `1px solid ${brand.colors.border}`, margin: '28px 0 0', paddingTop: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <Link href="/collection/add" style={ctaPrimary}>
          <Icon name="plus" size={14} color={brand.colors.bg} />Add your first watch
        </Link>
        <Link href="/discover" style={goldLink}>Browse the catalog <span aria-hidden>→</span></Link>
      </div>
    </div>
  )
}

function Screen1Mobile({ now }: { now: Date }) {
  return (
    <div style={{ paddingBottom: 96 }}>
      <Eyebrow isMobile style={{ marginBottom: 12 }}>The Service Room</Eyebrow>
      <Headline lead="Care is part of the " em="collection" tail="." size={33} isMobile />
      <p style={{ margin: '14px 0 0', fontFamily: sans, fontSize: brand.text.body, lineHeight: 1.6, color: brand.colors.inkSoft }}>{SUB}</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, margin: '26px 0' }}>
        {BENEFITS.map(b => <BenefitRow key={b.title} {...b} isMobile />)}
      </div>

      <GhostHorizon now={now} isMobile />

      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, background: STRIP_BG,
        borderTop: `1px solid ${brand.colors.border}`, boxShadow: '0 -10px 26px rgba(26,20,16,0.06)',
        padding: '14px 16px calc(14px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center',
      }}>
        <Link href="/collection/add" style={{ ...ctaPrimary, width: '100%' }}>
          <Icon name="plus" size={14} color={brand.colors.bg} />Add your first watch
        </Link>
        <Link href="/discover" style={goldLink}>Browse the catalog <span aria-hidden>→</span></Link>
      </div>
    </div>
  )
}
