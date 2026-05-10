'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { brand } from '@/lib/brand'
import { useAuth } from '@/lib/auth/AuthProvider'
import { useCollectionSession } from '@/app/collection/CollectionSessionProvider'

const STORAGE_KEY = 'vwb:syncRibbonDismissed'

export default function SyncRibbon() {
  const { user } = useAuth()
  const { collectionWatches } = useCollectionSession()
  const [hydrated, setHydrated] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    setHydrated(true)
    try {
      setDismissed(sessionStorage.getItem(STORAGE_KEY) === '1')
    } catch {
      // ignore
    }
  }, [])

  if (!hydrated || user || collectionWatches.length === 0 || dismissed) {
    return null
  }

  function handleDismiss() {
    try {
      sessionStorage.setItem(STORAGE_KEY, '1')
    } catch {
      // ignore
    }
    setDismissed(true)
  }

  return (
    <div
      role="region"
      aria-label="Sync your collection"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '9px 16px',
        marginBottom: 12,
        background: brand.colors.goldWash,
        border: `1px solid ${brand.colors.goldLine}`,
        borderRadius: brand.radius.sm,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: brand.colors.gold,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontFamily: brand.font.sans,
          fontSize: 12,
          color: brand.colors.muted,
          letterSpacing: '0.01em',
        }}
      >
        You&rsquo;re collecting locally.
      </span>
      <Link
        href="/auth?next=/collection"
        style={{
          fontFamily: brand.font.sans,
          fontSize: 12,
          fontWeight: 500,
          color: brand.colors.ink,
          textDecoration: 'none',
          letterSpacing: '0.01em',
        }}
      >
        Sync to every device →
      </Link>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss sync reminder"
        style={{
          marginLeft: 'auto',
          width: 24,
          height: 24,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: brand.colors.muted,
          padding: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: brand.radius.sm,
          flexShrink: 0,
        }}
      >
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
          <line x1="3" y1="3" x2="9" y2="9" />
          <line x1="9" y1="3" x2="3" y2="9" />
        </svg>
      </button>
    </div>
  )
}
