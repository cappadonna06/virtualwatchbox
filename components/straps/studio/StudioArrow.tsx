'use client'

import { motion } from 'framer-motion'
import { useState, type ReactNode } from 'react'
import { brand } from '@/lib/brand'
import { StrapIcon } from '../atoms'

const arrowStates = {
  rest: { backgroundColor: brand.colors.paper, borderColor: brand.colors.goldLine, scale: 1 },
  hover: { backgroundColor: brand.colors.goldWash, borderColor: brand.colors.goldDeep, scale: 1 },
  press: { backgroundColor: brand.colors.goldWash, borderColor: brand.colors.goldDeep, scale: 0.94 },
}

export default function StudioArrow({ dir, onClick, disabled = false, preview }: {
  dir: 'prev' | 'next'
  onClick: () => void
  disabled?: boolean
  preview?: { content: ReactNode; label: string }
}) {
  const action = dir === 'prev' ? 'Previous strap' : 'Next strap'
  const [focusVisible, setFocusVisible] = useState(false)
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={preview ? `${action} · ${preview.label}` : action}
      title={preview?.label}
      onFocus={event => setFocusVisible(event.currentTarget.matches(':focus-visible'))}
      onKeyDown={() => setFocusVisible(true)}
      onBlur={() => setFocusVisible(false)}
      onPointerDown={() => setFocusVisible(false)}
      initial={false}
      animate="rest"
      whileHover={disabled ? undefined : 'hover'}
      whileTap={disabled ? undefined : 'press'}
      style={{
        flex: preview ? '0 1 auto' : '0 0 auto', display: 'grid', placeItems: 'center',
        width: preview ? 'clamp(48px, 15vw, 96px)' : 46, minWidth: 46, padding: 0,
        background: 'transparent', border: 0, borderRadius: preview ? brand.radius.sm : '50%',
        outline: 'none',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.35 : 1,
      }}
    >
      {preview && (
        <div aria-hidden="true" style={{ gridArea: '1 / 1', width: '100%', display: 'grid', justifyItems: 'center' }}>
          {preview.content}
        </div>
      )}
      <motion.span
        aria-hidden="true"
        variants={arrowStates}
        transition={{ duration: 0.15 }}
        style={{
          gridArea: '1 / 1', display: 'grid', placeItems: 'center',
          width: 46, height: 46, borderRadius: '50%',
          border: `1px solid ${brand.colors.goldLine}`, backgroundColor: brand.colors.paper,
          color: brand.colors.ink, boxShadow: brand.shadow.sm,
          outline: focusVisible ? `2px solid ${brand.colors.goldDeep}` : undefined,
          outlineOffset: 3,
        }}
      >
        <StrapIcon name={dir === 'prev' ? 'arrowLeft' : 'arrowRight'} size={25} sw={1.65} />
      </motion.span>
    </motion.button>
  )
}
