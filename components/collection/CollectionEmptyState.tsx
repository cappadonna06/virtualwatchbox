'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { brand } from '@/lib/brand'
import { useCollectionSession } from '@/app/collection/CollectionSessionProvider'
import { WatchboxPreview } from './CollectionWatchboxSurface'

interface Props {
  variant: 'home' | 'collection'
}

export default function CollectionEmptyState({ variant }: Props) {
  if (variant === 'home') {
    return <HomeEmptyState />
  }
  return <CollectionCaptionStrip />
}

function HomeEmptyState() {
  const router = useRouter()
  const { watchboxConfig } = useCollectionSession()

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        padding: '8px 16px 0',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: '100%',
          maxWidth: 360,
          marginBottom: 28,
          opacity: 0.92,
          pointerEvents: 'none',
        }}
      >
        <WatchboxPreview
          frameId={watchboxConfig.frame}
          liningId={watchboxConfig.lining}
          slotCount={watchboxConfig.slotCount}
          slotWidth={64}
        />
      </div>

      <h3
        style={{
          fontFamily: brand.font.serif,
          fontSize: 30,
          fontWeight: 400,
          lineHeight: 1.15,
          color: brand.colors.ink,
          margin: '0 0 10px',
          letterSpacing: '0.005em',
        }}
      >
        Your watchbox, on every device.
      </h3>

      <p
        style={{
          fontFamily: brand.font.sans,
          fontSize: 13,
          color: brand.colors.muted,
          margin: '0 0 24px',
          lineHeight: 1.55,
          maxWidth: 420,
        }}
      >
        Add a watch to open the box. Sign in any time to sync, share, and own your watchbox.
      </p>

      <button
        onClick={() => router.push('/collection/add')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          fontFamily: brand.font.sans,
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          padding: '11px 26px 11px 22px',
          background: brand.colors.ink,
          color: brand.colors.bg,
          border: 'none',
          borderRadius: brand.radius.btn,
          cursor: 'pointer',
          marginBottom: 14,
        }}
      >
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <line x1="7" y1="2.5" x2="7" y2="11.5" />
          <line x1="2.5" y1="7" x2="11.5" y2="7" />
        </svg>
        Add Your First Watch
      </button>

      <Link
        href="/playground"
        style={{
          fontFamily: brand.font.sans,
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: '0.10em',
          textTransform: 'uppercase',
          color: brand.colors.muted,
          textDecoration: 'none',
        }}
      >
        Build a dream box first →
      </Link>
    </div>
  )
}

function CollectionCaptionStrip() {
  return (
    <div
      style={{
        marginTop: 18,
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <Link
        href="/playground"
        style={{
          fontFamily: brand.font.sans,
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: '0.10em',
          textTransform: 'uppercase',
          color: brand.colors.muted,
          textDecoration: 'none',
        }}
      >
        Want to play before committing? Build a dream box first →
      </Link>
    </div>
  )
}
