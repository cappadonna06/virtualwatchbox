'use client'

import { brand } from '@/lib/brand'
import { useIsMobile } from './useResponsiveState'

const BENEFITS = [
  { title: 'No limits', desc: 'Grails included. No ownership needed.', Icon: StarIcon },
  { title: 'Mix freely', desc: 'Any brand, any era, together.', Icon: ShuffleIcon },
  { title: 'Saved for you', desc: 'Synced across your devices.', Icon: BookmarkIcon },
]

type PlaygroundEmptyStateProps = {
  collectionWatchCount: number
  onBuild: () => void
  onImport: () => void
}

export default function PlaygroundEmptyState({ collectionWatchCount, onBuild, onImport }: PlaygroundEmptyStateProps) {
  const isMobile = useIsMobile()

  return (
    <div
      style={{
        background: brand.colors.white,
        border: `1px solid ${brand.colors.borderMid}`,
        borderRadius: brand.radius.xl,
        boxShadow: brand.shadow.lg,
        padding: isMobile ? '26px 22px' : '32px 30px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          fontFamily: brand.font.sans,
          fontSize: isMobile ? brand.text.labelSm : brand.text.label,
          fontWeight: 600,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: brand.colors.goldDeep,
          marginBottom: 12,
        }}
      >
        Your dream box
      </div>
      <h3
        style={{
          fontFamily: brand.font.serif,
          fontSize: isMobile ? 28 : 32,
          fontWeight: 400,
          lineHeight: 1.08,
          color: brand.colors.ink,
          margin: 0,
        }}
      >
        Picture your <em style={{ fontStyle: 'italic' }}>next move.</em>
      </h3>
      <p
        style={{
          margin: '12px 0 0',
          fontFamily: brand.font.sans,
          fontSize: brand.text.body,
          lineHeight: 1.6,
          color: brand.colors.inkSoft,
          maxWidth: '34ch',
        }}
      >
        Swap in a grail or preview the piece you&rsquo;re eyeing. See it in your box before you buy.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 12 : 15, marginTop: 22 }}>
        {BENEFITS.map(({ title, desc, Icon }) => (
          <div key={title} style={{ display: 'flex', gap: 13, alignItems: 'flex-start' }}>
            <span
              style={{
                flexShrink: 0,
                width: isMobile ? 30 : 34,
                height: isMobile ? 30 : 34,
                borderRadius: 9,
                background: brand.colors.paperWarm,
                color: brand.colors.goldDeep,
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <Icon />
            </span>
            <div>
              <div style={{ fontFamily: brand.font.sans, fontSize: isMobile ? 13.5 : brand.text.body, fontWeight: 600, color: brand.colors.ink }}>
                {title}
              </div>
              <div style={{ marginTop: 1, fontFamily: brand.font.sans, fontSize: isMobile ? brand.text.label : brand.text.bodySm, color: brand.colors.muted, lineHeight: 1.5 }}>
                {desc}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button
          onClick={onBuild}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            fontFamily: brand.font.sans,
            fontSize: brand.text.label,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding: '14px 28px',
            background: brand.colors.ink,
            color: brand.colors.bg,
            border: 'none',
            borderRadius: 5,
            cursor: 'pointer',
          }}
        >
          <StarIcon size={14} />
          Build this box
        </button>
        <button
          onClick={onImport}
          style={{
            fontFamily: brand.font.sans,
            fontSize: brand.text.label,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: brand.colors.goldDeep,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          {collectionWatchCount > 0 ? `Import your collection (${collectionWatchCount}) →` : 'Import your collection →'}
        </button>
      </div>
    </div>
  )
}

function StarIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l2.4 5.7 6.1.5-4.7 4 1.5 6L12 16l-5.3 3.2 1.5-6-4.7-4 6.1-.5L12 3z" />
    </svg>
  )
}

function ShuffleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 4h4v4" />
      <path d="M4 20 20 4" />
      <path d="M16 20h4v-4" />
      <path d="m4 4 5 5" />
      <path d="m15 15 5 5" />
    </svg>
  )
}

function BookmarkIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 4h12v16l-6-4-6 4V4z" />
    </svg>
  )
}
