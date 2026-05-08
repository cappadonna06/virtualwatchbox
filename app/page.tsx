'use client'

import HeroCarousel from '@/components/HeroCarousel'
import CollectionSection from '@/components/collection/CollectionSection'
import FeaturesSection from '@/components/FeaturesSection'
import OnYourRadar from '@/components/OnYourRadar'
import { useCollectionSession } from './collection/CollectionSessionProvider'

// The market Ticker section is intentionally removed until we have a real
// price API behind it. The Ticker component (`components/Ticker.tsx`) is
// preserved for when we wire up live pricing.
export default function HomePage() {
  const { followedWatchIds } = useCollectionSession()
  const followedWatchIdSet = new Set(followedWatchIds)

  return (
    <>
      <HeroCarousel />
      <CollectionSection />
      <FeaturesSection />
      <OnYourRadar followedWatchIds={followedWatchIdSet} />
    </>
  )
}
