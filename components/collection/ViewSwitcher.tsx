type View = 'watchbox' | 'cards' | 'stats'

interface Props {
  activeView: View
  setActiveView: (v: View) => void
}

const TABS: { id: View; label: string }[] = [
  { id: 'watchbox', label: 'Watchbox' },
  { id: 'cards',    label: 'Cards'    },
  { id: 'stats',    label: 'Stats'    },
]

export default function ViewSwitcher({ activeView, setActiveView }: Props) {
  return (
    <div
      style={{
        display: 'inline-flex',
        border: '1px solid #E8E2D8',
        borderRadius: 6,
        background: '#FAF8F4',
        marginBottom: 28,
        overflow: 'hidden',
      }}
    >
      {TABS.map((tab, i) => {
        const isActive = activeView === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id)}
            style={{
              fontFamily: 'var(--font-dm-sans)',
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: '0.04em',
              padding: '8px 22px',
              background: isActive ? '#1A1410' : 'transparent',
              color: isActive ? '#FAF8F4' : '#A89880',
              border: 'none',
              borderLeft: i > 0 ? '1px solid #E8E2D8' : 'none',
              cursor: 'pointer',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
