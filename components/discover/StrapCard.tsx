'use client'

import { brand } from '@/lib/brand'
import { useCollectionSession } from '@/app/collection/CollectionSessionProvider'

type Props = {
  name: string
  material: string
  lugWidth?: string
}

export default function StrapCard({ name, material, lugWidth }: Props) {
  const { showToast } = useCollectionSession()

  return (
    <div
      style={{
        background: brand.colors.white,
        border: `1px solid ${brand.colors.border}`,
        borderRadius: brand.radius.md,
        padding: '16px 20px',
        width: 160,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <div
        style={{
          fontFamily: brand.font.sans,
          fontSize: 13,
          fontWeight: 500,
          color: brand.colors.ink,
        }}
      >
        {name}
      </div>
      <div
        style={{
          fontFamily: brand.font.sans,
          fontSize: 11,
          color: brand.colors.muted,
        }}
      >
        {material}
      </div>
      {lugWidth && (
        <div
          style={{
            fontFamily: brand.font.sans,
            fontSize: 11,
            color: brand.colors.muted,
          }}
        >
          {lugWidth}
        </div>
      )}
      <button
        type="button"
        onClick={() => showToast('Strap Swap coming soon.')}
        style={{
          fontFamily: brand.font.sans,
          fontSize: 11,
          color: brand.colors.gold,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          marginTop: 6,
          textAlign: 'left',
        }}
      >
        Explore Strap Swap
      </button>
    </div>
  )
}
