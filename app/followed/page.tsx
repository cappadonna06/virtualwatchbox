'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import ResponsiveSidebarSheet from '@/components/collection/ResponsiveSidebarSheet'
import SortDropdown from '@/components/collection/SortDropdown'
import WatchCard from '@/components/collection/WatchCard'
import WatchSidebar from '@/components/collection/WatchSidebar'
import { useIsMobile } from '@/components/collection/useResponsiveState'
import { useCollectionSession } from '@/app/collection/CollectionSessionProvider'
import { brand } from '@/lib/brand'
import { createCatalogDisplayWatch } from '@/lib/watchData'

type SortMode = 'brand' | 'value' | 'type'

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'brand', label: 'Brand' },
  { value: 'value', label: 'Value' },
  { value: 'type', label: 'Type' },
]

export default function FollowedPage() {
  const isMobile = useIsMobile()
  const {
    followedWatches,
    selectedWatchId,
    setSelectedWatchId,
  } = useCollectionSession()

  const [sortBy, setSortBy] = useState<SortMode>('brand')

  const displayWatches = useMemo(() => {
    const sorted = followedWatches.map(createCatalogDisplayWatch)

    if (sortBy === 'brand') sorted.sort((a, b) => a.brand.localeCompare(b.brand))
    else if (sortBy === 'value') sorted.sort((a, b) => b.estimatedValue - a.estimatedValue)
    else sorted.sort((a, b) => a.watchType.localeCompare(b.watchType))

    return sorted
  }, [followedWatches, sortBy])

  const activeSlot = selectedWatchId ? displayWatches.findIndex(watch => watch.id === selectedWatchId) : -1
  const activeWatch = activeSlot >= 0 ? displayWatches[activeSlot] : null

  function handleCardSelect(index: number) {
    const watch = displayWatches[index]
    if (!watch) return
    setSelectedWatchId(selectedWatchId === watch.id ? null : watch.id)
  }

  if (displayWatches.length === 0) {
    return (
      <div className="collection-section" style={{ padding: isMobile ? '24px 20px 96px' : '56px 56px 120px', borderTop: `1px solid ${brand.colors.border}` }}>
        <div
          style={{
            maxWidth: 720,
            margin: '0 auto',
            padding: '40px 32px',
            borderRadius: brand.radius.xl,
            border: `1px solid ${brand.colors.border}`,
            background: brand.colors.white,
            textAlign: 'center',
          }}
        >
          <div style={{ fontFamily: brand.font.sans, fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: brand.colors.muted, marginBottom: 8 }}>
            Followed Watches
          </div>
          <h1 style={{ fontFamily: brand.font.serif, fontSize: 40, fontWeight: 400, color: brand.colors.ink, lineHeight: 1.05, margin: '0 0 12px' }}>
            Nothing followed yet.
          </h1>
          <p style={{ margin: '0 0 22px', fontFamily: brand.font.sans, fontSize: 13, color: brand.colors.muted, lineHeight: 1.7 }}>
            Save watches from the homepage, Collection, or Playground flows and they&apos;ll collect here as your canonical aspirational pool.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
            <Link
              href="/collection/add"
              style={{
                padding: '10px 16px',
                borderRadius: brand.radius.btn,
                background: brand.colors.ink,
                color: brand.colors.bg,
                fontFamily: brand.font.sans,
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                textDecoration: 'none',
              }}
            >
              Find a Watch
            </Link>
            <Link
              href="/playground"
              style={{
                padding: '10px 16px',
                borderRadius: brand.radius.btn,
                border: `1px solid ${brand.colors.borderLight}`,
                color: brand.colors.ink,
                fontFamily: brand.font.sans,
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                textDecoration: 'none',
              }}
            >
              Open Playground
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="collection-section" style={{ padding: isMobile ? '24px 20px 96px' : '56px 56px 120px', borderTop: `1px solid ${brand.colors.border}` }}>
      <div style={{ marginBottom: 28 }}>
        <Link
          href="/collection"
          style={{
            display: 'inline-block',
            fontFamily: brand.font.sans,
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: brand.colors.muted,
            textDecoration: 'none',
            marginBottom: 10,
          }}
        >
          Collection →
        </Link>
        <h1 style={{ fontFamily: brand.font.serif, fontSize: 42, fontWeight: 400, color: brand.colors.ink, lineHeight: 1.05, margin: '0 0 6px' }}>
          Followed Watches
        </h1>
        <p style={{ margin: 0, fontFamily: brand.font.sans, fontSize: 13, color: brand.colors.muted }}>
          Your canonical aspirational pool. Promote up to three Next Targets and keep one Grail in focus.
        </p>
      </div>

      <div className="collection-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 32, alignItems: 'start' }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ fontFamily: brand.font.sans, fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: brand.colors.muted }}>
              {displayWatches.length} followed {displayWatches.length === 1 ? 'watch' : 'watches'}
            </div>
            <SortDropdown
              value={sortBy}
              options={SORT_OPTIONS}
              onChange={value => setSortBy(value as SortMode)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18 }}>
            {displayWatches.map((watch, index) => (
              <div key={watch.id}>
                <WatchCard
                  watch={watch}
                  mode="saved"
                  stateSource="profile"
                  isActive={activeSlot === index}
                  onSelect={() => handleCardSelect(index)}
                />
              </div>
            ))}
          </div>
        </div>

        {activeWatch ? (
          <ResponsiveSidebarSheet active={Boolean(activeWatch)} onClose={() => setSelectedWatchId(null)}>
            <WatchSidebar
              watch={activeWatch}
              sticky={false}
              catalogWatchId={activeWatch?.watchId ?? null}
              mode="followed"
            />
          </ResponsiveSidebarSheet>
        ) : isMobile ? null : <div />}
      </div>
    </div>
  )
}
