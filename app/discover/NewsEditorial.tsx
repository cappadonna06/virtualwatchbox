'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { brand } from '@/lib/brand'
import type { NewsItem } from '@/types/news'
import { formatRelativeDate } from '@/lib/relativeDate'
import EditorialHeader from './EditorialHeader'

type Props = {
  brandFilter: string[]
}

const NEW_THRESHOLD_HOURS = 48

export default function NewsEditorial({ brandFilter }: Props) {
  const [items, setItems] = useState<NewsItem[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const ctrl = new AbortController()
    let alive = true
    const params = new URLSearchParams({ limit: '4' })
    if (brandFilter.length > 0) params.set('brands', brandFilter.join(','))

    fetch(`/api/news?${params.toString()}`, { signal: ctrl.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return (await res.json()) as NewsItem[]
      })
      .then((data) => {
        if (!alive) return
        setItems(Array.isArray(data) ? data.slice(0, 4) : [])
      })
      .catch((err) => {
        if (!alive) return
        if ((err as { name?: string }).name === 'AbortError') return
        setFailed(true)
      })

    return () => { alive = false; ctrl.abort() }
  }, [brandFilter.join(',')])

  return (
    <section
      id="news"
      style={{
        maxWidth: 1280,
        margin: '0 auto',
        padding: '56px 56px 80px',
      }}
    >
      <EditorialHeader
        kicker="§ 06"
        title="From the watch world."
        sub="The latest from the publications collectors trust. Tagged for your brands of interest."
      />
      {failed ? (
        <p style={{ fontFamily: brand.font.sans, fontSize: 13, color: brand.colors.muted, margin: 0 }}>
          Couldn’t load the latest reads. <Link href="/news" style={{ color: brand.colors.gold }}>Try /news →</Link>
        </p>
      ) : (
        <div
          className="discover-news-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 18,
          }}
        >
          {!items && Array.from({ length: 4 }).map((_, i) => <NewsSkeleton key={i} />)}
          {items && items.map((it) => <NewsCard key={it.id} item={it} />)}
        </div>
      )}

      <div style={{ marginTop: 28, display: 'flex', justifyContent: 'flex-end' }}>
        <Link
          href="/news"
          style={{
            fontFamily: brand.font.sans,
            fontSize: 10.5,
            fontWeight: 500,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: brand.colors.ink,
            textDecoration: 'none',
          }}
        >
          View all news →
        </Link>
      </div>
    </section>
  )
}

function isRecent(publishedAt: string): boolean {
  const t = Date.parse(publishedAt)
  if (!Number.isFinite(t)) return false
  return Date.now() - t < NEW_THRESHOLD_HOURS * 60 * 60 * 1000
}

function NewsCard({ item }: { item: NewsItem }) {
  const recent = isRecent(item.publishedAt)
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex',
        flexDirection: 'column',
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <div
        style={{
          background: brand.colors.paperWarm,
          aspectRatio: '4/3',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 14,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {item.imageUrl && (
          <Image
            src={item.imageUrl}
            alt={item.title}
            fill
            sizes="(max-width: 768px) 100vw, 25vw"
            style={{ objectFit: 'cover', filter: 'drop-shadow(0 8px 14px rgba(0,0,0,0.18))' }}
          />
        )}
        {recent && (
          <div
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              fontFamily: brand.font.sans,
              fontSize: 8.5,
              fontWeight: 600,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              padding: '3px 7px',
              background: brand.colors.gold,
              color: brand.colors.ink,
              borderRadius: 2,
            }}
          >
            New
          </div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span
          style={{
            fontFamily: brand.font.sans,
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: brand.colors.gold,
          }}
        >
          {item.source}
        </span>
        <span
          style={{
            fontFamily: brand.font.sans,
            fontSize: 10,
            color: brand.colors.muted,
            letterSpacing: '0.04em',
          }}
        >
          {formatRelativeDate(item.publishedAt) || '—'}
        </span>
      </div>
      <h3
        style={{
          fontFamily: brand.font.serif,
          fontSize: 18,
          fontWeight: 400,
          lineHeight: 1.18,
          margin: 0,
          marginBottom: 6,
          color: brand.colors.ink,
          textWrap: 'balance',
        }}
      >
        {item.title}
      </h3>
      {item.excerpt && (
        <p
          style={{
            fontFamily: brand.font.sans,
            fontSize: 12,
            color: brand.colors.mutedDark,
            margin: 0,
            lineHeight: 1.55,
            textWrap: 'pretty',
          }}
        >
          {item.excerpt}
        </p>
      )}
    </a>
  )
}

function NewsSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          aspectRatio: '4/3',
          background: brand.colors.paperWarm,
          marginBottom: 14,
        }}
      />
      <div style={{ height: 10, width: '40%', background: brand.colors.border, marginBottom: 12 }} />
      <div style={{ height: 16, width: '90%', background: brand.colors.border, marginBottom: 6 }} />
      <div style={{ height: 16, width: '70%', background: brand.colors.border, marginBottom: 10 }} />
      <div style={{ height: 10, width: '100%', background: brand.colors.border }} />
    </div>
  )
}
