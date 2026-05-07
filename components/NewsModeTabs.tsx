'use client'

import { brand } from '@/lib/brand'

export type NewsMode = 'for-you' | 'all'

type Props = {
  mode: NewsMode
  onChange: (mode: NewsMode) => void
  forYouAvailable: boolean
}

export default function NewsModeTabs({ mode, onChange, forYouAvailable }: Props) {
  return (
    <div
      role="tablist"
      style={{
        display: 'flex',
        gap: 28,
        borderBottom: `1px solid ${brand.colors.border}`,
        marginBottom: 20,
      }}
    >
      <Tab
        label="For You"
        active={mode === 'for-you'}
        disabled={!forYouAvailable}
        onClick={() => onChange('for-you')}
      />
      <Tab
        label="All"
        active={mode === 'all'}
        onClick={() => onChange('all')}
      />
    </div>
  )
}

function Tab({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string
  active: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      disabled={disabled}
      style={{
        background: 'transparent',
        border: 'none',
        padding: '10px 0 14px',
        margin: 0,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: brand.font.serif,
        fontSize: 22,
        fontWeight: 500,
        lineHeight: 1.1,
        color: active ? brand.colors.ink : disabled ? brand.colors.borderLight : brand.colors.muted,
        borderBottom: `2px solid ${active ? brand.colors.gold : 'transparent'}`,
        marginBottom: -1,
        transition: `color ${brand.transition.base}, border-color ${brand.transition.base}`,
      }}
    >
      {label}
    </button>
  )
}
