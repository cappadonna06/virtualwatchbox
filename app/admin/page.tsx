'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { brand } from '@/lib/brand'
import { useAuth } from '@/lib/auth/AuthProvider'
import { isAdminEmail } from '@/lib/auth/admin'
import { useCatalog } from '@/lib/catalog/CatalogProvider'
import { useWatchImages } from '@/lib/watchImages/WatchImagesProvider'
import { createClient } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

export default function AdminDashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { allWatches, dynamicWatches } = useCatalog()
  const { getImageUrl } = useWatchImages()

  // The in-memory catalog is intentionally capped at the top-2000-by-heat
  // (see CatalogProvider), so allWatches.length is NOT the real catalog size.
  // Pull the true totals with cheap COUNT/head queries against the full tables
  // so the dashboard reports accurate numbers, not the loaded subset.
  const [dbCounts, setDbCounts] = useState<{ total: number; withImage: number } | null>(null)
  const [flaggedCount, setFlaggedCount] = useState<number | null>(null)
  const isAdmin = !!user && isAdminEmail(user.email)

  useEffect(() => {
    if (!isAdmin) return
    let cancelled = false
    void (async () => {
      try {
        const supabase = createClient()
        const [catalogRes, imageRes] = await Promise.all([
          supabase.from('catalog_watches').select('id', { count: 'exact', head: true }),
          supabase.from('watch_images').select('id', { count: 'exact', head: true }).eq('variant', 'primary'),
        ])
        if (cancelled) return
        if (catalogRes.error) throw catalogRes.error
        if (imageRes.error) throw imageRes.error
        setDbCounts({ total: catalogRes.count ?? 0, withImage: imageRes.count ?? 0 })
      } catch (err) {
        if (!cancelled) console.warn('[admin] count query failed; showing loaded-subset counts', err)
      }
    })()
    return () => { cancelled = true }
  }, [isAdmin])

  // Images the screener (or a human) flagged for review — surfaced as a stat
  // tile so bad cutouts / wrong-subject photos are visible at a glance.
  useEffect(() => {
    if (!isAdmin) return
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/admin/image-review?summary=1', { cache: 'no-store' })
        if (!res.ok) return
        const json = (await res.json()) as { counts?: { flagged?: number } }
        if (!cancelled) setFlaggedCount(json.counts?.flagged ?? 0)
      } catch {
        // Non-fatal — the tile falls back to its static description.
      }
    })()
    return () => { cancelled = true }
  }, [isAdmin])

  const stats = useMemo(() => {
    // Prefer the true DB counts; fall back to the loaded subset until they land.
    const loadedTotal = allWatches.length
    const loadedWithImage = allWatches.filter(w => !!(getImageUrl(w.id) || w.imageUrl)).length
    const total = dbCounts?.total ?? loadedTotal
    const withImage = dbCounts?.withImage ?? loadedWithImage
    const withoutImage = Math.max(0, total - withImage)
    return {
      total,
      withImage,
      withoutImage,
      coverage: total ? Math.round((withImage / total) * 100) : 0,
      supabase: dynamicWatches.length,
      accurate: !!dbCounts,
    }
  }, [allWatches, dynamicWatches, getImageUrl, dbCounts])

  if (loading) return null

  if (!user) {
    return (
      <div style={{ padding: '120px 56px', textAlign: 'center' }}>
        <p style={{ fontFamily: brand.font.sans, fontSize: 14, color: brand.colors.muted }}>
          Sign in to access the admin dashboard.
        </p>
        <Link href="/auth" style={{ fontFamily: brand.font.sans, fontSize: 13, color: brand.colors.gold }}>
          Sign in →
        </Link>
      </div>
    )
  }

  if (!isAdminEmail(user.email)) {
    return (
      <div style={{ padding: '120px 56px', textAlign: 'center' }}>
        <p style={{ fontFamily: brand.font.sans, fontSize: 14, color: brand.colors.muted }}>
          You don&apos;t have access to the admin dashboard.
        </p>
        <button
          onClick={() => router.push('/')}
          style={{
            marginTop: 12,
            padding: '10px 20px',
            background: 'transparent',
            color: brand.colors.ink,
            border: `1px solid ${brand.colors.ink}`,
            borderRadius: brand.radius.btn,
            fontFamily: brand.font.sans,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          ← Home
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: '48px 56px 120px', borderTop: `1px solid ${brand.colors.border}` }}>
      <p style={{ margin: '0 0 4px', fontFamily: brand.font.sans, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: brand.colors.muted }}>
        Admin
      </p>
      <h1 style={{ margin: 0, fontFamily: brand.font.serif, fontSize: 32, fontWeight: 400, color: brand.colors.ink }}>
        Dashboard
      </h1>
      <p style={{ margin: '4px 0 28px', fontFamily: brand.font.sans, fontSize: 13, color: brand.colors.muted }}>
        Catalog and image intake at a glance.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
        <Stat label="Catalog watches" value={stats.total} hint={stats.accurate ? 'full catalog' : 'counting…'} />
        <Stat label="With image" value={stats.withImage} hint={`${stats.coverage}% coverage`} />
        <Stat label="Missing image" value={stats.withoutImage} hint="see Photo Queue" emphasis={stats.withoutImage > 0} />
        <Stat label="Flagged for review" value={flaggedCount ?? 0} hint={flaggedCount === null ? 'counting…' : 'auto-screened'} emphasis={(flaggedCount ?? 0) > 0} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
        <Tile
          title="Catalog Manager"
          description="Add, edit, and import watch metadata. Sort by heat to see what to photograph next."
          href="/admin/catalog"
          cta="Open catalog →"
        />
        <Tile
          title="Image Intake"
          description="Drop in watch photos to run AI identification, background removal, and approve to Supabase Storage."
          href="/admin/images"
          cta="Open intake →"
        />
        <Tile
          title="Photo Queue"
          description={`${stats.withoutImage} ${stats.withoutImage === 1 ? 'watch is' : 'watches are'} missing photos, sorted by heat score.`}
          href="/admin/catalog?view=queue"
          cta="Work the backlog →"
          accent
        />
        <Tile
          title="User Submissions"
          description="Watches submitted by users via the photo flow. Approve to add to the public catalog, or reject."
          href="/admin/submissions"
          cta="Review submissions →"
        />
        <Tile
          title="Image Review"
          description={
            flaggedCount && flaggedCount > 0
              ? `${flaggedCount} ${flaggedCount === 1 ? 'image' : 'images'} auto-flagged by the screener (off / wrong-subject). Review side-by-side vs. the original and approve or re-process.`
              : 'Side-by-side audit of processed catalog images vs. originals. The screener auto-flags off / wrong-subject photos for review.'
          }
          href={flaggedCount && flaggedCount > 0 ? '/admin/image-review?status=needs_reprocess' : '/admin/image-review'}
          cta={flaggedCount && flaggedCount > 0 ? `Review ${flaggedCount} flagged →` : 'Open image review →'}
          accent={!!flaggedCount && flaggedCount > 0}
        />
      </div>
    </div>
  )
}

