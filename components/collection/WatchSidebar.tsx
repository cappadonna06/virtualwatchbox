'use client'

import type { ReactNode } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import type { Watch, WatchCondition } from '@/types/watch'

const conditionColors: Record<WatchCondition, { bg: string; text: string }> = {
  Unworn: { bg: '#E8F4E8', text: '#2D6A2D' },
  'Like New': { bg: '#EDF4E8', text: '#3A6A2D' },
  Excellent: { bg: '#FFF8E6', text: '#8A6A10' },
  Good: { bg: '#FDF0E0', text: '#8A5010' },
  Fair: { bg: '#FAE8E8', text: '#8A2020' },
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function IconButton({
  children,
  label,
  onClick,
}: {
  children: ReactNode
  label: string
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 24,
        height: 24,
        borderRadius: 6,
        border: '1px solid #E8E2D8',
        background: '#FFFFFF',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#A89880',
      }}
      title={label}
      aria-label={label}
    >
      {children}
    </button>
  )
}

interface Props {
  watch: Watch | null
  mode?: 'collection' | 'playground'
  sourceWatchId?: string | null
  onRequestDelete?: (watch: Watch) => void
  onRequestEdit?: (watch: Watch) => void
}

export default function WatchSidebar({
  watch,
  mode = 'collection',
  sourceWatchId,
  onRequestDelete,
  onRequestEdit,
}: Props) {
  const router = useRouter()

  if (!watch) {
    return (
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #EAE5DC',
          borderRadius: 12,
          padding: 24,
          position: 'sticky',
          top: 88,
          boxShadow: '0 4px 24px rgba(26,20,16,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 400,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A89880', marginBottom: 10 }}>
            Select a Watch
          </div>
          <div style={{ fontFamily: 'var(--font-cormorant)', fontSize: 18, color: '#D4CBBF' }}>
            Click any slot to view details
          </div>
        </div>
      </div>
    )
  }

  const colors = conditionColors[watch.condition]
  const sourceId = sourceWatchId ?? watch.id

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #EAE5DC',
        borderRadius: 12,
        padding: 24,
        position: 'sticky',
        top: 88,
        boxShadow: '0 4px 24px rgba(26,20,16,0.06)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A89880' }}>
          Watch Detail
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <IconButton label="Edit watch" onClick={() => onRequestEdit?.(watch)}>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M1 9.5V11h1.5l4.42-4.42-1.5-1.5L1 9.5zm7.07-5.07c.2-.2.2-.51 0-.71L6.99 2.64a.5.5 0 00-.71 0L5.13 3.79l1.5 1.5 1.44-1.44z" fill="currentColor" />
            </svg>
          </IconButton>
          <IconButton label="Delete watch" onClick={() => onRequestDelete?.(watch)}>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M4.5 1.5h3l.3.8H10v1H2v-1h2.2l.3-.8zM3 4h6l-.5 6.2a.8.8 0 01-.8.8H4.3a.8.8 0 01-.8-.8L3 4zm2 1v5h1V5H5zm2 0v5h1V5H7z" fill="currentColor" />
            </svg>
          </IconButton>
        </div>
      </div>

      <div style={{ position: 'relative', width: 160, maxWidth: '100%', margin: '0 auto 16px', aspectRatio: '1/1' }}>
        <Image
          src={watch.imageUrl}
          alt={watch.model}
          fill
          sizes="160px"
          style={{ objectFit: 'contain', filter: 'drop-shadow(0 8px 16px rgba(26,20,16,0.10))' }}
        />
      </div>

      <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A89880', marginBottom: 4 }}>
        {watch.brand.toUpperCase()}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 3 }}>
        <h3 style={{ fontFamily: 'var(--font-cormorant)', fontSize: 26, fontWeight: 400, lineHeight: 1.1, color: '#1A1410', margin: 0 }}>
          {watch.model}
        </h3>
        <span
          style={{
            display: 'inline-block',
            padding: '3px 10px',
            borderRadius: 20,
            fontFamily: 'var(--font-dm-sans)',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.04em',
            background: colors.bg,
            color: colors.text,
            flexShrink: 0,
          }}
        >
          {watch.condition}
        </span>
      </div>
      <div style={{ fontSize: 12, color: '#A89880', marginBottom: 4 }}>Ref. {watch.reference}</div>
      {watch.notes && (
        <div style={{ fontSize: 11, color: '#C9A84C', fontStyle: 'italic', marginBottom: 16 }}>
          &ldquo;{watch.notes}&rdquo;
        </div>
      )}

      <div
        style={{
          background: '#FAF8F4',
          border: '1px solid #EAE5DC',
          borderRadius: 8,
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          margin: '16px 0',
        }}
      >
        <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A89880' }}>
          Est. Market Value
        </span>
        <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 18, fontWeight: 600, color: '#C9A84C' }}>
          {fmt(watch.estimatedValue)}
        </span>
      </div>

      <div style={{ marginBottom: 16 }}>
        {(
          [
            ['Case Size', `${watch.caseSizeMm}mm`],
            ['Case Material', watch.caseMaterial],
            ['Dial Color', watch.dialColor],
            ['Movement', watch.movement],
            ['Complications', watch.complications.join(', ') || '—'],
            ...(mode === 'collection' ? [['Price Paid', fmt(watch.purchasePrice)] as [string, string]] : []),
          ] as [string, string][]
        ).map(([label, value]) => (
          <div
            key={label}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              padding: '9px 0',
              borderBottom: '1px solid #F0EBE3',
              fontSize: 12,
            }}
          >
            <span style={{ color: '#A89880', fontWeight: 400 }}>{label}</span>
            <span style={{ color: '#1A1410', fontWeight: 500, textAlign: 'right', maxWidth: '55%' }}>{value}</span>
          </div>
        ))}
      </div>

      {mode === 'playground' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <a
            href={`https://www.chrono24.com/search/index.htm?query=${encodeURIComponent(watch.brand + ' ' + watch.model)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block',
              fontFamily: 'var(--font-dm-sans)',
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: '0.08em',
              padding: '9px 18px',
              background: '#1A1410',
              color: '#FAF8F4',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              width: '100%',
              textDecoration: 'none',
              textAlign: 'center',
            }}
          >
            Find For Sale ↗
          </a>
          <button
            onClick={() => router.push(`/collection/add/${sourceId}`)}
            style={{
              fontFamily: 'var(--font-dm-sans)',
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: '0.08em',
              padding: '9px 18px',
              background: 'transparent',
              color: '#1A1410',
              border: '1px solid #D4CBBF',
              borderRadius: 4,
              cursor: 'pointer',
              width: '100%',
            }}
          >
            Add to My Collection
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <a
            href={`https://www.chrono24.com/search/index.htm?query=${encodeURIComponent(watch.brand + ' ' + watch.model)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block',
              fontFamily: 'var(--font-dm-sans)',
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: '0.08em',
              padding: '9px 18px',
              background: '#1A1410',
              color: '#FAF8F4',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              width: '100%',
              textDecoration: 'none',
              textAlign: 'center',
            }}
          >
            Find For Sale ↗
          </a>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button
              style={{
                fontFamily: 'var(--font-dm-sans)',
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: '0.08em',
                padding: '9px 18px',
                background: 'transparent',
                color: '#1A1410',
                border: '1px solid #D4CBBF',
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              Sell This Watch
            </button>
            <button
              style={{
                fontFamily: 'var(--font-dm-sans)',
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: '0.08em',
                padding: '9px 18px',
                background: 'transparent',
                color: '#1A1410',
                border: '1px solid #D4CBBF',
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              Swap Strap
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
