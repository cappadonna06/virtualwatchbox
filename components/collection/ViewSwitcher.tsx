import { type ReactNode } from 'react'
import { brand } from '@/lib/brand'

type View = 'watchbox' | 'cards' | 'photo'

interface Props {
  activeView: View
  setActiveView: (v: View) => void
  availableViews?: View[]
}

const TABS: { id: View; label: string; icon?: ReactNode }[] = [
  { id: 'watchbox', label: 'Watchbox' },
  { id: 'cards',    label: 'Cards'    },
  {
    id: 'photo',
    label: 'Photo',
    icon: (
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M2.25 5h2.4l1.1-1.5h4.5l1.1 1.5h2.4a1 1 0 0 1 1 1v6.5a1 1 0 0 1-1 1H2.25a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
        <circle cx="8" cy="9.25" r="2.5" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
  },
]

const DEFAULT_VIEWS: View[] = ['watchbox', 'cards', 'photo']

export default function ViewSwitcher({ activeView, setActiveView, availableViews = DEFAULT_VIEWS }: Props) {
  const visibleTabs = TABS.filter(tab => availableViews.includes(tab.id))
  return (
    <div
      style={{
        display: 'inline-flex',
        border: `1px solid ${brand.colors.borderMid}`,
        borderRadius: 6,
        background: brand.colors.bg,
        overflow: 'hidden',
      }}
    >
      {visibleTabs.map((tab, i) => {
        const isActive = activeView === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id)}
            style={{
              fontFamily: brand.font.sans,
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: '0.04em',
              padding: '8px 22px',
              background: isActive ? brand.colors.ink : 'transparent',
              color: isActive ? brand.colors.bg : brand.colors.muted,
              border: 'none',
              borderLeft: i > 0 ? `1px solid ${brand.colors.borderMid}` : 'none',
              cursor: 'pointer',
              transition: 'background 0.15s, color 0.15s',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
