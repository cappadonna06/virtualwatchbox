'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { brand } from '@/lib/brand'
import NewsCard from '@/components/NewsCard'
import NewsCardSkeleton from '@/components/NewsCardSkeleton'
import type { NewsItem } from '@/types/news'

export default function DiscoverReadsStrip() {
  const [items, setItems] = useState<NewsItem[] | null>(null)
  const [failed, setFailed] = useState(false)

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
        setItems(Array.isArray(data) ? data : [])
      })
      .catch((err) => {
        if (!alive) return
        if ((err as { name?: string }).name === 'AbortError') return
        console.warn('[discover/reads] news fetch failed', err)
        setFailed(true)
      })

    return () => {
      alive = false
      ctrl.abort()
    }
  }, [])

  if (failed) {
    return (
      <p
        style={{
          fontFamily: brand.font.sans,
          fontSize: 13,
          color: brand.colors.muted,
          margin: 0,
        }}
      >
        Couldn&apos;t load the latest reads. <Link href="/news" style={{ color: brand.colors.gold }}>Try /news →</Link>
      </p>
    )
  }

  return (
    <>
      <div
        className="discover-reads-strip"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 20,
        }}
      >
        {!items &&
          Array.from({ length: 4 }).map((_, i) => (
            <NewsCardSkeleton key={i} variant="compact" />
          ))}
        {items && items.map((it) => (
          <NewsCard key={it.id} item={it} variant="compact" />
        ))}
      </div>

      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Link
          href="/news"
          style={{
            fontFamily: brand.font.sans,
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: '0.04em',
            color: brand.colors.ink,
            textDecoration: 'none',
          }}
        >
          View all →
        </Link>
      </div>
    </>
  )
}
