import { Suspense } from 'react'
import { brand, masthead } from '@/lib/brand'
import { publicPageMetadata, publicPages } from '@/lib/siteMetadata'
import StrapStudio from '@/components/straps/studio/StrapStudio'

const path = '/collection/straps/studio'
export const metadata = { ...publicPageMetadata(path), robots: { index: true, follow: true } }

// A cream fallback matching the site shell while the client studio (which
// reads URL state via useSearchParams) hydrates — no background flash.
function StudioFallback() {
  return (
    <div
      style={{
        minHeight: '80vh',
        padding: 'clamp(24px, 5vw, 56px)',
        background: brand.studio.canvas,
        backgroundColor: brand.studio.void,
      }}
    >
      <h1 style={masthead.title}>Watch Strap Studio</h1>
      <p style={masthead.subtitle}>{publicPages[path].description}</p>
    </div>
  )
}

export default function StrapStudioPage() {
  return (
    <Suspense fallback={<StudioFallback />}>
      <StrapStudio />
    </Suspense>
  )
}
