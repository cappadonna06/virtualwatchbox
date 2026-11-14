import { cache } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import SharedPlaygroundWatchbox from '@/components/playground/SharedPlaygroundWatchbox'
import { brand } from '@/lib/brand'
import { FRAMES, LININGS, SLOT_COUNTS } from '@/lib/frameConfig'
import {
  decodePlaygroundShare,
  formatPlaygroundShareTotal,
  playgroundShareCardPath,
  playgroundSharePath,
  type SharedCatalogWatch,
} from '@/lib/playgroundShare'
import { loadPlaygroundShareCatalog } from '@/lib/playgroundShareCatalog'

type Props = { searchParams: { box?: string | string[] } }
const SHARE_TITLE = 'Shared Playground Box'

const resolveShare = cache(async (token: Props['searchParams']['box']) => {
  const share = decodePlaygroundShare(token)
  if (!share) return { status: 'invalid' } as const
  try {
    const { watches } = await loadPlaygroundShareCatalog(share)
    if (!watches.size) return { status: 'invalid' } as const
    return { status: 'ready', share, watches } as const
  } catch {
    return { status: 'retry' } as const
  }
})

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const result = await resolveShare(searchParams.box)
  const base: Metadata = {
    title: SHARE_TITLE,
    robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
    alternates: { canonical: null },
    referrer: 'no-referrer',
  }
  if (result.status !== 'ready' || typeof searchParams.box !== 'string') {
    return { ...base, description: 'Open a shared Playground box on Virtual Watchbox.', openGraph: null, twitter: null }
  }

  const { entries, total } = result.share
  const count = entries.length
  const countText = count === 1 ? '1 watch' : `${count} watches`
  const description = total === undefined
    ? `Explore a shared Playground lineup with ${countText}.`
    : `A Playground lineup with ${countText} and a ${formatPlaygroundShareTotal(total)} catalog estimate.`
  const images = [{
    url: playgroundShareCardPath(searchParams.box),
    width: 1200, height: 630, type: 'image/png',
    alt: 'Watchbox preview for this shared Playground lineup',
  }]
  return {
    ...base,
    description,
    openGraph: {
      type: 'website', siteName: 'Virtual Watchbox', title: SHARE_TITLE, description, images,
      url: playgroundSharePath(searchParams.box),
    },
    twitter: { card: 'summary_large_image', title: SHARE_TITLE, description, images },
  }
}

const unavailableWatch: SharedCatalogWatch = {
  brand: '', model: 'Watch unavailable', reference: '',
  dialConfig: {
    dialColor: brand.colors.dark,
    markerColor: brand.colors.onDarkMuted,
    handColor: brand.colors.white,
  },
}

export default async function SharedPlaygroundPage({ searchParams }: Props) {
  const result = await resolveShare(searchParams.box)
  const ready = result.status === 'ready'
  const cta = (
    <Link href="/playground" prefetch={false} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minHeight: 44,
      padding: '0 18px', borderRadius: brand.radius.btn, background: brand.colors.ink,
      color: brand.colors.white, textDecoration: 'none', fontSize: 14, fontWeight: 600,
    }}>Build your own box&nbsp;<span aria-hidden>→</span></Link>
  )

  if (!ready) {
    return (
      <section style={{ textAlign: 'center', margin: '0 auto', padding: '72px 20px 96px' }}>
        <h1 style={{ ...heading, margin: '0 0 12px' }}>Shared box unavailable</h1>
        <p style={{ margin: '0 0 24px', color: brand.colors.muted }}>
          {result.status === 'retry'
            ? 'The catalog is temporarily unavailable. Refresh this page to try again.'
            : 'Check the link or ask the sender to copy a new one.'}
        </p>
        {cta}
      </section>
    )
  }

  const { share, watches } = result
  const layout = SLOT_COUNTS.find(option => option.n === share.slotCount)!
  const frame = FRAMES.find(option => option.id === share.frame)!
  const lining = LININGS.find(option => option.id === share.lining)!
  const lineup = share.entries.map(entry => ({ ...(watches.get(entry.watchId) ?? unavailableWatch), ...entry }))

  return (
    <article style={{
      maxWidth: 920, margin: '0 auto', padding: 'clamp(28px, 6vw, 68px) clamp(16px, 5vw, 44px) 64px',
      fontFamily: brand.font.sans, color: brand.colors.ink,
    }}>
      <header style={{ textAlign: 'center', marginBottom: 26 }}>
        <p style={{
          fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.16em',
          color: brand.colors.goldDeep, margin: '0 0 8px',
        }}>Virtual Watchbox</p>
        <h1 style={heading}>{SHARE_TITLE}</h1>
        <p style={{ fontSize: 14, color: brand.colors.muted, margin: '8px 0 18px' }}>
          {lineup.length} {lineup.length === 1 ? 'watch' : 'watches'} · {frame.label} · {lining.label}
          {share.total === undefined ? null : ` · ${formatPlaygroundShareTotal(share.total)} catalog estimate`}
        </p>
        {cta}
      </header>

      <div style={{ maxWidth: 56 + layout.cols * 150, margin: '0 auto' }}>
        <SharedPlaygroundWatchbox frame={frame.id} lining={lining.id} slotCount={layout.n} watches={lineup} />
      </div>

      <section aria-labelledby="shared-lineup" style={{
        maxWidth: 56 + layout.cols * 150, margin: '32px auto 0',
      }}>
        <h2 id="shared-lineup" style={{ fontFamily: brand.font.serif, fontSize: 30, margin: '0 0 8px' }}>The lineup</h2>
        <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {lineup.map(watch => (
            <li key={watch.slot} style={{
              display: 'grid', gridTemplateColumns: 'minmax(62px, auto) 1fr', gap: 12, alignItems: 'baseline',
              padding: '10px 0', borderTop: `1px solid ${brand.colors.border}`,
            }}>
              <span style={{ fontSize: 11, color: brand.colors.goldDeep }}>Slot {watch.slot + 1}</span>
              <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
                {watch.brand ? `${watch.brand} ` : ''}{watch.model}
                {watch.reference && (
                  <span style={{ color: brand.colors.muted, fontSize: 12 }}> · Ref. {watch.reference}</span>
                )}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </article>
  )
}

const heading = {
  fontFamily: brand.font.serif,
  fontSize: 'clamp(39px, 7vw, 68px)',
  fontWeight: 500,
  lineHeight: 0.98,
  margin: 0,
}
