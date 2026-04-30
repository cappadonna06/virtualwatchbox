'use client'

import type { ReactNode } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import type { ResolvedOwnedWatch, ResolvedWatch, WatchCondition } from '@/types/watch'
import { brand } from '@/lib/brand'
import { useCollectionSession } from '@/app/collection/CollectionSessionProvider'
import WatchStateControl from './WatchStateControl'

const conditionColors: Record<WatchCondition, { bg: string; text: string }> = {
  Unworn:    { bg: brand.condition.unworn.bg,    text: brand.condition.unworn.text },
  'Like New':{ bg: brand.condition.likeNew.bg,   text: brand.condition.likeNew.text },
  Excellent: { bg: brand.condition.excellent.bg, text: brand.condition.excellent.text },
  Good:      { bg: brand.condition.good.bg,      text: brand.condition.good.text },
  Fair:      { bg: brand.condition.fair.bg,      text: brand.condition.fair.text },
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
        borderRadius: brand.radius.sm,
        border: `1px solid ${brand.colors.borderMid}`,
        background: brand.colors.white,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: brand.colors.muted,
      }}
      title={label}
      aria-label={label}
    >
      {children}
    </button>
  )
}

const sidebarPanel: React.CSSProperties = {
  background: brand.colors.white,
  border: `1px solid ${brand.colors.border}`,
  borderRadius: brand.radius.xl,
  padding: 24,
  position: 'sticky',
  top: 88,
  boxShadow: brand.shadow.lg,
}

const metaLabel: React.CSSProperties = {
  fontFamily: brand.font.sans,
  fontSize: 10,
  fontWeight: 500,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: brand.colors.muted,
}

const btnPrimary: React.CSSProperties = {
  display: 'block',
  fontFamily: brand.font.sans,
  fontSize: 10,
  fontWeight: 500,
  letterSpacing: '0.08em',
  padding: '9px 18px',
  background: brand.colors.ink,
  color: brand.colors.bg,
  border: 'none',
  borderRadius: brand.radius.btn,
  cursor: 'pointer',
  width: '100%',
  textDecoration: 'none',
  textAlign: 'center',
}

const btnSecondary: React.CSSProperties = {
  fontFamily: brand.font.sans,
  fontSize: 10,
  fontWeight: 500,
  letterSpacing: '0.08em',
  padding: '9px 18px',
  background: 'transparent',
  color: brand.colors.ink,
  border: `1px solid ${brand.colors.borderLight}`,
  borderRadius: brand.radius.btn,
  cursor: 'pointer',
  width: '100%',
}

interface Props {
  watch: ResolvedOwnedWatch | ResolvedWatch | null
  mode?: 'collection' | 'playground' | 'followed'
  sticky?: boolean
  catalogWatchId?: string | null
  onRequestDelete?: (watch: ResolvedOwnedWatch | ResolvedWatch) => void
  onRequestEdit?: (watch: ResolvedOwnedWatch | ResolvedWatch) => void
}

