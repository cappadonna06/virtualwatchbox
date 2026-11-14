import type { ReactNode } from 'react'
import { privatePageMetadata } from '@/lib/siteMetadata'

export const metadata = { ...privatePageMetadata, title: 'Edit Playground Watch' }

export default function EditPlaygroundLayout({ children }: { children: ReactNode }) {
  return children
}
