'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { brand } from '@/lib/brand'
import NewsCard from '@/components/NewsCard'
import NewsCardSkeleton from '@/components/NewsCardSkeleton'
import NewsHeroCard from '@/components/NewsHeroCard'
import NewsModeTabs, { type NewsMode } from '@/components/NewsModeTabs'
import NewsSourcePills from '@/components/NewsSourcePills'
import NewsFilterBar from '@/components/NewsFilterBar'
import { useCollectionSession } from '@/app/collection/CollectionSessionProvider'
import { useAuth } from '@/lib/auth/AuthProvider'
import { getCollectionBrands, getDemoCollectionBrands } from '@/lib/collectionBrands'
import type { NewsItem, SourceName } from '@/types/news'

type Pill = 'All' | SourceName

const SPONSORED_STUB: NewsItem = {
  id: 'sponsored-chrono24',
  source: 'Hodinkee', // placeholder; visible source label is overridden below
  title: 'Explore watches on Chrono24',
  excerpt:
    "The world's largest marketplace for luxury watches — over 500,000 references from trusted dealers and private sellers.",
  url: 'https://chrono24.com',
  publishedAt: new Date().toISOString(),
  imageUrl: undefined,
  author: 'Chrono24',
  tags: { brands: [], references: [], categories: [] },
}
const SPONSORED_DISPLAY_SOURCE = 'Chrono24'

