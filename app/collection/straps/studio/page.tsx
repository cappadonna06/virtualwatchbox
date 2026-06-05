import { Suspense } from 'react'
import { brand } from '@/lib/brand'
import StrapStudio from '@/components/straps/studio/StrapStudio'

export const metadata = {
  title: 'Strap Studio · Virtual Watchbox',
  description: 'See your watch on any strap — a premium visual configurator.',
}

// A dark, full-bleed fallback so there is never a flash of white while the
// client studio (which reads URL state via useSearchParams) hydrates.
function StudioFallback() {
  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        marginLeft: 'calc(50% - 50vw)',
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
