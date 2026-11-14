import type { ReactNode } from 'react'
import { publicPageMetadata } from '@/lib/siteMetadata'

export const metadata = publicPageMetadata('/service-room')

export default function Layout({ children }: { children: ReactNode }) {
  return children
}
