import type { ReactNode } from 'react'
import { brand } from '@/lib/brand'

interface ResponsiveSidebarSheetProps {
  active: boolean
  onClose: () => void
  top?: number
  children: ReactNode
}

export default function ResponsiveSidebarSheet({
  active,
  onClose,
  top = 84,
  children,
}: ResponsiveSidebarSheetProps) {
  return (
    <>
      <div
        className="sidebar-desktop"
        style={{
          alignSelf: 'start',
          position: 'sticky',
          top,
        }}
      >
        {children}
      </div>

      {active && (
        <>
          <div
            className="sidebar-backdrop is-active"
            onClick={onClose}
          />

          <div
            className="sidebar-mobile-sheet is-active"
            role="dialog"
            aria-modal="true"
          >
            <div className="sidebar-drag-pill" style={{ display: 'none', justifyContent: 'center', padding: '12px 0 4px' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: brand.colors.borderLight }} />
            </div>

            <button
              className="sidebar-close-btn"
              onClick={onClose}
              aria-label="Close watch details"
              style={{
                display: 'none',
                position: 'absolute',
                top: 14,
                right: 16,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: brand.colors.muted,
                fontSize: 18,
                lineHeight: 1,
                padding: 4,
              }}
            >
              ✕
            </button>

            <div className="sidebar-content">
              {children}
            </div>
          </div>
        </>
      )}
    </>
  )
}