function Stat({ label, value, hint, emphasis }: { label: string; value: number; hint?: string; emphasis?: boolean }) {
  return (
    <div
      style={{
        background: brand.colors.slot,
        border: `1px solid ${brand.colors.borderMid}`,
        borderRadius: brand.radius.xl,
        padding: '18px 18px',
      }}
    >
      <div style={{ fontFamily: brand.font.sans, fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: brand.colors.muted }}>
        {label}
      </div>
      <div
        style={{
          marginTop: 6,
          fontFamily: brand.font.serif,
          fontSize: 32,
          fontWeight: 400,
          color: emphasis ? brand.colors.gold : brand.colors.ink,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {hint && (
        <div style={{ marginTop: 6, fontFamily: brand.font.sans, fontSize: 11, color: brand.colors.muted }}>
          {hint}
        </div>
      )}
    </div>
  )
}

function Tile({
  title,
  description,
  href,
  cta,
  accent,
}: {
  title: string
  description: string
  href: string
  cta: string
  accent?: boolean
}) {
  return (
    <Link
      href={href}
      style={{
        textDecoration: 'none',
        background: brand.colors.white,
        border: accent ? `1px solid ${brand.colors.goldLine}` : `1px solid ${brand.colors.border}`,
        borderRadius: brand.radius.xl,
        padding: '20px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        transition: 'border-color 0.15s',
      }}
    >
      <h2 style={{ margin: 0, fontFamily: brand.font.serif, fontSize: 20, fontWeight: 400, color: brand.colors.ink }}>
        {title}
      </h2>
      <p style={{ margin: 0, fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.muted, lineHeight: 1.5 }}>
        {description}
      </p>
      <span
        style={{
          marginTop: 6,
          fontFamily: brand.font.sans,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: accent ? brand.colors.gold : brand.colors.ink,
        }}
      >
        {cta}
      </span>
    </Link>
  )
}
