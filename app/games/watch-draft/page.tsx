import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SITE_URL } from '@/lib/siteMetadata'
import { draftName, draftPath } from '@/lib/watchDraftChallenge'
import DraftGame from './DraftGame'
import { currentDraftWeek, draftEditionNames, money, weekLabel } from './boards'
import { draftCardPath, fitsDraft, resolveDraft } from './resolveDraft'

type Props = { searchParams: Record<string, string | string[] | undefined> }

export function generateMetadata({ searchParams }: Props): Metadata {
  const metadata: Metadata = {
    title: 'The Watch Draft',
    description: 'Build a collection within the weekly watch draft budget and share your lineup.',
    robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  }
  if (searchParams.view !== 'result') return metadata

  const query = new URLSearchParams()
  for (const key of ['board', 'budget', 'edition', 'week', 'picks', 'view']) {
    const value = searchParams[key]
    if (typeof value === 'string') query.set(key, value)
  }
  const { board, budget, lineup, count, week } = resolveDraft(query)
  const total = lineup.reduce((sum, watch) => sum + watch.tier, 0)
  if (!fitsDraft(board, lineup, count, total, budget)) return metadata
  const title = `Play your own ${draftName({ board: board.id, budget })}`
  const description = `${draftEditionNames[board.id]}${week ? ` · Week of ${weekLabel(week)}` : ''}. See the ${count}-watch lineup and play the same Watch Draft challenge.`
  const path = `${draftPath}?${query}`
  const image = new URL(draftCardPath(path), SITE_URL).href
  return {
    ...metadata, title, description,
    openGraph: {
      type: 'website', siteName: 'Virtual Watchbox', url: new URL(path, SITE_URL).href, title, description,
      images: [{ url: image, width: 1200, height: 630, alt: `Watchbox lineup for the ${title}` }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  }
}

export default function Page({ searchParams }: Props) {
  // Reading searchParams opts this route into server rendering so the UTC
  // weekly rollover is applied without a deployment or a scheduled job.
  return <Suspense><DraftGame latestWeek={currentDraftWeek()} resultRequested={searchParams.view === 'result'} /></Suspense>
}
