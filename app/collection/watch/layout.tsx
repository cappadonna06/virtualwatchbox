import type { ReactNode } from 'react'
import { privatePageMetadata } from '@/lib/siteMetadata'

export const metadata = { ...privatePageMetadata, title: 'Watch Details' }

export default function WatchLayout({ children }: { children: ReactNode }) {
  return children
}
