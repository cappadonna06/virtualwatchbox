import type { Metadata } from 'next'
import { PublicProfilePreviewPage } from '@/components/profile/ProfileSurface'

type SearchParams = Record<string, string | string[] | undefined>

function asString(v: string | string[] | undefined): string | null {
  if (typeof v === 'string') return v
  if (Array.isArray(v) && typeof v[0] === 'string') return v[0]
  return null
}

export function generateMetadata({ searchParams }: { searchParams: SearchParams }): Metadata {
  const slug = asString(searchParams.box)
  if (!slug) return {}

  const type = asString(searchParams.type) === 'playground' ? 'playground' : 'collection'
  const handle = asString(searchParams.handle) ?? 'collector'
  const count = asString(searchParams.count) ?? '0'
  const total = asString(searchParams.total) ?? '0'

  const slots = asString(searchParams.slots) ?? '6'
  const brands = asString(searchParams.brands) ?? '0'
  const boxTitle = asString(searchParams.t)
  const params = new URLSearchParams()
  params.set('type', type)
  params.set('handle', handle)
  params.set('count', count)
  params.set('total', total)
  params.set('brands', brands)
  params.set('slots', slots)
  if (boxTitle) params.set('t', boxTitle)
  for (const flag of ['c', 'v', 'b'] as const) {
    const v = asString(searchParams[flag])
    if (v === '0') params.set(flag, '0')
  }
  for (let i = 0; i < 10; i++) {
    const v = asString(searchParams[`img${i}`])
    if (v) params.set(`img${i}`, v)
  }
  const ogPath = `/api/og/box/${encodeURIComponent(slug)}?${params.toString()}`

  const previewLabel = type === 'collection'
    ? `${handle}'s Watchbox`
    : (boxTitle ? `${boxTitle} — ${handle}'s Dream Box` : `${handle}'s Dream Box`)
  const description = type === 'collection'
    ? `${count} watches in ${handle}'s Virtual Watchbox.`
    : `${boxTitle ? `${boxTitle} — ` : ''}A dream box from ${handle} on Virtual Watchbox.`

  return {
    title: `${previewLabel} — Virtual Watchbox`,
    description,
    openGraph: {
      title: `${previewLabel} — Virtual Watchbox`,
      description,
      images: [{ url: ogPath, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${previewLabel} — Virtual Watchbox`,
      description,
      images: [ogPath],
    },
  }
}

export default function ProfilePreviewPage() {
  return <PublicProfilePreviewPage />
}
