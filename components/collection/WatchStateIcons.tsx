import type { ReactNode } from 'react'
import type { WatchSavedState } from '@/types/watch'

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

export function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M2 6.1 4.55 8.6 10 3.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function getStateIcon(state: WatchSavedState | null, size: number): ReactNode {
  if (state === 'followed') return <HeartFilledIcon size={size} />
  if (state === 'target') return <TargetIcon size={size} />
  if (state === 'grail') return <CrownIcon size={size} />
  return <HeartOutlineIcon size={size} />
}
