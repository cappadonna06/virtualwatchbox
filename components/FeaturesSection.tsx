'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { brand } from '@/lib/brand'
import { usePrefersReducedMotion } from '@/components/collection/useResponsiveState'
import { formatRelativeDate } from '@/lib/relativeDate'
import type { NewsItem } from '@/types/news'

// Fallback when /api/news is unreachable so the homepage never looks broken.
const FALLBACK_ARTICLES: NewsItem[] = [
  {
    id: 'fb-1',
    source: 'Hodinkee',
    title: 'The New Rolex Submariner: Every Change, Explained',
    excerpt: "Every update to Rolex's most iconic sports watch — and what it means for collectors.",
    url: 'https://hodinkee.com',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    tags: { brands: ['Rolex'], references: ['Submariner'], categories: ['new-release'] },
  },
  {
    id: 'fb-2',
    source: 'Fratello',
    title: "Why the Royal Oak's Value Story Is Far From Over",
    excerpt: 'Market corrections notwithstanding, the AP Royal Oak remains one of the most resilient references.',
    url: 'https://fratellowatches.com',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
    tags: { brands: ['Audemars Piguet'], references: ['Royal Oak'], categories: ['market'] },
  },
  {
    id: 'fb-3',
    source: 'Monochrome',
    title: 'Patek Philippe Nautilus: A Complete Reference Guide',
    excerpt: 'From the original 3700 to the final 5711 — every Nautilus reference, its own story.',
    url: 'https://monochrome-watches.com',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
    tags: { brands: ['Patek Philippe'], references: ['Nautilus', '5711'], categories: ['history'] },
  },
  {
    id: 'fb-4',
    source: 'Worn & Wound',
    title: 'Five Underrated GMTs Under $2,000',
    excerpt: 'The travel watch is having a moment — here are five under-the-radar picks you can actually buy.',
    url: 'https://wornandwound.com',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(),
    tags: { brands: [], references: ['GMT-Master'], categories: ['review'] },
  },
]

export default function FeaturesSection() {
  const [articles, setArticles] = useState<NewsItem[] | null>(null)
  const prefersReducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    const ctrl = new AbortController()
    let alive = true

    fetch('/api/news?limit=4', { signal: ctrl.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return (await res.json()) as NewsItem[]
      })
      .then((data) => {
        if (!alive) return
        setArticles(Array.isArray(data) && data.length ? data : FALLBACK_ARTICLES)
      })
      .catch((err) => {
        if (!alive) return
        if ((err as { name?: string }).name === 'AbortError') return
        console.warn('[features] news fetch failed, using fallback', err)
        setArticles(FALLBACK_ARTICLES)
      })

    return () => {
      alive = false
      ctrl.abort()
    }
  }, [])

  const featured = articles?.[0]
  const sideList = articles?.slice(1, 4) ?? []

  return (
    <section
      className="features-section"
      style={{
        padding: '64px 56px 60px',
        borderTop: `1px solid ${brand.colors.border}`,
        position: 'relative',
      }}
    >
      {/* Desktop-only grid ratio/gap; below 1024px the existing
          .editorial-news-grid media-query rules in globals.css take over. */}
      <style jsx>{`
        @media (min-width: 1024px) {
          .features-news-grid {
            grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
            gap: 52px;
          }
        }
      `}</style>
      <header style={{ marginBottom: 44 }}>
        <div
          style={{
            fontFamily: brand.font.sans,
            fontSize: brand.text.label,
            fontWeight: 600,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: brand.colors.muted,
            marginBottom: 14,
          }}
        >
          From the Watch World
        </div>
        <h2
          style={{
            margin: 0,
            fontFamily: brand.font.serif,
            fontSize: brand.text.h2,
            fontWeight: 400,
            lineHeight: 1.08,
            letterSpacing: '-0.005em',
            color: brand.colors.ink,
          }}
        >
          What Collectors <em style={{ fontStyle: 'italic' }}>Are Reading.</em>
        </h2>
      </header>

      <div className="editorial-news-grid features-news-grid" style={{ alignItems: 'start' }}>
        {/* Featured story (left) */}
        {!articles ? (
          <FeaturedSkeleton />
        ) : featured ? (
          <FeaturedStory item={featured} />
        ) : null}

        {/* Side list (right) */}
        <div
          className="editorial-news-side"
          style={{ display: 'flex', flexDirection: 'column', height: 'auto' }}
        >
          {!articles &&
            Array.from({ length: 3 }).map((_, i) => (
              <SideRowSkeleton key={i} isFirst={i === 0} isLast={i === 2} />
            ))}
          {articles &&
            sideList.map((it, i) => (
              <SideRow
                key={it.id}
                item={it}
                isFirst={i === 0}
                isLast={i === sideList.length - 1}
              />
            ))}

          <Link
            href="/news"
            className="features-see-all"
            style={{
              marginTop: 26,
              alignSelf: 'flex-start',
              fontFamily: brand.font.sans,
              fontSize: brand.text.label,
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: brand.colors.goldDeep,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: '4px 0',
              transition: `color ${brand.transition.base}`,
              flexShrink: 0,
            }}
          >
            See all articles
            <span
              aria-hidden
              style={{
                display: 'inline-block',
                transition: prefersReducedMotion ? 'none' : `transform ${brand.transition.base}`,
              }}
            >
              →
            </span>
          </Link>
        </div>
      </div>
    </section>
  )
}

