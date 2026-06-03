'use client'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'

import { brand } from '@/lib/brand'
import { useCollectionSession } from '../../CollectionSessionProvider'
import EditWatchModal, { type EditWatchUpdates } from '@/components/collection/EditWatchModal'
import WatchPhotoGallery from '@/components/collection/WatchPhotoGallery'
import WatchServiceSection from '@/components/collection/WatchServiceSection'
import WatchImageOrDial from '@/components/watchbox/WatchImageOrDial'

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

export default function OwnedWatchDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromDiscover = searchParams.get('from') === 'discover'
  const backHref = fromDiscover ? '/discover' : '/collection'
  const backLabel = fromDiscover ? '← Back to Discover' : '← Back to Collection'
  const {
    collectionWatches,
    updateCollectionWatch,
    removeFromCollection,
    showToast,
  } = useCollectionSession()

  const watch = useMemo(
    () => collectionWatches.find(w => w.id === params.id),
    [collectionWatches, params.id],
  )

  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [viewportWidth, setViewportWidth] = useState(1280)

  useEffect(() => {
    const update = () => setViewportWidth(window.innerWidth)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  if (!watch) {
    return (
      <div style={{ padding: '60px 24px', textAlign: 'center' }}>
        <div style={{ fontFamily: brand.font.serif, fontSize: 22, color: brand.colors.ink, marginBottom: 8 }}>
          Watch not found
        </div>
        <div style={{ fontFamily: brand.font.sans, fontSize: 13, color: brand.colors.muted, marginBottom: 18 }}>
          We couldn&apos;t find this watch in your collection.
        </div>
        <Link
          href={backHref}
          style={{
            fontFamily: brand.font.sans, fontSize: 12,
            color: brand.colors.ink, textDecoration: 'underline',
            textUnderlineOffset: 2,
          }}
        >
          {backLabel}
        </Link>
      </div>
    )
  }

  const isCompact = viewportWidth < 980

  function handleSave(updates: EditWatchUpdates) {
    if (!watch) return
    updateCollectionWatch(watch.id, updates)
    setEditing(false)
    showToast('Watch updated.')
  }

  function handleDelete() {
    if (!watch) return
    removeFromCollection(watch.id)
    router.push('/collection')
  }

  const acquisitionLabels: Record<NonNullable<typeof watch.acquisitionMethod>, string> = {
    new: 'New',
    'pre-owned': 'Pre-Owned',
    gift: 'Gift',
    inherited: 'Inherited',
    trade: 'Trade',
    auction: 'Auction',
  }
  const ownershipChips: string[] = [
    watch.hasBox ? 'Box' : null,
    watch.hasPapers ? 'Papers' : null,
    watch.acquisitionMethod ? acquisitionLabels[watch.acquisitionMethod] : null,
    watch.warrantyExpiresAt
      ? `Warranty until ${new Date(watch.warrantyExpiresAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
      : null,
  ].filter((chip): chip is string => Boolean(chip))

  const specs: Array<[string, string]> = [
    ['Watch Type', watch.watchType],
    ['Movement', watch.movement || '—'],
    ['Complications', watch.complications.join(', ') || '—'],
    ['Case Material', watch.caseMaterial || '—'],
    ['Dial Color', watch.dialColor || '—'],
    ['Case Size', `${watch.caseSizeMm}mm`],
    ...(watch.lugWidthMm ? [['Lug Width', `${watch.lugWidthMm}mm`] as [string, string]] : []),
    ['Condition', watch.condition],
    ['Status', watch.ownershipStatus],
    ...(watch.purchaseDate ? [['Purchased', watch.purchaseDate] as [string, string]] : []),
    ...(watch.purchasePrice ? [['Price Paid', fmt(watch.purchasePrice)] as [string, string]] : []),
  ]

  return (
    <div style={{
      padding: isCompact ? '24px 20px 80px' : '36px 56px 96px',
      borderTop: `1px solid ${brand.colors.border}`,
    }}>
      <Link
        href={backHref}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 24,
          fontFamily: brand.font.sans,
          fontSize: 11,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: brand.colors.muted,
          textDecoration: 'none',
        }}
      >
        {backLabel}
      </Link>

      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isCompact ? '1fr' : 'minmax(300px, 1fr) minmax(340px, 520px)',
            gap: isCompact ? 28 : 48,
            alignItems: 'start',
            marginBottom: 48,
          }}
        >
          {/* Image column (sticky desktop) */}
          <div style={{ position: isCompact ? 'relative' : 'sticky', top: isCompact ? 'auto' : 88 }}>
            <div
              style={{
                background: brand.colors.slot,
                border: `1px solid ${brand.colors.border}`,
                borderRadius: brand.radius.xl,
                position: 'relative',
                aspectRatio: '1 / 1',
                overflow: 'hidden',
              }}
            >
              <WatchImageOrDial
                watch={watch}
                fill
                sizes={isCompact ? '100vw' : '(max-width: 1024px) 100vw, 45vw'}
                imageStyle={{ objectFit: 'contain', padding: 32, filter: 'drop-shadow(0 16px 32px rgba(26,20,16,0.18))' }}
                dialSize={isCompact ? 160 : 220}
              />
            </div>
          </div>

          {/* Specs column */}
          <div style={{ maxWidth: isCompact ? 'none' : 520 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
            }}>
              <span style={{ width: 16, height: 1, background: brand.colors.borderMid }} />
              <span style={{
                fontFamily: brand.font.sans, fontSize: 9, fontWeight: 500,
                letterSpacing: '0.14em', textTransform: 'uppercase', color: brand.colors.muted,
              }}>
                My Watch
              </span>
            </div>

            <div style={{
              fontFamily: brand.font.sans, fontSize: 10, fontWeight: 600,
              letterSpacing: '0.14em', textTransform: 'uppercase', color: brand.colors.gold, marginBottom: 8,
            }}>
              {watch.brand}
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{
                fontFamily: brand.font.serif, fontSize: isCompact ? 36 : 44,
                fontWeight: 400, lineHeight: 1, color: brand.colors.ink,
              }}>
                {watch.model}
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  aria-label="Edit"
                  style={iconButton}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Z" fill={brand.colors.ink} />
                    <path d="m20.71 7.04-3.75-3.75-2.27 2.27 3.75 3.75 2.27-2.27Z" fill={brand.colors.gold} />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  aria-label="Delete"
                  style={iconButton}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M6 7v13a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7" stroke={brand.colors.ink} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M4 7h16M9 7V4h6v3" stroke={brand.colors.ink} strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>

            <div style={{
              fontFamily: brand.font.sans, fontSize: 13, color: brand.colors.muted, letterSpacing: '0.02em',
              marginBottom: 16,
            }}>
              Ref. {watch.reference}
            </div>

            {watch.estimatedValue ? (
              <div style={{
                display: 'flex', alignItems: 'baseline', gap: 10,
                paddingBottom: 18, marginBottom: 18,
                borderBottom: `1px solid ${brand.colors.borderLight}`,
              }}>
                <span style={{
                  fontFamily: brand.font.serif, fontSize: isCompact ? 32 : 36,
                  fontWeight: 400, color: brand.colors.gold, lineHeight: 1,
                }}>
                  {fmt(watch.estimatedValue)}
                </span>
                <span style={{
                  fontFamily: brand.font.sans, fontSize: 10, fontWeight: 500,
                  letterSpacing: '0.1em', textTransform: 'uppercase', color: brand.colors.muted,
                }}>
                  Est. Market Value
                </span>
              </div>
            ) : null}

            <div style={{ marginBottom: 18 }}>
              {specs.map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    gap: 16,
                    padding: '8px 0',
                    borderBottom: `1px solid ${brand.colors.borderLight}`,
                  }}
                >
                  <span style={{ fontFamily: brand.font.sans, fontSize: 11, color: brand.colors.muted }}>{label}</span>
                  <span style={{ fontFamily: brand.font.sans, fontSize: 12, fontWeight: 500, color: brand.colors.ink, textAlign: 'right' }}>{value}</span>
                </div>
              ))}
            </div>

            {ownershipChips.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
                {ownershipChips.map(chip => (
                  <span
                    key={chip}
                    style={{
                      display: 'inline-block',
                      padding: '4px 10px',
                      borderRadius: brand.radius.pill,
                      background: brand.colors.slot,
                      border: `1px solid ${brand.colors.borderLight}`,
                      fontFamily: brand.font.sans,
                      fontSize: 9,
                      fontWeight: 600,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: brand.colors.muted,
                    }}
                  >
                    {chip}
                  </span>
                ))}
              </div>
            )}

            {watch.notes && (
              <div style={{
                padding: '14px 16px',
                background: brand.colors.goldWash,
                border: `1px solid ${brand.colors.goldLine}`,
                borderRadius: brand.radius.md,
                fontFamily: brand.font.serif,
                fontSize: 14,
                fontStyle: 'italic',
                color: brand.colors.ink,
                lineHeight: 1.5,
              }}>
                &ldquo;{watch.notes}&rdquo;
              </div>
            )}
          </div>
        </div>

        {/* Papers & Provenance + Service History — between specs and gallery */}
        <div style={{ marginBottom: 48 }}>
          <WatchServiceSection watch={watch} />
        </div>

        {/* Photo gallery — full-width below specs */}
        <div>
          <WatchPhotoGallery ownedWatchId={watch.id} variant="grid" />
        </div>
      </div>

      {editing && (
        <EditWatchModal
          watch={watch}
          onClose={() => setEditing(false)}
          onSave={handleSave}
        />
      )}

      {confirmDelete && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setConfirmDelete(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 320,
            background: 'rgba(26,20,16,0.55)', backdropFilter: 'blur(2px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: brand.colors.bg,
              borderRadius: brand.radius.xl,
              maxWidth: 420,
              padding: 24,
              boxShadow: brand.shadow.xl,
            }}
          >
            <div style={{ fontFamily: brand.font.serif, fontSize: 20, color: brand.colors.ink, marginBottom: 8 }}>
              Remove this watch?
            </div>
            <div style={{ fontFamily: brand.font.sans, fontSize: 13, color: brand.colors.muted, marginBottom: 20, lineHeight: 1.5 }}>
              {watch.brand} {watch.model} will be removed from your collection. Photos you uploaded for this watch will also be deleted.
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                style={{
                  padding: '10px 16px', background: 'transparent', color: brand.colors.ink,
                  border: `1px solid ${brand.colors.border}`, borderRadius: brand.radius.btn,
                  fontFamily: brand.font.sans, fontSize: 12, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                style={{
                  padding: '10px 16px', background: '#9A2222', color: '#FFFFFF',
                  border: '1px solid #9A2222', borderRadius: brand.radius.btn,
                  fontFamily: brand.font.sans, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                }}
              >
                Remove watch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const iconButton: CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: brand.radius.sm,
  background: 'transparent',
  border: `1px solid ${brand.colors.border}`,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
}
