import { Suspense } from 'react'
import { brand } from '@/lib/brand'
import StrapStudio from '@/components/straps/studio/StrapStudio'

export const metadata = {
  title: 'Strap Studio · Virtual Watchbox',
  description: 'See your watch on any strap — a premium visual configurator.',
}

// A cream fallback matching the site shell while the client studio (which
// reads URL state via useSearchParams) hydrates — no background flash.
function StudioFallback() {
  return (
    <div
      style={{
        minHeight: '80vh',
        background: brand.studio.canvas,
        backgroundColor: brand.studio.void,
      }}
    />
  )
}

export default function StrapStudioPage() {
  return (
    <Suspense fallback={<StudioFallback />}>
      <StrapStudio />
    </Suspense>
  )
}
