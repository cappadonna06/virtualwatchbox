'use client'

import { useMemo } from 'react'
import HeroCarousel from '@/components/HeroCarousel'
import Ticker from '@/components/Ticker'
import CollectionSection from '@/components/collection/CollectionSection'
import FeaturesSection from '@/components/FeaturesSection'
import OnYourRadar from '@/components/OnYourRadar'
import Footer from '@/components/Footer'
import { useCollectionSession } from './collection/CollectionSessionProvider'

export default function HomePage() {
  const { followedWatchIds, toggleFollowedWatch } = useCollectionSession()
  const followedWatchIdSet = useMemo(() => new Set(followedWatchIds), [followedWatchIds])

  return (
    <>
      <HeroCarousel followedWatchIds={followedWatchIdSet} toggleFollowedWatch={toggleFollowedWatch} />
      <Ticker />
      <CollectionSection />
      <FeaturesSection />
      <OnYourRadar followedWatchIds={followedWatchIdSet} toggleFollowedWatch={toggleFollowedWatch} />
      <Footer />
    </>
  )
}
