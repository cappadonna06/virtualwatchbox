import HeroCarousel from '@/components/HeroCarousel'
import CollectionSection from '@/components/collection/CollectionSection'
import StrapStudioPreview from '@/components/StrapStudioPreview'
import DiscoverPreview from '@/components/DiscoverPreview'
import FeaturesSection from '@/components/FeaturesSection'
import OnYourRadar from '@/components/OnYourRadar'
import { publicPageMetadata } from '@/lib/siteMetadata'

export const metadata = publicPageMetadata('/')

// The market Ticker section is intentionally removed until we have a real
// price API behind it. The Ticker component (`components/Ticker.tsx`) is
// preserved for when we wire up live pricing.
export default function HomePage() {
  return (
    <>
      <HeroCarousel />
      <CollectionSection />
      <StrapStudioPreview />
      <DiscoverPreview />
      <FeaturesSection />
      <OnYourRadar />
    </>
  )
}
