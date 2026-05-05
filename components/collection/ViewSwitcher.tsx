import { type ReactNode } from 'react'
import { brand } from '@/lib/brand'

type View = 'watchbox' | 'cards' | 'photo'

interface Props {
  activeView: View
  setActiveView: (v: View) => void
  availableViews?: View[]
}

const TABS: { id: View; label: string; icon: ReactNode; disabled?: boolean }[] = [
  {
    id: 'watchbox',
    label: 'Watchbox',
    icon: (
      <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="4" width="14" height="11" rx="1.5" />
        <line x1="3" y1="9.5" x2="17" y2="9.5" />
        <line x1="10" y1="4" x2="10" y2="15" />
      </svg>
    ),
  },
  {
    id: 'cards',
    label: 'Cards',
    icon: (
      <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3.5" width="6" height="13" rx="1.2" />
        <rect x="11" y="3.5" width="6" height="13" rx="1.2" />
      </svg>
    ),
  },
  {
    id: 'photo',
    label: 'Photo',
    icon: (
      <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="4" width="14" height="11" rx="1.5" />
        <circle cx="7.5" cy="8" r="1.2" />
        <polyline points="4,14 8.5,10 11.5,12.5 16,8.5" />
      </svg>
    ),
  },
]

const DEFAULT_VIEWS: View[] = ['watchbox', 'cards', 'photo']

export default function ViewSwitcher({ activeView, setActiveView, availableViews = DEFAULT_VIEWS }: Props) {
  const visibleTabs = TABS.filter(tab => availableViews.includes(tab.id))
  return (
    <div
      role="tablist"
      style={{
        display: 'inline-flex',
        gap: 2,
        background: brand.colors.border,
        borderRadius: brand.radius.sm,
        padding: 3,
      }}
    >
      {visibleTabs.map(tab => {
        const isActive = activeView === tab.id
        const disabled = Boolean(tab.disabled)
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-disabled={disabled}
            title={disabled ? `${tab.label} — coming soon` : tab.label}
            onClick={() => !disabled && setActiveView(tab.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: brand.font.sans,
              fontSize: 10.5,
              fontWeight: 500,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '7px 12px',
              borderRadius: brand.radius.btn,
              border: 'none',
              cursor: disabled ? 'not-allowed' : 'pointer',
              background: isActive ? brand.colors.white : 'transparent',
              color: disabled ? brand.colors.borderLight : isActive ? brand.colors.ink : brand.colors.muted,
              boxShadow: isActive ? brand.shadow.xs : 'none',
              opacity: disabled ? 0.65 : 1,
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {disabled && (
              <span
                style={{
                  fontSize: 7.5,
                  fontWeight: 600,
                  letterSpacing: '0.10em',
                  textTransform: 'uppercase',
                  background: brand.colors.bg,
                  color: brand.colors.muted,
                  padding: '1px 5px',
                  borderRadius: brand.radius.md,
                  border: `1px solid ${brand.colors.border}`,
                  marginLeft: 2,
                }}
              >
                Soon
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
