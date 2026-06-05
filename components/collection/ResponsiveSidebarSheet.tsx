'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
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
  const reduce = useReducedMotion()

  // The parent nulls the selection the instant `active` flips false, so the
  // live children blank out before the sheet finishes sliding away. Hold the
  // last populated tree and render that copy while the sheet animates out.
  const heldChildren = useRef<ReactNode>(children)
  if (active) heldChildren.current = children
  const sheetChildren = active ? children : heldChildren.current

  useEffect(() => {
    if (!active) return
    document.documentElement.classList.add('sheet-lock')
    return () => document.documentElement.classList.remove('sheet-lock')
  }, [active])

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

      <AnimatePresence>
        {active && (
          <motion.div
            key="sidebar-backdrop"
            className="sidebar-backdrop is-active"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.25, ease: 'easeOut' }}
          />
        )}
        {active && (
          <motion.div
            key="sidebar-sheet"
            className="sidebar-mobile-sheet"
            role="dialog"
            aria-modal="true"
            initial={reduce ? false : { y: '110%' }}
            animate={{ y: 0 }}
            exit={reduce ? { opacity: 0 } : { y: '110%' }}
            transition={{ duration: reduce ? 0 : 0.32, ease: [0.32, 0.72, 0, 1] }}
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
                top: 10,
                right: 12,
                width: brand.controls.iconButton.size,
                height: brand.controls.iconButton.size,
                alignItems: 'center',
                justifyContent: 'center',
                background: 'none',
                border: 'none',
                borderRadius: brand.controls.iconButton.radius,
                cursor: 'pointer',
                color: brand.colors.muted,
                fontSize: 22,
                lineHeight: 1,
                padding: 0,
              }}
            >
              ✕
            </button>

            <div className="sidebar-content">
              {sheetChildren}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