export default function NewsPage() {
  const { user } = useAuth()
  const session = useCollectionSession()

  // ---- data fetch ----
  const [items, setItems] = useState<NewsItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const ctrl = new AbortController()
    let alive = true
    setError(null)
    setItems(null)

    fetch('/api/news', { signal: ctrl.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return (await res.json()) as NewsItem[]
      })
      .then((data) => {
        if (!alive) return
        setItems(Array.isArray(data) ? data : [])
      })
      .catch((err) => {
        if (!alive) return
        if ((err as { name?: string }).name === 'AbortError') return
        console.error('[news] fetch failed', err)
        setError("Couldn't load feed.")
      })

    return () => {
      alive = false
      ctrl.abort()
    }
  }, [reloadKey])

  const retry = useCallback(() => setReloadKey((k) => k + 1), [])

  // ---- collection brand context ----
  const realCollectionBrands = useMemo(
    () => getCollectionBrands(session.collectionWatches),
    [session.collectionWatches],
  )
  const isGuest = !user
  const usingDemoBrands = realCollectionBrands.length === 0
  const personalBrands = useMemo(
    () => (usingDemoBrands ? getDemoCollectionBrands() : realCollectionBrands),
    [usingDemoBrands, realCollectionBrands],
  )
  const forYouAvailable = personalBrands.length > 0

  // ---- mode / filter state ----
  const [mode, setMode] = useState<NewsMode>('all')
  const [search, setSearch] = useState('')
  const [brandFilter, setBrandFilter] = useState('all')
  const [sourcePill, setSourcePill] = useState<Pill>('All')

  // Once items load, auto-pick For You for users with a real collection.
  useEffect(() => {
    if (!items) return
    if (!user) return
    if (realCollectionBrands.length === 0) return
    setMode((m) => (m === 'all' ? 'for-you' : m))
  }, [items, user, realCollectionBrands.length])

  // Reset secondary filters when mode changes
  useEffect(() => {
    setBrandFilter('all')
    setSearch('')
    setSourcePill('All')
  }, [mode])

  // ---- filter pipeline ----
  const stage1 = useMemo<NewsItem[]>(() => {
    if (!items) return []
    if (mode === 'for-you') {
      if (personalBrands.length === 0) return []
      const lower = personalBrands.map((b) => b.toLowerCase())
      return items.filter((i) =>
        i.tags.brands.some((b) => lower.includes(b.toLowerCase())),
      )
    }
    return items
  }, [items, mode, personalBrands])

  const brandOptionsForDropdown = useMemo(() => {
    const counts = new Map<string, number>()
    for (const i of stage1) for (const b of i.tags.brands) counts.set(b, (counts.get(b) ?? 0) + 1)
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([b]) => b)
  }, [stage1])

  const stage2 = useMemo(() => {
    if (brandFilter === 'all') return stage1
    return stage1.filter((i) =>
      i.tags.brands.some((b) => b.toLowerCase() === brandFilter.toLowerCase()),
    )
  }, [stage1, brandFilter])

  const stage3 = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return stage2
    return stage2.filter((i) => {
      const hay = [
        i.title,
        i.excerpt,
        i.author ?? '',
        i.tags.brands.join(' '),
        i.tags.references.join(' '),
      ]
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [stage2, search])

  const featured = stage3[0] ?? null

  const sourceCounts = useMemo(() => {
    const c: Record<SourceName, number> = {
      Hodinkee: 0,
      'Worn & Wound': 0,
      Fratello: 0,
      Monochrome: 0,
      ABTW: 0,
    }
    for (const i of stage3) if (i.source in c) c[i.source]++
    return c
  }, [stage3])

  const stage4 = useMemo(() => {
    if (sourcePill === 'All') return stage3
    return stage3.filter((i) => i.source === sourcePill)
  }, [stage3, sourcePill])

  const grid = useMemo(() => {
    if (!featured) return stage4
    return stage4.filter((i) => i.id !== featured.id)
  }, [stage4, featured])

  const interleaved = useMemo(() => interleaveSponsored(grid), [grid])

  // ---- render ----
  const articleCount = items ? stage3.length : null

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 24px 80px' }}>
      <Header articleCount={articleCount} />

      <div style={{ marginBottom: 16 }}>
        <NewsModeTabs mode={mode} onChange={setMode} forYouAvailable={forYouAvailable} />
      </div>

      {mode === 'for-you' && forYouAvailable && (
        <ContextBanner
          isDemo={isGuest && usingDemoBrands}
          isEmpty={!isGuest && usingDemoBrands}
          brands={personalBrands}
        />
      )}

      {/* Loading skeleton (whole page) */}
      {!items && !error && <LoadingState />}

      {/* Error */}
      {error && <ErrorState message={error} onRetry={retry} />}

      {/* Empty after mode-filter (no results in For You / All before user touches anything) */}
      {items && !error && stage1.length === 0 && (
        <EmptyState
          mode={mode}
          forYouAvailable={forYouAvailable}
          onSwitchToAll={() => setMode('all')}
        />
      )}

      {/* Loaded with content */}
      {items && !error && stage1.length > 0 && (
        <>
          {/* Hero leads. Picked from stage3 so search/brand still apply. */}
          {featured ? (
            <div style={{ marginBottom: 24 }}>
              <NewsHeroCard item={featured} />
            </div>
          ) : (
            <div
              style={{
                marginBottom: 24,
                padding: '40px 20px',
                background: brand.colors.slot,
                border: `1px dashed ${brand.colors.borderLight}`,
                borderRadius: brand.radius.lg,
                textAlign: 'center',
                fontFamily: brand.font.sans,
                fontSize: 13,
                color: brand.colors.muted,
              }}
            >
              No articles match those filters.
            </div>
          )}

          {/* Unified filter panel — sits directly above the grid it filters */}
          <FilterPanel
            search={search}
            onSearchChange={setSearch}
            brandValue={brandFilter}
            onBrandChange={setBrandFilter}
            brandOptions={brandOptionsForDropdown}
            sourcePill={sourcePill}
            onSourceChange={setSourcePill}
            sourceCounts={sourceCounts}
            totalCount={stage3.length}
          />

          {/* Grid */}
          {grid.length > 0 ? (
            <div className="news-grid">
              {interleaved.map((entry) => {
                if (entry.kind === 'sponsored') {
                  const sponsoredItem: NewsItem = {
                    ...SPONSORED_STUB,
                    id: `${SPONSORED_STUB.id}-${entry.position}`,
                    source: SPONSORED_DISPLAY_SOURCE as SourceName,
                  }
                  return (
                    <NewsCard
                      key={sponsoredItem.id}
                      item={sponsoredItem}
                      variant="full"
                      sponsored
                    />
                  )
                }
                return <NewsCard key={entry.item.id} item={entry.item} variant="full" />
              })}
            </div>
          ) : (
            <p
              style={{
                marginTop: 12,
                fontFamily: brand.font.sans,
                fontSize: 13,
                color: brand.colors.muted,
                textAlign: 'center',
              }}
            >
              {featured
                ? "That's the only story matching these filters."
                : 'No more stories. Try clearing a filter.'}
            </p>
          )}
        </>
      )}
    </div>
  )
}

