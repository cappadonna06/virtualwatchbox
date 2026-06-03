import type { ServiceWatch } from '@/lib/serviceRoom/derive'

export type LayoutProps = {
  watches: ServiceWatch[]
  now: Date
  onPick: (sw: ServiceWatch) => void
  onLog: (sw: ServiceWatch) => void
  activeId: string | null
}