// ----------------------------------------------------------------------------

function FeaturedStory({ item }: { item: NewsItem }) {
  const [hovered, setHovered] = useState(false)
  const [imgFailed, setImgFailed] = useState(false)
  const prefersReducedMotion = usePrefersReducedMotion()
  const showImage = !!item.imageUrl && !imgFailed

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'block',
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <div
        style={{
          width: '100%',
          aspectRatio: '16 / 11',
          background: `linear-gradient(135deg, ${brand.colors.placeholderStart}, ${brand.colors.placeholderEnd})`,
          borderRadius: 14,
          overflow: 'hidden',
          marginBottom: 20,
          position: 'relative',
          boxShadow: hovered ? brand.shadow.lg : brand.shadow.sm,
          transition: `box-shadow ${brand.transition.base}`,
        }}
      >
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              transform: hovered && !prefersReducedMotion ? 'scale(1.025)' : 'scale(1)',
              transition: prefersReducedMotion
                ? 'none'
                : 'transform 0.6s cubic-bezier(0.22, 0.61, 0.36, 1)',
            }}
          />
        ) : (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: brand.colors.faint,
              opacity: 0.55,
              fontSize: 72,
              lineHeight: 1,
            }}
          >
            ◷
          </div>
        )}
        {/* Featured pill */}
        <div
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            padding: '7px 13px',
            background: brand.colors.ink,
            borderRadius: brand.radius.pill,
            fontFamily: brand.font.sans,
            fontSize: brand.text.labelSm,
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: brand.colors.bg,
          }}
        >
          Featured
        </div>
      </div>
      <div
        style={{
          fontFamily: brand.font.sans,
          fontSize: brand.text.label,
          fontWeight: 600,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: brand.colors.muted,
          marginBottom: 10,
        }}
      >
        {item.source} · {formatRelativeDate(item.publishedAt) || '—'}
      </div>
      <h3
        style={{
          margin: 0,
          fontFamily: brand.font.serif,
          fontSize: 30,
          fontWeight: 400,
          lineHeight: 1.16,
          color: hovered ? brand.colors.goldDeep : brand.colors.ink,
          transition: `color ${brand.transition.base}`,
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          marginBottom: 12,
          letterSpacing: '-0.005em',
        }}
      >
        {item.title}
      </h3>
      {item.excerpt && (
        <p
          style={{
            margin: 0,
            fontFamily: brand.font.sans,
            fontSize: brand.text.body,
            lineHeight: 1.65,
            color: brand.colors.muted,
            maxWidth: 520,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {item.excerpt}
        </p>
      )}
    </a>
  )
}

