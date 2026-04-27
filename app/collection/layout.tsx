import type { ReactNode } from 'react'
import { CollectionSessionProvider } from './CollectionSessionProvider'

export default function CollectionLayout({ children }: { children: ReactNode }) {
  return <CollectionSessionProvider>{children}</CollectionSessionProvider>
}