export default function WatchSidebar({
  watch,
  mode = 'collection',
  sticky = true,
  catalogWatchId,
  onRequestDelete,
  onRequestEdit,
}: Props) {
  const router = useRouter()
  const { getWatchSavedState } = useCollectionSession()
  const panelStyle: React.CSSProperties = sticky
    ? sidebarPanel
    : {
        ...sidebarPanel,
        position: 'static',
        top: undefined,
      }

  if (!watch) {
    return (
      <div style={{ ...panelStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ ...metaLabel, marginBottom: 10 }}>
            Select a Watch
          </div>
          <div style={{ fontFamily: brand.font.serif, fontSize: 18, color: brand.colors.borderLight }}>
            Click any slot to view details
          </div>
        </div>
      </div>
    )
  }

  const colors = conditionColors[watch.condition]
  const resolvedCatalogWatchId = catalogWatchId ?? watch.watchId
  const canEdit = mode === 'collection' || Boolean(onRequestEdit)
  const canDelete = Boolean(onRequestDelete)
  const isOwnedWatch = mode === 'collection'
  const showConditionBadge = mode !== 'followed'
  const savedState = getWatchSavedState(resolvedCatalogWatchId)
  const marketLabel = !isOwnedWatch && savedState === 'grail' ? 'Find on Market ↗' : 'Find For Sale ↗'

  return (
    <div style={panelStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={metaLabel}>Watch Detail</div>
        {(canEdit || canDelete) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {canEdit && (
              <IconButton label="Edit watch" onClick={() => onRequestEdit?.(watch)}>
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M1 9.5V11h1.5l4.42-4.42-1.5-1.5L1 9.5zm7.07-5.07c.2-.2.2-.51 0-.71L6.99 2.64a.5.5 0 00-.71 0L5.13 3.79l1.5 1.5 1.44-1.44z" fill="currentColor" />
                </svg>
              </IconButton>
            )}
            {canDelete && (
              <IconButton label="Delete watch" onClick={() => onRequestDelete?.(watch)}>
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M4.5 1.5h3l.3.8H10v1H2v-1h2.2l.3-.8zM3 4h6l-.5 6.2a.8.8 0 01-.8.8H4.3a.8.8 0 01-.8-.8L3 4zm2 1v5h1V5H5zm2 0v5h1V5H7z" fill="currentColor" />
                </svg>
              </IconButton>
            )}
          </div>
        )}
      </div>

      <div style={{ position: 'relative', width: 160, maxWidth: '100%', margin: '0 auto 16px', aspectRatio: '1/1' }}>
        <Image
          src={watch.imageUrl}
          alt={watch.model}
          fill
          sizes="160px"
          style={{ objectFit: 'contain', filter: brand.shadow.drop }}
        />
        <WatchStateControl
          catalogWatchId={resolvedCatalogWatchId}
          source="sidebar"
        />
      </div>

      <div style={{ ...metaLabel, marginBottom: 4 }}>
        {watch.brand.toUpperCase()}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 3 }}>
        <h3 style={{ fontFamily: brand.font.serif, fontSize: 26, fontWeight: 400, lineHeight: 1.1, color: brand.colors.ink, margin: 0 }}>
          {watch.model}
        </h3>
        {showConditionBadge && (
          <span
            style={{
              display: 'inline-block',
              padding: '3px 10px',
              borderRadius: brand.radius.pill,
              fontFamily: brand.font.sans,
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
        )}
      </div>
      <div style={{ fontSize: 12, color: brand.colors.muted, marginBottom: 4 }}>Ref. {watch.reference}</div>
      {watch.notes && (
        <div style={{ fontSize: 11, color: brand.colors.gold, fontStyle: 'italic', marginBottom: 16 }}>
          &ldquo;{watch.notes}&rdquo;
        </div>
      )}

      <div
        style={{
          background: brand.colors.bg,
          border: `1px solid ${brand.colors.border}`,
          borderRadius: brand.radius.md,
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          margin: '16px 0',
        }}
      >
        <span style={metaLabel}>Est. Market Value</span>
        <span style={{ fontFamily: brand.font.sans, fontSize: 18, fontWeight: 600, color: brand.colors.gold }}>
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
            ...('purchasePrice' in watch ? [['Price Paid', fmt(watch.purchasePrice)] as [string, string]] : []),
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
            <span style={{ color: brand.colors.muted, fontWeight: 400 }}>{label}</span>
            <span style={{ color: brand.colors.ink, fontWeight: 500, textAlign: 'right', maxWidth: '55%' }}>{value}</span>
          </div>
        ))}
      </div>

      {mode === 'playground' || mode === 'followed' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <a
            href={`https://www.chrono24.com/search/index.htm?query=${encodeURIComponent(watch.brand + ' ' + watch.model)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={btnPrimary}
          >
            {marketLabel}
          </a>
          {mode === 'followed' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button onClick={() => router.push(`/collection/add/${resolvedCatalogWatchId}`)} style={btnSecondary}>
                Add to My Collection
              </button>
              <button
                onClick={() => router.push(`/collection/add/${resolvedCatalogWatchId}?dest=playground`)}
                style={btnSecondary}
              >
                Add to Playground
              </button>
            </div>
          ) : (
            <button onClick={() => router.push(`/collection/add/${resolvedCatalogWatchId}`)} style={btnSecondary}>
              Add to My Collection
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <a
            href={`https://www.chrono24.com/search/index.htm?query=${encodeURIComponent(watch.brand + ' ' + watch.model)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={btnPrimary}
          >
            Find For Sale ↗
          </a>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button style={btnSecondary}>Sell This Watch</button>
            <button style={btnSecondary}>Swap Strap</button>
          </div>
        </div>
      )}
    </div>
  )
}
