'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ResolvedOwnedWatch, ResolvedWatch, WatchCondition } from '@/types/watch'
import { brand } from '@/lib/brand'
import { dialColorToHex } from '@/lib/dialColors'
import { buildChrono24URL } from '@/lib/discover'
import { useCollectionSession } from '@/app/collection/CollectionSessionProvider'
import { toStrapDrawerWatch } from '@/components/straps/useStrapDrawerWatches'
import WatchImageOrDial from '@/components/watchbox/WatchImageOrDial'
import WatchPhotoGallery from './WatchPhotoGallery'
import WatchStateControl from './WatchStateControl'
import { IntentBadge } from './WatchStateIcons'

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
        width: brand.controls.iconButton.size,
        height: brand.controls.iconButton.size,
        borderRadius: brand.controls.iconButton.radius,
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
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: brand.colors.muted,
}

const btnPrimary: React.CSSProperties = {
  display: 'block',
  fontFamily: brand.font.sans,
  fontSize: 12,
  fontWeight: 600,
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
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: '0.08em',
  padding: '9px 18px',
  background: 'transparent',
  color: brand.colors.ink,
  border: `1px solid ${brand.colors.borderLight}`,
  borderRadius: brand.radius.btn,
  cursor: 'pointer',
  width: '100%',
}

