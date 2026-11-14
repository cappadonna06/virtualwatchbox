import type { ReactNode } from 'react'
import { privatePageMetadata } from '@/lib/siteMetadata'

export const metadata = { ...privatePageMetadata, title: 'Add a Watch' }

export default function AddWatchLayout({ children }: { children: ReactNode }) {
  return children
}