// ----------------------------------------------------------------------------
// Filter panel — search + brand + source pills, framed with hairlines
// ----------------------------------------------------------------------------

function FilterPanel({
  search,
  onSearchChange,
  brandValue,
  onBrandChange,
  brandOptions,
  sourcePill,
  onSourceChange,
  sourceCounts,
  totalCount,
}: {
  search: string
  onSearchChange: (v: string) => void
  brandValue: string
  onBrandChange: (v: string) => void
  brandOptions: string[]
  sourcePill: Pill
  onSourceChange: (p: Pill) => void
  sourceCounts: Record<SourceName, number>
  totalCount: number
}) {
  return (
    <div
      className="news-filter-panel"
      style={{
        marginBottom: 24,
        padding: '16px 0 18px',
        borderTop: `1px solid ${brand.colors.border}`,
        borderBottom: `1px solid ${brand.colors.border}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <NewsFilterBar
        search={search}
        onSearchChange={onSearchChange}
        brandValue={brandValue}
        onBrandChange={onBrandChange}
        brandOptions={brandOptions}
      />
      <NewsSourcePills
        active={sourcePill}
        counts={sourceCounts}
        totalCount={totalCount}
        onChange={onSourceChange}
      />
    </div>
  )
}

// ----------------------------------------------------------------------------
// Sub-components
// ----------------------------------------------------------------------------

function Header({ articleCount }: { articleCount: number | null }) {
  return (
    <header style={{ marginBottom: 24 }}>
      <div
        style={{
          fontFamily: brand.font.sans,
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: brand.colors.muted,
          marginBottom: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <span>From the Watch World</span>
        <span style={{ width: 24, height: 1, background: brand.colors.borderLight }} />
        <span style={{ color: brand.colors.muted }}>
          Live · updated every 15 min
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
        <h1
          style={{
            margin: 0,
            fontFamily: brand.font.serif,
            fontSize: 42,
            fontWeight: 400,
            lineHeight: 1.1,
            color: brand.colors.ink,
            letterSpacing: '-0.01em',
          }}
        >
          Horological <em>Intelligence.</em>
        </h1>
        {articleCount !== null && (
          <span
            style={{
              fontFamily: brand.font.sans,
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: brand.colors.muted,
              padding: '4px 10px',
              border: `1px solid ${brand.colors.borderLight}`,
              borderRadius: brand.radius.pill,
              background: brand.colors.white,
            }}
          >
            {articleCount} {articleCount === 1 ? 'article' : 'articles'}
          </span>
        )}
      </div>
      <p
        style={{
          margin: '10px 0 0',
          fontFamily: brand.font.sans,
          fontSize: 13,
          lineHeight: 1.6,
          color: brand.colors.muted,
          maxWidth: 520,
        }}
      >
        The watch world&apos;s best writing, in one place.
      </p>
    </header>
  )
}

function ContextBanner({
  isDemo,
  isEmpty,
  brands,
}: {
  isDemo: boolean
  isEmpty: boolean
  brands: string[]
}) {
  const visible = brands.slice(0, 4)
  const overflow = brands.length - visible.length

  let prefix = 'Filtering by your brands'
  if (isDemo) prefix = 'Demo personalization · sample brands'
  else if (isEmpty) prefix = 'No collection yet · showing demo brands'

  return (
    <div
      style={{
        marginBottom: 20,
        padding: '10px 14px',
        background: brand.colors.goldWash,
        border: `1px solid ${brand.colors.goldLine}`,
        borderRadius: brand.radius.md,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        alignItems: 'center',
        fontFamily: brand.font.sans,
        fontSize: 12,
      }}
    >
      <span
        style={{
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: brand.colors.muted,
          marginRight: 4,
        }}
      >
        {prefix}
      </span>
      {visible.map((b) => (
        <span
          key={b}
          style={{
            padding: '3px 10px',
            background: 'rgba(201,168,76,0.18)',
            color: brand.colors.gold,
            borderRadius: brand.radius.pill,
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.04em',
          }}
        >
          {b}
        </span>
      ))}
      {overflow > 0 && (
        <span style={{ color: brand.colors.muted, fontSize: 11 }}>+{overflow} more</span>
      )}
      {isEmpty && (
        <Link
          href="/collection/add"
          style={{
            marginLeft: 'auto',
            color: brand.colors.ink,
            fontSize: 12,
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          Add a watch →
        </Link>
      )}
    </div>
  )
}

function LoadingState() {
  return (
    <>
      <div
        aria-hidden
        style={{
          width: '100%',
          aspectRatio: '16 / 9',
          background: brand.colors.slot,
          border: `1px dashed ${brand.colors.borderLight}`,
          borderRadius: brand.radius.lg,
          marginBottom: 28,
          animation: 'vw-news-pulse 1.4s ease-in-out infinite',
        }}
      />
      <div className="news-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <NewsCardSkeleton key={i} variant="full" />
        ))}
      </div>
    </>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 14,
        padding: '60px 20px',
      }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: brand.font.serif,
          fontSize: 22,
          color: brand.colors.ink,
        }}
      >
        {message}
      </p>
      <button
        onClick={onRetry}
        style={{
          padding: '8px 18px',
          background: brand.colors.ink,
          color: brand.colors.bg,
          border: 'none',
          borderRadius: brand.radius.pill,
          fontFamily: brand.font.sans,
          fontSize: 12,
          fontWeight: 500,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          cursor: 'pointer',
        }}
      >
        Retry
      </button>
    </div>
  )
}

function EmptyState({
  mode,
  forYouAvailable,
  onSwitchToAll,
}: {
  mode: NewsMode
  forYouAvailable: boolean
  onSwitchToAll: () => void
}) {
  if (mode === 'for-you' && !forYouAvailable) {
    return (
      <div
        style={{
          padding: '40px 20px 20px',
          textAlign: 'center',
          fontFamily: brand.font.sans,
        }}
      >
        <p
          style={{
            fontFamily: brand.font.serif,
            fontSize: 22,
            color: brand.colors.ink,
            margin: '0 0 8px',
          }}
        >
          Nothing here yet.
        </p>
        <p
          style={{
            fontSize: 13,
            color: brand.colors.muted,
            margin: '0 0 16px',
          }}
        >
          Add a watch to your collection to see articles tagged with your brands.
        </p>
        <Link
          href="/collection/add"
          style={{
            display: 'inline-block',
            padding: '8px 18px',
            background: brand.colors.ink,
            color: brand.colors.bg,
            borderRadius: brand.radius.pill,
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            textDecoration: 'none',
          }}
        >
          Add a watch
        </Link>
      </div>
    )
  }
  return (
    <div
      style={{
        padding: '40px 20px 20px',
        textAlign: 'center',
        fontFamily: brand.font.sans,
        fontSize: 13,
        color: brand.colors.muted,
      }}
    >
      No articles match those filters.{' '}
      {mode === 'for-you' && (
        <button
          onClick={onSwitchToAll}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            color: brand.colors.gold,
            fontFamily: 'inherit',
            fontSize: 'inherit',
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          Browse all news →
        </button>
      )}
    </div>
  )
}

// ----------------------------------------------------------------------------
// Sponsored interleaving
// ----------------------------------------------------------------------------

type RenderEntry =
  | { kind: 'item'; item: NewsItem }
  | { kind: 'sponsored'; position: number }

function interleaveSponsored(items: NewsItem[]): RenderEntry[] {
  const out: RenderEntry[] = []
  items.forEach((item, idx) => {
    out.push({ kind: 'item', item })
    if ((idx + 1) % 8 === 0 && idx + 1 < items.length) {
      out.push({ kind: 'sponsored', position: idx + 1 })
    }
  })
  return out
}