function SideRow({
  item,
  isFirst,
  isLast,
}: {
  item: NewsItem
  isFirst: boolean
  isLast: boolean
}) {
  const [hovered, setHovered] = useState(false)
  const [imgFailed, setImgFailed] = useState(false)
  const prefersReducedMotion = usePrefersReducedMotion()
  const showImage = !!item.imageUrl && !imgFailed

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="editorial-news-row"
      style={{
        display: 'grid',
        gridTemplateColumns: '92px 1fr',
        gap: 18,
        alignItems: 'center',
        padding: isFirst ? '0 0 22px' : '22px 0',
        borderBottom: isLast ? 'none' : `1px solid ${brand.colors.border}`,
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <div
        style={{
          aspectRatio: '1',
          borderRadius: brand.radius.lg,
          overflow: 'hidden',
          background: `linear-gradient(135deg, ${brand.colors.placeholderStart}, ${brand.colors.placeholderEnd})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              transform: hovered && !prefersReducedMotion ? 'scale(1.04)' : 'scale(1)',
              transition: prefersReducedMotion ? 'none' : `transform ${brand.transition.smooth}`,
            }}
          />
        ) : (
          <span aria-hidden style={{ fontSize: 28, color: brand.colors.faint, opacity: 0.6 }}>
            ◷
          </span>
        )}
      </div>

      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div
          style={{
            fontFamily: brand.font.sans,
            fontSize: brand.text.labelSm,
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: brand.colors.muted,
            marginBottom: 6,
          }}
        >
          {item.source} · {formatRelativeDate(item.publishedAt) || '—'}
        </div>
        <h4
          style={{
            margin: 0,
            fontFamily: brand.font.serif,
            fontSize: brand.text.cardTitle,
            fontWeight: 400,
            lineHeight: 1.22,
            color: hovered ? brand.colors.goldDeep : brand.colors.ink,
            transition: `color ${brand.transition.base}`,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {item.title}
        </h4>
      </div>
    </a>
  )
}

function SideRowSkeleton({ isFirst, isLast }: { isFirst: boolean; isLast: boolean }) {
  return (
    <div
      aria-hidden
      className="editorial-news-row"
      style={{
        display: 'grid',
        gridTemplateColumns: '92px 1fr',
        gap: 18,
        alignItems: 'center',
        padding: isFirst ? '0 0 22px' : '22px 0',
        borderBottom: isLast ? 'none' : `1px solid ${brand.colors.border}`,
        animation: 'vw-news-pulse 1.4s ease-in-out infinite',
      }}
    >
      <div
        style={{
          aspectRatio: '1',
          borderRadius: brand.radius.lg,
          background: brand.colors.slot,
          border: `1px dashed ${brand.colors.borderLight}`,
        }}
      />
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
        <div style={{ height: 8, width: '40%', background: brand.colors.slot, borderRadius: 4 }} />
        <div style={{ height: 18, width: '95%', background: brand.colors.slot, borderRadius: 4 }} />
        <div style={{ height: 18, width: '70%', background: brand.colors.slot, borderRadius: 4 }} />
      </div>
    </div>
  )
}

function FeaturedSkeleton() {
  return (
    <div aria-hidden style={{ animation: 'vw-news-pulse 1.4s ease-in-out infinite' }}>
      <div
        style={{
          width: '100%',
          aspectRatio: '16 / 11',
          background: brand.colors.slot,
          border: `1px dashed ${brand.colors.borderLight}`,
          borderRadius: 14,
          marginBottom: 20,
        }}
      />
      <div style={{ height: 10, width: '30%', background: brand.colors.slot, borderRadius: 4, marginBottom: 12 }} />
      <div style={{ height: 30, width: '95%', background: brand.colors.slot, borderRadius: 4, marginBottom: 8 }} />
      <div style={{ height: 30, width: '70%', background: brand.colors.slot, borderRadius: 4, marginBottom: 14 }} />
      <div style={{ height: 15, width: '85%', background: brand.colors.slot, borderRadius: 4 }} />
    </div>
  )
}
