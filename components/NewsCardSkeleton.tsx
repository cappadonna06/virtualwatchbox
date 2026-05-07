'use client'

import { brand } from '@/lib/brand'

type Props = {
  variant: 'full' | 'compact'
}

export default function NewsCardSkeleton({ variant }: Props) {
  const isFull = variant === 'full'
  const thumbSize = isFull ? 96 : 64

  return (
    <div
      aria-hidden
      style={{
        display: 'flex',
        gap: 14,
        padding: isFull ? '14px' : '0 0 14px 0',
        borderBottom: isFull ? 'none' : `1px solid ${brand.colors.border}`,
        animation: 'vw-news-pulse 1.4s ease-in-out infinite',
      }}
    >
      <div
        style={{
          width: thumbSize,
          height: thumbSize,
          flexShrink: 0,
          borderRadius: brand.radius.sm,
          background: brand.colors.slot,
          border: `1px dashed ${brand.colors.borderLight}`,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ height: 10, width: '40%', background: brand.colors.slot, borderRadius: 4, marginBottom: 8 }} />
        <div style={{ height: 16, width: '90%', background: brand.colors.slot, borderRadius: 4, marginBottom: 6 }} />
        <div style={{ height: 16, width: '70%', background: brand.colors.slot, borderRadius: 4, marginBottom: 10 }} />
        {isFull && (
          <>
            <div style={{ height: 10, width: '95%', background: brand.colors.slot, borderRadius: 4, marginBottom: 4 }} />
            <div style={{ height: 10, width: '85%', background: brand.colors.slot, borderRadius: 4, marginBottom: 4 }} />
            <div style={{ height: 10, width: '60%', background: brand.colors.slot, borderRadius: 4 }} />
          </>
        )}
      </div>
    </div>
  )
}
