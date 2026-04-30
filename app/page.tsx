'use client'

import HeroCarousel from '@/components/HeroCarousel'
import Ticker from '@/components/Ticker'
import CollectionSection from '@/components/collection/CollectionSection'
import FeaturesSection from '@/components/FeaturesSection'
import OnYourRadar from '@/components/OnYourRadar'
import Footer from '@/components/Footer'
import { useCollectionSession } from './collection/CollectionSessionProvider'

export default function HomePage() {
  const { followedWatchIds } = useCollectionSession()
  const followedWatchIdSet = new Set(followedWatchIds)

  return (
    <>
      <HeroCarousel />
      <Ticker />
      <CollectionSection />
      <FeaturesSection />
      <OnYourRadar followedWatchIds={followedWatchIdSet} />
      <Footer />
    </>
  )
}
