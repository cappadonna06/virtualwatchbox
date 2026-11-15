import type { Metadata } from 'next'
import { Suspense } from 'react'
import DraftGame from './DraftGame'

export const metadata: Metadata = {
  title: 'The Watch Draft',
  description: 'Build a five-watch collection under a real-world budget and share your lineup.',
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
}

export default function Page() {
  return <Suspense><DraftGame /></Suspense>
}
