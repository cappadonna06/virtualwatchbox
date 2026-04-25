'use client'

import { useState } from 'react'
import HeroCarousel from '@/components/HeroCarousel'
import Ticker from '@/components/Ticker'
import CollectionSection from '@/components/collection/CollectionSection'
import FeaturesSection from '@/components/FeaturesSection'
import OnYourRadar from '@/components/OnYourRadar'
import Footer from '@/components/Footer'

export default function HomePage() {
  const [liked, setLiked] = useState(new Set<string>())

  function toggleLike(id: string) {
    setLiked(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <>
      <HeroCarousel liked={liked} toggleLike={toggleLike} />
      <Ticker />
      <CollectionSection />
      <FeaturesSection />
      <OnYourRadar liked={liked} toggleLike={toggleLike} />
      <Footer />
    </>
  )
}