// Compact single-line variant for the side-by-side secondary action grid —
// keeps the buttons short rather than wrapping to several lines.
const btnAction: React.CSSProperties = {
  ...btnSecondary,
  padding: '8px 10px',
  fontSize: 11.5,
  letterSpacing: '0.04em',
  textAlign: 'center',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

interface Props {
  watch: ResolvedOwnedWatch | ResolvedWatch | null
  mode?: 'collection' | 'playground' | 'followed' | 'public'
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
  const {
    getWatchSavedState,
    isWatchJewel,
    isWatchTarget,
    promoteToNextTarget,
    removeFromNextTargets,
    showToast,
    getCatalogWatch,
  } = useCollectionSession()
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
  const isPublicMode = mode === 'public'
  const showConditionBadge = mode !== 'followed'
  const savedState = getWatchSavedState(resolvedCatalogWatchId)
  const showJewelBadge = mode === 'collection' && isWatchJewel(resolvedCatalogWatchId)

  const isTarget = isWatchTarget(resolvedCatalogWatchId)
  const marketLabel = !isOwnedWatch && savedState === 'grail' && !isPublicMode ? 'Find on Market ↗' : 'Find For Sale ↗'

  // Strap Drawer wiring (owner-only). Integrated bracelets can't take straps.
  const strapWatch = isOwnedWatch ? toStrapDrawerWatch(watch, getCatalogWatch(watch.watchId)) : null
  const isIntegrated = strapWatch?.braceletType === 'integrated'

  // Owned mode shows a trimmed, glanceable spec set; the full sheet lives on
  // /collection/watch/[id]. Non-owned modes keep the fuller set — they have no
  // detail-page fallback, so dropping rows there would lose the data.
  const specRows: [string, string][] = [
    ['Case Size', `${watch.caseSizeMm}mm`],
    ...(watch.lugWidthMm ? [['Lug Width', `${watch.lugWidthMm}mm`] as [string, string]] : []),
    ['Case Material', watch.caseMaterial],
    ...(isOwnedWatch
      ? []
      : [
          ['Dial Color', watch.dialColor] as [string, string],
          ['Movement', watch.movement] as [string, string],
          ['Complications', watch.complications.join(', ') || '—'] as [string, string],
        ]),
  ]

  return (
    <div style={panelStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={metaLabel}>Watch Detail</div>
        {(canEdit || canDelete) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {canEdit && (
              <IconButton
                label="Edit watch"
                onClick={() => {
                  if (onRequestEdit) {
                    onRequestEdit(watch)
                  } else {
                    // TODO(coming-soon): Inline watch edit modal
                    showToast('Coming soon.')
                  }
                }}
              >
                <svg width="16" height="16" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M1 9.5V11h1.5l4.42-4.42-1.5-1.5L1 9.5zm7.07-5.07c.2-.2.2-.51 0-.71L6.99 2.64a.5.5 0 00-.71 0L5.13 3.79l1.5 1.5 1.44-1.44z" fill="currentColor" />
                </svg>
              </IconButton>
            )}
            {canDelete && (
              <IconButton label="Delete watch" onClick={() => onRequestDelete?.(watch)}>
                <svg width="16" height="16" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M4.5 1.5h3l.3.8H10v1H2v-1h2.2l.3-.8zM3 4h6l-.5 6.2a.8.8 0 01-.8.8H4.3a.8.8 0 01-.8-.8L3 4zm2 1v5h1V5H5zm2 0v5h1V5H7z" fill="currentColor" />
                </svg>
              </IconButton>
            )}
          </div>
        )}
      </div>

      <div style={{ position: 'relative', width: 160, maxWidth: '100%', margin: '0 auto 16px', aspectRatio: '1/1' }}>
        <WatchImageOrDial
          watch={watch}
          fill
          sizes="160px"
          imageStyle={{ objectFit: 'contain', filter: brand.shadow.drop }}
          dialSize={118}
        />
        {!isPublicMode && (
          <WatchStateControl
            catalogWatchId={resolvedCatalogWatchId}
            source="sidebar"
          />
        )}
      </div>

      <div style={{ ...metaLabel, marginBottom: 4 }}>
        {watch.brand.toUpperCase()}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 3 }}>
        {isOwnedWatch ? (
          <Link
            href={`/collection/watch/${watch.id}`}
            aria-label={`Open full detail for ${watch.brand} ${watch.model}`}
            style={{ textDecoration: 'none', color: 'inherit', minWidth: 0 }}
          >
            <h3 style={{ fontFamily: brand.font.serif, fontSize: 26, fontWeight: 400, lineHeight: 1.1, color: brand.colors.ink, margin: 0 }}>
              {watch.model}
              <span style={{ color: brand.colors.muted, fontSize: 16, marginLeft: 6, fontWeight: 400 }}>→</span>
            </h3>
          </Link>
        ) : (
          <h3 style={{ fontFamily: brand.font.serif, fontSize: 26, fontWeight: 400, lineHeight: 1.1, color: brand.colors.ink, margin: 0 }}>
            {watch.model}
          </h3>
        )}
        {showConditionBadge && (
          <span
            style={{
              display: 'inline-block',
              padding: '3px 10px',
              borderRadius: brand.radius.pill,
              fontFamily: brand.font.sans,
              fontSize: 11,
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
      {showJewelBadge && (
        <div style={{ marginBottom: 8 }}>
          <IntentBadge state="jewel" />
        </div>
      )}
      <div style={{ fontSize: 12, color: brand.colors.muted, marginBottom: 4 }}>Ref. {watch.reference}</div>
      {watch.notes && (
        <div style={{ fontSize: 12, color: brand.colors.goldDeep, fontStyle: 'italic', marginBottom: 16 }}>
          &ldquo;{watch.notes}&rdquo;
        </div>
      )}

      <div
        style={{
          background: brand.colors.bg,
          border: `1px solid ${brand.colors.border}`,
          borderRadius: brand.radius.md,
          padding: '10px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          margin: '14px 0',
        }}
      >
        <span style={metaLabel}>Est. Market Value</span>
        <span style={{ fontFamily: brand.font.sans, fontSize: 18, fontWeight: 600, color: brand.colors.goldDeep }}>
          {fmt(watch.estimatedValue)}
        </span>
      </div>

      <div style={{ marginBottom: 16 }}>
        {specRows.map(([label, value]) => (
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
            <span style={{ color: brand.colors.ink, fontWeight: 500, textAlign: 'right', maxWidth: '55%', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {label === 'Dial Color' && value !== '—' ? (
                <span style={{
                  display: 'inline-block',
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: dialColorToHex(value),
                  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.18)',
                  flexShrink: 0,
                }} />
              ) : null}
              {value}
            </span>
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
            <>
              <button
                onClick={() => (isTarget
                  ? removeFromNextTargets(resolvedCatalogWatchId)
                  : promoteToNextTarget(resolvedCatalogWatchId))}
                style={isTarget
                  ? btnSecondary
                  : { ...btnSecondary, borderColor: brand.colors.goldLine, color: brand.colors.goldDeep }}
              >
                {isTarget ? 'Remove Target' : 'Set as Target'}
              </button>
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
            </>
          ) : (
            <button onClick={() => router.push(`/collection/add/${resolvedCatalogWatchId}`)} style={btnSecondary}>
              Add to My Collection
            </button>
          )}
        </div>
      ) : isOwnedWatch ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Link href={`/collection/watch/${watch.id}`} style={btnPrimary}>
            View full detail →
          </Link>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <a
              href={buildChrono24URL(watch.brand, watch.model, 'sell')}
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...btnAction, textDecoration: 'none' }}
            >
              Sell ↗
            </a>
            {isIntegrated ? (
              <span style={{ ...btnAction, cursor: 'default', color: brand.colors.muted, fontWeight: 400 }}>
                Integrated
              </span>
            ) : (
              <button style={btnAction} onClick={() => router.push(`/collection/straps?watchId=${watch.id}`)}>Straps →</button>
            )}
          </div>
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
            <a
              href={buildChrono24URL(watch.brand, watch.model, 'sell')}
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...btnAction, textDecoration: 'none' }}
            >
              Sell ↗
            </a>
            {isIntegrated ? (
              <span style={{ ...btnAction, cursor: 'default', color: brand.colors.muted, fontWeight: 400 }}>
                Integrated
              </span>
            ) : (
              <button style={btnAction} onClick={() => router.push(`/collection/straps?watchId=${watch.id}`)}>Straps →</button>
            )}
          </div>
        </div>
      )}

      {/* Photo gallery — owner-only, hidden on followed/public surfaces */}
      {isOwnedWatch && (
        <div style={{
          marginTop: 14,
          paddingTop: 14,
          borderTop: `1px solid ${brand.colors.borderLight}`,
        }}>
          <WatchPhotoGallery ownedWatchId={watch.id} variant="sidebar" />
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <Link
              href="/service-room"
              style={{
                fontFamily: brand.font.sans,
                fontSize: 11,
                color: brand.colors.muted,
                textDecoration: 'none',
                letterSpacing: '0.04em',
              }}
            >
              Service Room →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
