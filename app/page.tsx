'use client'

import HeroCarousel from '@/components/HeroCarousel'
import Ticker from '@/components/Ticker'
import CollectionSection from '@/components/collection/CollectionSection'
import FeaturesSection from '@/components/FeaturesSection'
import OnYourRadar from '@/components/OnYourRadar'
import { useCollectionSession } from './collection/CollectionSessionProvider'

export default function HomePage() {
  const { followedWatchIds } = useCollectionSession()
  const followedWatchIdSet = new Set(followedWatchIds)

  return (
    <>
      <HeroCarousel />
      <CollectionSection />
      <Ticker />
      <FeaturesSection />
      <OnYourRadar followedWatchIds={followedWatchIdSet} />
    </>
  )
}
