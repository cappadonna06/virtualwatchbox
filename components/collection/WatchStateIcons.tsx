import type { ReactNode } from 'react'
import type { WatchSavedState } from '@/types/watch'
import { brand } from '@/lib/brand'

export function HeartOutlineIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 20.5s-6.8-4.35-9.22-8.05C.92 9.63 2.03 5.5 6.2 5.5c2.07 0 3.34 1.07 4.16 2.28.82-1.21 2.09-2.28 4.16-2.28 4.17 0 5.28 4.13 3.42 6.95C18.8 16.15 12 20.5 12 20.5z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function HeartFilledIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 20.5s-6.8-4.35-9.22-8.05C.92 9.63 2.03 5.5 6.2 5.5c2.07 0 3.34 1.07 4.16 2.28.82-1.21 2.09-2.28 4.16-2.28 4.17 0 5.28 4.13 3.42 6.95C18.8 16.15 12 20.5 12 20.5z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function TargetIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="7.25" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="2.2" fill="currentColor" />
      <path d="M12 3v3.2M12 17.8V21M3 12h3.2M17.8 12H21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function CrownIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3 12.2h10l-.95-5.2-2.4 1.75L8 4.1 6.35 8.75 3.95 7 3 12.2z"
        fill="currentColor"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="0.45"
      />
    </svg>
  )
}

export function JewelIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M4.05 5.1L6.22 2.7h3.56l2.17 2.4-3.95 7.2-3.95-7.2z"
        fill="currentColor"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="0.45"
      />
      <path d="M4.05 5.1h7.9M6.22 2.7 8 5.1l1.78-2.4" stroke="rgba(255,255,255,0.42)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.5" />
    </svg>
  )
}

export function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M2 6.1 4.55 8.6 10 3.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function getStateLabel(state: WatchSavedState): string {
  if (state === 'target') return 'Target'
  if (state === 'grail') return 'Grail'
  if (state === 'jewel') return 'Jewel'
  return 'Followed'
}

export function IntentBadge({
  state,
  compact = false,
  iconOnly = false,
}: {
  state: Extract<WatchSavedState, 'grail' | 'jewel'>
  compact?: boolean
  iconOnly?: boolean
}) {
  const label = getStateLabel(state)
  const icon = state === 'grail'
    ? <CrownIcon size={compact ? 11 : 12} />
    : <JewelIcon size={compact ? 11 : 12} />

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: iconOnly ? 0 : 5,
        padding: compact
          ? iconOnly
            ? '4px 5px'
            : '4px 8px'
          : '5px 10px',
        borderRadius: brand.radius.pill,
        background: brand.colors.slot,
        border: `1px solid ${brand.colors.goldLine}`,
        color: brand.colors.gold,
        boxShadow: brand.shadow.xs,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </span>
      {!iconOnly && (
        <span
          style={{
            fontFamily: brand.font.sans,
            fontSize: compact ? 8 : 9,
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            lineHeight: 1,
          }}
        >
          {label}
        </span>
      )}
    </span>
  )
}

export function getStateIcon(state: WatchSavedState | null, size: number): ReactNode {
  if (state === 'followed') return <HeartFilledIcon size={size} />
  if (state === 'target') return <TargetIcon size={size} />
  if (state === 'grail') return <CrownIcon size={size} />
  if (state === 'jewel') return <JewelIcon size={size} />
  return <HeartOutlineIcon size={size} />
}
