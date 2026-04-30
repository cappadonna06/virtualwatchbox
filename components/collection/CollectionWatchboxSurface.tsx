'use client'

import { useLayoutEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { FRAMES, LININGS, SLOT_COUNTS } from '@/lib/frameConfig'
import { getOverflowSummary, getWatchboxOverflow } from '@/lib/watchboxOverflow'
import type { Watch } from '@/types/watch'
import { brand } from '@/lib/brand'
import { useCollectionSession } from '@/app/collection/CollectionSessionProvider'
import WatchBox from './WatchBox'
import ResponsiveSidebarSheet from './ResponsiveSidebarSheet'
import WatchSidebar from './WatchSidebar'

const WATCHBOX_WIDTH_PADDING = 64
const WATCHBOX_HEIGHT_PADDING = 72
const WATCHBOX_GAP = 6
const PREVIEW_WIDTH_PADDING = 38
const PREVIEW_HEIGHT_PADDING = 45
const PREVIEW_GAP = 5
const ROWS = 2

function calcSlotPx(
  containerWidth: number,
  maxHeight: number,
  columns: number,
  widthPadding: number,
  heightPadding: number,
  gap: number,
) {
  const slotFromWidth = (containerWidth - widthPadding - (columns - 1) * gap) / columns
  const slotFromHeight = ((maxHeight - heightPadding) * 3) / (4 * ROWS)
  return Math.max(16, Math.min(slotFromWidth, slotFromHeight))
}

function WatchboxPreview({
  frameId,
  liningId,
  slotCount,
  slotWidth,
}: {
  frameId: string
  liningId: string
  slotCount: number
  slotWidth: number
}) {
  const frame = FRAMES.find(item => item.id === frameId) ?? FRAMES[0]
  const lining = LININGS.find(item => item.id === liningId) ?? LININGS[0]
  const slotConfig = SLOT_COUNTS.find(item => item.n === slotCount) ?? SLOT_COUNTS[1]

  return (
    <div
      style={{
        borderRadius: brand.radius.lg,
        padding: '12px 12px 14px',
        background: frame.css,
        boxShadow: frame.shadow,
        transition: `background ${brand.transition.smooth}, box-shadow ${brand.transition.smooth}`,
      }}
    >
      <div
        style={{
          background: lining.color,
          borderRadius: 5,
          padding: 7,
          boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)',
          transition: `background ${brand.transition.smooth}`,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${slotConfig.cols}, ${slotWidth}px)`,
            gap: PREVIEW_GAP,
          }}
        >
          {Array.from({ length: slotConfig.n }).map((_, index) => (
            <div
              key={index}
              style={{
                width: slotWidth,
                height: Math.round((slotWidth * 4) / 3),
                borderRadius: 3,
                background: lining.slotBg,
                transition: `background ${brand.transition.smooth}`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function WatchboxConfigControls({
  frameId,
  liningId,
  slotCount,
  onFrameChange,
  onLiningChange,
  onSlotCountChange,
  compact = false,
}: {
  frameId: string
  liningId: string
  slotCount: number
  onFrameChange: (frameId: string) => void
  onLiningChange: (liningId: string) => void
  onSlotCountChange: (slotCount: number) => void
  compact?: boolean
}) {
  const frame = FRAMES.find(item => item.id === frameId) ?? FRAMES[0]
  const lining = LININGS.find(item => item.id === liningId) ?? LININGS[0]
  const toneBorder = `1px solid ${brand.colors.border}`
  const labelStyle: CSSProperties = {
    fontFamily: brand.font.sans,
    fontSize: 9,
    fontWeight: 600,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: brand.colors.muted,
  }

  return (
    <>
      <div
        style={{
          padding: compact ? '9px 12px' : '14px 0',
          borderBottom: toneBorder,
        }}
      >
        <div style={{ ...labelStyle, marginBottom: compact ? 0 : 10, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span>Slots</span>
          {!compact && <span style={{ color: brand.colors.ink, fontSize: 10, fontWeight: 600, textTransform: 'none', letterSpacing: 0 }}>{slotCount} slots</span>}
        </div>
        <div style={{ display: 'flex', gap: compact ? 4 : 8, marginTop: compact ? 0 : undefined }}>
          {SLOT_COUNTS.map(item => {
            const isActive = slotCount === item.n
            return (
              <button
                key={item.n}
                onClick={() => onSlotCountChange(item.n)}
                style={{
                  flex: compact ? '0 0 auto' : 1,
                  fontFamily: brand.font.sans,
                  fontSize: compact ? 10 : 12,
                  fontWeight: 500,
                  padding: compact ? '3px 9px' : '8px 0',
                  borderRadius: compact ? brand.radius.btn : brand.radius.sm,
                  border: isActive ? `1px solid ${brand.colors.gold}` : `1px solid ${brand.colors.borderLight}`,
                  background: isActive ? 'rgba(201,168,76,0.06)' : 'transparent',
                  color: isActive ? brand.colors.gold : brand.colors.muted,
                  cursor: 'pointer',
                  transition: brand.transition.fast,
                }}
              >
                {item.label}
              </button>
            )
          })}
        </div>
      </div>

      <div
        style={{
          padding: compact ? '9px 12px' : '14px 0',
          borderBottom: compact ? toneBorder : `1px solid ${brand.colors.border}`,
          display: compact ? 'flex' : 'block',
          alignItems: compact ? 'center' : undefined,
          gap: compact ? 10 : undefined,
        }}
      >
        <div style={{ ...labelStyle, marginBottom: compact ? 0 : 10, flexShrink: compact ? 0 : undefined, width: compact ? 48 : undefined }}>
          Frame{compact ? '' : ` · ${frame.label}`}
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: compact ? 'repeat(5, 24px)' : 'repeat(5, 1fr)',
            gap: compact ? 7 : 4,
            width: compact ? 'auto' : '100%',
          }}
        >
          {FRAMES.map(item => {
            const isActive = frameId === item.id
            return (
              <div key={item.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: compact ? 6 : 5 }}>
                <div
                  title={item.label}
                  onClick={() => onFrameChange(item.id)}
                  style={{
                    width: compact ? 24 : 34,
                    height: compact ? 24 : 34,
                    borderRadius: '50%',
                    background: item.swatchColor,
                    border: isActive ? `2px solid ${brand.colors.gold}` : '2px solid transparent',
                    outline: isActive ? '1.5px solid rgba(201,168,76,0.3)' : '1.5px solid transparent',
                    outlineOffset: 2,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
                    cursor: 'pointer',
                    transition: brand.transition.fast,
                  }}
                />
                <span
                  style={{
                    fontFamily: brand.font.sans,
                    fontSize: compact ? 8 : 9,
                    color: isActive ? brand.colors.ink : brand.colors.muted,
                    fontWeight: compact && isActive ? 700 : undefined,
                    textAlign: 'center',
                    letterSpacing: '0.02em',
                  }}
                >
                  {compact ? item.label.split(' ')[0] : item.label.split(' ')[0]}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div
        style={{
          padding: compact ? '9px 12px' : '14px 0 0',
          display: compact ? 'flex' : 'block',
          alignItems: compact ? 'center' : undefined,
          gap: compact ? 10 : undefined,
        }}
      >
        <div style={{ ...labelStyle, marginBottom: compact ? 0 : 10, flexShrink: compact ? 0 : undefined, width: compact ? 48 : undefined }}>
          Lining{compact ? '' : ` · ${lining.label}`}
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: compact ? 'repeat(5, 24px)' : 'repeat(5, 1fr)',
            gap: compact ? 7 : 4,
            width: compact ? 'auto' : '100%',
          }}
        >
          {LININGS.map(item => {
            const isActive = liningId === item.id
            return (
              <div key={item.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: compact ? 6 : 5 }}>
                <div
                  title={item.label}
                  onClick={() => onLiningChange(item.id)}
                  style={{
                    width: compact ? 24 : 34,
                    height: compact ? 24 : 34,
                    borderRadius: '50%',
                    background: item.color,
                    border: isActive
                      ? `2px solid ${brand.colors.gold}`
                      : item.id === 'cream'
                      ? `2px solid ${brand.colors.borderLight}`
                      : '2px solid transparent',
                    outline: isActive ? '1.5px solid rgba(201,168,76,0.3)' : '1.5px solid transparent',
                    outlineOffset: 2,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
                    cursor: 'pointer',
                    transition: brand.transition.fast,
                  }}
                />
                <span
                  style={{
                    fontFamily: brand.font.sans,
                    fontSize: compact ? 8 : 9,
                    color: isActive ? brand.colors.ink : brand.colors.muted,
                    fontWeight: compact && isActive ? 700 : undefined,
                    textAlign: 'center',
                    letterSpacing: '0.02em',
                  }}
                >
                  {item.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

interface CollectionWatchboxSurfaceProps {
  watches: Watch[]
  onEmptySlotClick: () => void
  onReorder?: (from: number, to: number) => void
  topToolbar?: ReactNode
}

export default function CollectionWatchboxSurface({
  watches,
  onEmptySlotClick,
  onReorder,
  topToolbar,
}: CollectionWatchboxSurfaceProps) {
  const {
    selectedWatchId,
    setSelectedWatchId,
    removeFromCollection,
    watchboxConfig,
    setWatchboxFrame,
    setWatchboxLining,
    setWatchboxSlotCount,
  } = useCollectionSession()

  const [customizerOpen, setCustomizerOpen] = useState(false)
  const [configOpen, setConfigOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Watch | null>(null)
  const [screenWidth, setScreenWidth] = useState(0)

  useLayoutEffect(() => {
    const updateWidth = () => setScreenWidth(window.innerWidth)
    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  const activeSlot = selectedWatchId ? watches.findIndex(watch => watch.id === selectedWatchId) : -1
  const activeWatch = activeSlot >= 0 ? watches[activeSlot] : null
  const frame = FRAMES.find(item => item.id === watchboxConfig.frame) ?? FRAMES[0]
  const lining = LININGS.find(item => item.id === watchboxConfig.lining) ?? LININGS[0]
  const slotConfig = SLOT_COUNTS.find(item => item.n === watchboxConfig.slotCount) ?? SLOT_COUNTS[1]
  const overflowSummary = getOverflowSummary(
    slotConfig.n,
    getWatchboxOverflow(watches, slotConfig.n).overflowCount,
  )

  const isMobile = screenWidth > 0 && screenWidth < 768
  const watchboxContainerWidth = isMobile ? screenWidth - 40 : Math.max(200, screenWidth - 444)
  const watchboxMaxHeight = isMobile ? 300 : 480
  const watchboxSlotWidth = screenWidth > 0
    ? Math.floor(
        calcSlotPx(
          watchboxContainerWidth,
          watchboxMaxHeight,
          slotConfig.cols,
          WATCHBOX_WIDTH_PADDING,
          WATCHBOX_HEIGHT_PADDING,
          WATCHBOX_GAP,
        ),
      )
    : undefined
  const watchboxMaxWidth = watchboxSlotWidth !== undefined
    ? WATCHBOX_WIDTH_PADDING + ((slotConfig.cols - 1) * WATCHBOX_GAP) + (slotConfig.cols * watchboxSlotWidth)
    : undefined

  const previewSlotWidth = useMemo(() => {
    const previewContainerWidth = Math.min(screenWidth > 0 ? screenWidth - 40 : 320, 400)
    return Math.floor(
      calcSlotPx(
        previewContainerWidth,
        260,
        slotConfig.cols,
        PREVIEW_WIDTH_PADDING,
        PREVIEW_HEIGHT_PADDING,
        PREVIEW_GAP,
      ),
    )
  }, [screenWidth, slotConfig.cols])

  function handleSlotClick(index: number) {
    const watch = watches[index]
    if (!watch) return
    setSelectedWatchId(selectedWatchId === watch.id ? null : watch.id)
  }

  function handleDeleteWatch() {
    if (!deleteTarget) return
    removeFromCollection(deleteTarget.id)
    setSelectedWatchId(null)
    setDeleteTarget(null)
  }

  return (
    <>
      {configOpen && (
        <div
          onClick={() => setConfigOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(26,20,16,0.45)',
            zIndex: 200,
            backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {configOpen && (
        <div
          className="config-modal"
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 201,
            background: brand.colors.bg,
            borderRadius: '20px 20px 0 0',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ padding: '12px 20px 0', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: brand.colors.borderLight }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span
                style={{
                  fontFamily: brand.font.sans,
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: brand.colors.muted,
                }}
              >
                Customize Watchbox
              </span>
              <button
                onClick={() => setConfigOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: brand.colors.muted,
                  fontSize: 18,
                  lineHeight: 1,
                  padding: 4,
                }}
              >
                ✕
              </button>
            </div>
          </div>

          <div style={{ padding: '0 20px 16px', flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
            <div
              style={{
                width: '100%',
                maxWidth:
                  PREVIEW_WIDTH_PADDING
                  + ((slotConfig.cols - 1) * PREVIEW_GAP)
                  + (slotConfig.cols * previewSlotWidth),
              }}
            >
              <WatchboxPreview
                frameId={watchboxConfig.frame}
                liningId={watchboxConfig.lining}
                slotCount={watchboxConfig.slotCount}
                slotWidth={previewSlotWidth}
              />
            </div>
          </div>

          <div style={{ padding: '0 20px 32px', background: brand.colors.white, flexShrink: 0 }}>
            <WatchboxConfigControls
              frameId={watchboxConfig.frame}
              liningId={watchboxConfig.lining}
              slotCount={watchboxConfig.slotCount}
              onFrameChange={setWatchboxFrame}
              onLiningChange={setWatchboxLining}
              onSlotCountChange={setWatchboxSlotCount}
            />
          </div>
        </div>
      )}

      <div
        className="collection-grid"
        style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 32, alignItems: 'start' }}
      >
        <div>
          <div
            style={{
              position: 'relative',
              paddingTop: topToolbar ? brand.controls.dropdown.triggerHeight + 8 : 0,
              ...(watchboxMaxWidth !== undefined ? { maxWidth: watchboxMaxWidth, width: '100%', margin: '0 auto' } : {}),
            }}
          >
            {topToolbar && (
              <div style={{ position: 'absolute', top: 0, right: 0, display: 'flex', gap: 8, alignItems: 'center' }}>
                {topToolbar}
              </div>
            )}

            <WatchBox
              watches={watches}
              activeSlot={activeSlot >= 0 ? activeSlot : null}
              onSlotClick={handleSlotClick}
              onEmptySlotClick={onEmptySlotClick}
              onReorder={onReorder}
              frame={watchboxConfig.frame}
              lining={watchboxConfig.lining}
              slotCount={watchboxConfig.slotCount}
              slotWidth={watchboxSlotWidth}
            />

            <div className="configurator-wrap" style={{ marginTop: 10, position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                <span style={{ fontFamily: brand.font.sans, fontSize: 10, color: brand.colors.muted }}>
                  {frame.label} · {lining.label} · {slotConfig.n} slots
                  {overflowSummary ? ` · ${overflowSummary}` : ''}
                </span>
                <button
                  onClick={() => setCustomizerOpen(open => !open)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    fontFamily: brand.font.sans,
                    fontSize: 10,
                    fontWeight: 500,
                    letterSpacing: '0.06em',
                    padding: '5px 12px',
                    background: brand.colors.white,
                    color: brand.colors.muted,
                    border: `1px solid ${brand.colors.border}`,
                    borderRadius: brand.radius.sm,
                    cursor: 'pointer',
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path d="M1 9.5V11h1.5l4.42-4.42-1.5-1.5L1 9.5zm7.07-5.07c.2-.2.2-.51 0-.71L6.99 2.64a.5.5 0 00-.71 0L5.13 3.79l1.5 1.5 1.44-1.44z" fill="currentColor" />
                  </svg>
                  Customize Watchbox
                </button>
              </div>

              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  zIndex: 20,
                  marginTop: 4,
                  border: `1px solid ${brand.colors.border}`,
                  borderRadius: brand.radius.md,
                  background: brand.colors.white,
                  boxShadow: brand.shadow.md,
                  overflow: 'hidden',
                  opacity: customizerOpen ? 1 : 0,
                  transform: customizerOpen ? 'translateY(0) scale(1)' : 'translateY(-4px) scale(0.98)',
                  transformOrigin: 'top right',
                  pointerEvents: customizerOpen ? 'auto' : 'none',
                  transition: 'opacity 0.18s ease, transform 0.18s ease',
                }}
              >
                <WatchboxConfigControls
                  compact
                  frameId={watchboxConfig.frame}
                  liningId={watchboxConfig.lining}
                  slotCount={watchboxConfig.slotCount}
                  onFrameChange={setWatchboxFrame}
                  onLiningChange={setWatchboxLining}
                  onSlotCountChange={setWatchboxSlotCount}
                />
              </div>
            </div>
          </div>

          <button
            className="edit-box-btn"
            onClick={() => setConfigOpen(true)}
            style={{
              display: 'none',
              margin: '14px auto 0',
              width: 'fit-content',
              fontFamily: brand.font.sans,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '10px 20px',
              background: brand.colors.white,
              color: brand.colors.muted,
              border: `1px solid ${brand.colors.borderLight}`,
              borderRadius: brand.radius.md,
              cursor: 'pointer',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }} aria-hidden="true">
              <path d="M1 9.5V11h1.5l4.42-4.42-1.5-1.5L1 9.5zm7.07-5.07c.2-.2.2-.51 0-.71L6.99 2.64a.5.5 0 00-.71 0L5.13 3.79l1.5 1.5 1.44-1.44z" fill="currentColor" />
            </svg>
            Customize Watchbox
          </button>
        </div>

        <ResponsiveSidebarSheet
          active={Boolean(activeWatch)}
          onClose={() => setSelectedWatchId(null)}
          top={88}
        >
          <WatchSidebar
            watch={activeWatch}
            sticky={false}
            onRequestDelete={watch => setDeleteTarget(watch)}
          />
        </ResponsiveSidebarSheet>
      </div>

      {deleteTarget && (
        <>
          <div
            onClick={() => setDeleteTarget(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(26,20,16,0.45)',
              zIndex: 210,
              backdropFilter: 'blur(2px)',
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '90vw',
              maxWidth: 420,
              background: brand.colors.white,
              border: `1px solid ${brand.colors.border}`,
              borderRadius: brand.radius.xl,
              boxShadow: brand.shadow.lg,
              zIndex: 211,
              padding: 18,
            }}
          >
            <div
              style={{
                fontFamily: brand.font.sans,
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: brand.colors.muted,
                marginBottom: 6,
              }}
            >
              Remove Watch
            </div>
            <div
              style={{
                fontFamily: brand.font.serif,
                fontSize: 28,
                color: brand.colors.ink,
                lineHeight: 1.1,
                marginBottom: 8,
              }}
            >
              Delete from My Collection?
            </div>
            <p
              style={{
                margin: '0 0 16px',
                fontFamily: brand.font.sans,
                fontSize: 12,
                color: brand.colors.muted,
                lineHeight: 1.5,
              }}
            >
              {deleteTarget.brand} {deleteTarget.model} will be removed from your collection list.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
                onClick={() => setDeleteTarget(null)}
                style={{
                  fontFamily: brand.font.sans,
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  padding: '9px 12px',
                  background: 'transparent',
                  color: brand.colors.ink,
                  border: `1px solid ${brand.colors.borderLight}`,
                  borderRadius: brand.radius.sm,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteWatch}
                style={{
                  fontFamily: brand.font.sans,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  padding: '9px 12px',
                  background: brand.colors.ink,
                  color: brand.colors.bg,
                  border: 'none',
                  borderRadius: brand.radius.sm,
                  cursor: 'pointer',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
