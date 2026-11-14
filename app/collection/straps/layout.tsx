import type { ReactNode } from 'react'
import { privatePageMetadata } from '@/lib/siteMetadata'

export const metadata = { ...privatePageMetadata, title: 'Strap Drawer' }

export default function StrapDrawerLayout({ children }: { children: ReactNode }) {
  return children
}
