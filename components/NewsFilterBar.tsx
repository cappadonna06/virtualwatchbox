'use client'

import { brand } from '@/lib/brand'
import SortDropdown from '@/components/collection/SortDropdown'

type Props = {
  search: string
  onSearchChange: (v: string) => void
  brandValue: string
  onBrandChange: (v: string) => void
  brandOptions: string[]
}

export default function NewsFilterBar({
  search,
  onSearchChange,
  brandValue,
  onBrandChange,
  brandOptions,
}: Props) {
  const dropdownOptions = [
    { value: 'all', label: 'All brands' },
    ...brandOptions.map((b) => ({ value: b, label: b })),
  ]

  return (
    <div
      className="news-filter-bar"
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'center',
      }}
    >
      <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
        <SearchIcon />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search articles, brands, references…"
          aria-label="Search news articles"
          style={{
            width: '100%',
            height: 44,
            padding: '0 14px 0 42px',
            border: `1px solid ${brand.colors.borderLight}`,
            borderRadius: brand.radius.md,
            background: brand.colors.white,
            fontFamily: brand.font.sans,
            fontSize: 14,
            color: brand.colors.ink,
            outline: 'none',
            boxShadow: brand.shadow.xs,
            transition: `border-color ${brand.transition.base}, box-shadow ${brand.transition.base}`,
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = brand.colors.goldLine
            e.currentTarget.style.boxShadow = `0 0 0 3px ${brand.colors.goldWash}`
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = brand.colors.borderLight
            e.currentTarget.style.boxShadow = brand.shadow.xs
          }}
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            aria-label="Clear search"
            style={{
              position: 'absolute',
              top: '50%',
              right: 12,
              transform: 'translateY(-50%)',
              width: 22,
              height: 22,
              border: 'none',
              borderRadius: brand.radius.circle,
              background: brand.colors.border,
              color: brand.colors.muted,
              fontSize: 14,
              lineHeight: 1,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        )}
      </div>

      <SortDropdown
        label="Brand"
        value={brandValue}
        onChange={onBrandChange}
        options={dropdownOptions}
      />
    </div>
  )
}

function SearchIcon() {
  return (
    <svg
      aria-hidden
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      style={{
        position: 'absolute',
        top: '50%',
        left: 14,
        transform: 'translateY(-50%)',
        color: brand.colors.muted,
      }}
    >
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6" />
      <path d="M20 20L16.5 16.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
