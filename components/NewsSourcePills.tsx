'use client'

import { brand } from '@/lib/brand'
import type { SourceName } from '@/types/news'

type Pill = 'All' | SourceName

type Props = {
  active: Pill
  counts: Record<SourceName, number>
  totalCount: number
  onChange: (p: Pill) => void
}

const SOURCES: SourceName[] = ['Hodinkee', 'Worn & Wound', 'Fratello', 'Monochrome', 'ABTW']

export default function NewsSourcePills({ active, counts, totalCount, onChange }: Props) {
  const pills: { key: Pill; label: string; count: number }[] = [
    { key: 'All', label: 'All sources', count: totalCount },
    ...SOURCES.map((s) => ({ key: s, label: s, count: counts[s] ?? 0 })),
  ]

  return (
    <div
      className="news-source-pills"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
      }}
    >
      {pills.map((p) => {
        const isActive = active === p.key
        return (
          <button
            key={p.key}
            type="button"
            onClick={() => onChange(p.key)}
            style={{
              padding: '7px 14px',
              fontFamily: brand.font.sans,
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.04em',
              border: `1px solid ${isActive ? brand.colors.goldLine : brand.colors.borderLight}`,
              background: isActive ? brand.colors.goldWash : brand.colors.white,
              color: isActive ? brand.colors.gold : brand.colors.muted,
              borderRadius: brand.radius.pill,
              cursor: 'pointer',
              transition: `background ${brand.transition.fast}, color ${brand.transition.fast}, border-color ${brand.transition.fast}`,
              whiteSpace: 'nowrap',
            }}
          >
            {p.label}
            <span style={{ marginLeft: 6, opacity: 0.7, fontWeight: 400 }}>({p.count})</span>
          </button>
        )
      })}
    </div>
  )
}
