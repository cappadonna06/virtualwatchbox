'use client'

import { useEffect, useMemo, useRef, useState, type DragEvent as ReactDragEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import type { ResolvedWatch } from '@/types/watch'
import { FRAMES, LININGS, SLOT_COUNTS, watchboxFrameMetrics } from '@/lib/frameConfig'
import { getWatchboxOverflow } from '@/lib/watchboxOverflow'
import WatchImageOrDial from '@/components/watchbox/WatchImageOrDial'
import { brand } from '@/lib/brand'
import { useCollectionSession } from '@/app/collection/CollectionSessionProvider'
import { IntentBadge } from './WatchStateIcons'
import { PLAYGROUND_DRAG_PAYLOAD_KEY, PLAYGROUND_WATCH_MIME, startGhostDrag } from '@/lib/dragGhost'

interface Props {
  watches: ResolvedWatch[]
  activeSlot: number | null
  onSlotClick: (i: number) => void
  onEmptySlotClick?: (slotIndex: number) => void
  onReorder?: (from: number, to: number) => void
  onExternalDrop?: (slotIndex: number, watchId: string) => void
  /** Called when an in-box slot is dragged onto the trash drop zone. */
  onTrashDrop?: (slotIndex: number) => void
  /** Briefly shake the box (e.g. to signal a rejected drop). Caller toggles back to false. */
  wobble?: boolean
  /** Controlled hover index used by touch-driven external drags (HTML5 dragover doesn't fire for pointer events). */
  externalHoverIndex?: number | null
  /**
   * When provided, slot N renders watchBySlot.get(N). This is the sparse-slot
   * path — gaps between filled slots are preserved. When omitted, the legacy
   * dense rendering uses `watches[i]` directly. Either source still feeds the
   * overflow tally via `watches`.
   */
  watchBySlot?: Map<number, ResolvedWatch>
  frame: string
  lining: string
  slotCount: number
  slotWidth?: number
  mode?: 'collection' | 'playground'
  readonly?: boolean
  jewelWatchIds?: string[]
  showFirstSlotLabel?: boolean
}

function OverflowGridCard({
  watch,
  onClick,
  mode,
  showJewelBadge = false,
}: {
  watch: ResolvedWatch
  onClick: () => void
  mode: 'collection' | 'playground'
  showJewelBadge?: boolean
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: 10,
        padding: 12,
        background: brand.colors.white,
        border: `1px solid ${brand.colors.border}`,
        borderRadius: brand.radius.lg,
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = brand.colors.gold
        e.currentTarget.style.boxShadow = brand.shadow.md
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = brand.colors.border
        e.currentTarget.style.boxShadow = ''
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '1',
          background: brand.colors.paper,
          border: `1px solid ${brand.colors.borderMid}`,
          borderRadius: brand.radius.md,
          overflow: 'hidden',
        }}
      >
        <WatchImageOrDial
          watch={watch}
          fill
          sizes="180px"
          imageStyle={{ objectFit: 'contain', objectPosition: 'center center' }}
          dialSize={96}
        />
        {showJewelBadge && (
          <div className={mode === 'collection' ? 'watchbox-jewel-mobile-hide' : undefined}
            style={{ position: 'absolute', top: 6, right: 6 }}>
            <IntentBadge state="jewel" compact iconOnly />
          </div>
        )}
      </div>
      <div>
        <div
          style={{
            fontFamily: brand.font.sans,
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: brand.colors.gold,
            marginBottom: 4,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {watch.brand}
        </div>
        <div
          style={{
            fontFamily: brand.font.serif,
            fontSize: 18,
            color: brand.colors.ink,
            lineHeight: 1.1,
            marginBottom: 4,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {watch.model}
        </div>
        <div
          style={{
            fontFamily: brand.font.sans,
            fontSize: 10,
            color: brand.colors.muted,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          Ref. {watch.reference}
        </div>
      </div>
    </button>
  )
}

function OverflowListItem({
  watch,
  onClick,
  mode,
  showJewelBadge = false,
}: {
  watch: ResolvedWatch
  onClick: () => void
  mode: 'collection' | 'playground'
  showJewelBadge?: boolean
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        border: 'none',
        background: 'transparent',
        padding: '10px 12px',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: brand.radius.md,
          background: brand.colors.bg,
          border: `1px solid ${brand.colors.borderMid}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <WatchImageOrDial
          watch={watch}
          fill
          sizes="48px"
          imageStyle={{ objectFit: 'contain', objectPosition: 'center center' }}
          dialSize={32}
        />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
          <div
            style={{
              fontFamily: brand.font.sans,
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: brand.colors.gold,
            }}
          >
            {watch.brand}
          </div>
          {showJewelBadge && (
            <span className={mode === 'collection' ? 'watchbox-jewel-mobile-hide' : undefined}>
              <IntentBadge state="jewel" compact />
            </span>
          )}
        </div>
        <div
          style={{
            fontFamily: brand.font.serif,
            fontSize: 18,
            color: brand.colors.ink,
            lineHeight: 1.05,
            marginBottom: 2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {watch.model}
        </div>
        <div
          style={{
            fontFamily: brand.font.sans,
            fontSize: 10,
            color: brand.colors.muted,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          Ref. {watch.reference}
        </div>
      </div>
    </button>
  )
}

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '')
  const value = normalized.length === 3
    ? normalized.split('').map(char => `${char}${char}`).join('')
    : normalized

  if (value.length !== 6) return null

  const red = Number.parseInt(value.slice(0, 2), 16)
  const green = Number.parseInt(value.slice(2, 4), 16)
  const blue = Number.parseInt(value.slice(4, 6), 16)

  if ([red, green, blue].some(channel => Number.isNaN(channel))) return null
  return { red, green, blue }
}

function isDarkColor(color: string) {
  const rgb = hexToRgb(color)
  if (!rgb) return false
  const { red, green, blue } = rgb
  const luminance = (0.2126 * red) + (0.7152 * green) + (0.0722 * blue)
  return luminance < 132
}

export default function WatchBox({
  watches,
  activeSlot,
  onSlotClick,
  onEmptySlotClick,
  onReorder,
  onExternalDrop,
  onTrashDrop,
  wobble = false,
  externalHoverIndex,
  watchBySlot,
  frame,
  lining,
  slotCount,
  slotWidth,
  mode = 'collection',
  readonly = false,
  jewelWatchIds,
  showFirstSlotLabel = false,
}: Props) {
  const isSparse = watchBySlot !== undefined
  const { isWatchJewel } = useCollectionSession()
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null)
  const reduceMotion = useReducedMotion()
  const [overflowOpen, setOverflowOpen] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [externalDragOverIndex, setExternalDragOverIndex] = useState<number | null>(null)
  const [trashHover, setTrashHover] = useState(false)
  const longPressTouchRef = useRef<{
    timer: ReturnType<typeof setTimeout> | null
    moveHandler: (ev: PointerEvent) => void
    cancelHandler: (ev: PointerEvent) => void
  } | null>(null)
  const touchDragCleanupRef = useRef<(() => void) | null>(null)
  // Set when a touch long-press successfully arms; consumed by the slot's
  // onClick so a release after drag doesn't also trigger "select watch."
  const didTouchDragRef = useRef(false)
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const dragCounter = useRef(0)
  const ghostRef = useRef<HTMLDivElement | null>(null)

  // External drag (e.g. tray → slot) uses HTML5 dataTransfer with a custom
  // MIME. We can't read the payload during dragover (browsers block it for
  // security), but the MIME's presence in `types` tells us a watch is being
  // dragged from the tray and we should accept the drop on this slot.
  function hasExternalPayload(e: ReactDragEvent) {
    return onExternalDrop !== undefined && e.dataTransfer.types.includes(PLAYGROUND_WATCH_MIME)
  }

  function readExternalPayload(e: ReactDragEvent): string | null {
    if (onExternalDrop === undefined) return null
    const id = e.dataTransfer.getData(PLAYGROUND_WATCH_MIME)
    if (id) return id
    const text = e.dataTransfer.getData('text/plain')
    return text || null
  }

  useEffect(() => {
    setIsTouchDevice(window.matchMedia('(hover: none) and (pointer: coarse)').matches)
    const mobileQuery = window.matchMedia('(max-width: 767px)')
    const syncMobile = () => setIsMobile(mobileQuery.matches)
    syncMobile()
    mobileQuery.addEventListener('change', syncMobile)
    return () => {
      mobileQuery.removeEventListener('change', syncMobile)
      ghostRef.current?.remove()
      cancelLongPressTouch()
      touchDragCleanupRef.current?.()
    }
  }, [])

  const metrics = watchboxFrameMetrics(isMobile)

  function cancelLongPressTouch() {
    const lp = longPressTouchRef.current
    if (!lp) return
    if (lp.timer) clearTimeout(lp.timer)
    document.removeEventListener('pointermove', lp.moveHandler)
    document.removeEventListener('pointerup', lp.cancelHandler)
    document.removeEventListener('pointercancel', lp.cancelHandler)
    longPressTouchRef.current = null
  }

  function armTouchSlotDrag(slotIndex: number, el: HTMLElement, clientX: number, clientY: number, pointerId: number) {
    didTouchDragRef.current = true
    setDraggedIndex(slotIndex)
    try { el.setPointerCapture(pointerId) } catch {}
    try { (navigator as Navigator & { vibrate?: (n: number) => void }).vibrate?.(10) } catch {}

    touchDragCleanupRef.current?.()
    touchDragCleanupRef.current = startGhostDrag({
      sourceEl: el,
      clientX,
      clientY,
      payload: String(slotIndex),
      dropZones: [
        { kind: 'slot', selector: '[data-slot-index]' },
        ...(onTrashDrop ? [{ kind: 'trash' as const, selector: '[data-watchbox-trash]', indexOf: () => 0 }] : []),
      ],
      onHover: hit => {
        if (hit && hit.kind === 'slot') {
          setDragOverIndex(hit.index)
          setTrashHover(false)
        } else if (hit && hit.kind === 'trash') {
          setDragOverIndex(null)
          setTrashHover(true)
        } else {
          setDragOverIndex(null)
          setTrashHover(false)
        }
      },
      onHoverStyle: (ghostEl, hit) => {
        // Dim + flip ghost border red when hovering trash so the trash zone
        // underneath stays visible. Restore gold for everything else.
        if (hit && hit.kind === 'trash') {
          ghostEl.style.opacity = '0.55'
          ghostEl.style.borderColor = 'rgba(183,50,42,0.95)'
          ghostEl.style.boxShadow = '0 0 0 1px rgba(183,50,42,0.45), 0 12px 32px rgba(183,50,42,0.28)'
        } else {
          ghostEl.style.opacity = '0.92'
          ghostEl.style.borderColor = 'rgba(201,168,76,0.9)'
          ghostEl.style.boxShadow = '0 0 0 1px rgba(201,168,76,0.4), 0 12px 32px rgba(201,168,76,0.25)'
        }
      },
      onDrop: hit => {
        const from = slotIndex
        setDraggedIndex(null)
        setDragOverIndex(null)
        setTrashHover(false)
        if (hit && hit.kind === 'slot' && hit.index !== from && onReorder) {
          onReorder(from, hit.index)
        } else if (hit && hit.kind === 'trash' && onTrashDrop) {
          onTrashDrop(from)
        }
        // Keep didTouchDragRef true so the impending click is ignored;
        // it gets cleared in the slot's onClick handler.
      },
    })
  }

  function handleSlotTouchPointerDown(e: ReactPointerEvent<HTMLDivElement>, slotIndex: number) {
    if (!isTouchDevice || !onReorder) return
    if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return
    const el = e.currentTarget as HTMLElement
    const startX = e.clientX
    const startY = e.clientY
    const pointerId = e.pointerId

    cancelLongPressTouch()

    const moveHandler = (ev: PointerEvent) => {
      if (Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY) > 8) cancelLongPressTouch()
    }
    const cancelHandler = () => cancelLongPressTouch()

    document.addEventListener('pointermove', moveHandler, { passive: true })
    document.addEventListener('pointerup', cancelHandler)
    document.addEventListener('pointercancel', cancelHandler)

    const timer = setTimeout(() => {
      const lp = longPressTouchRef.current
      longPressTouchRef.current = null
      if (!lp) return
      document.removeEventListener('pointermove', lp.moveHandler)
      document.removeEventListener('pointerup', lp.cancelHandler)
      document.removeEventListener('pointercancel', lp.cancelHandler)
      armTouchSlotDrag(slotIndex, el, startX, startY, pointerId)
    }, 350)

    longPressTouchRef.current = { timer, moveHandler, cancelHandler }
  }

  useEffect(() => {
    if (!overflowOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOverflowOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [overflowOpen])

  const fr = FRAMES.find(f => f.id === frame) ?? FRAMES[0]
  const ln = LININGS.find(l => l.id === lining) ?? LININGS[0]
  const sc = SLOT_COUNTS.find(s => s.n === slotCount) ?? SLOT_COUNTS[1]
  const publicJewelSet = useMemo(() => new Set(jewelWatchIds ?? []), [jewelWatchIds])

  // Overflow semantics:
  // - Dense: any entries past slotCount-1 are hidden behind the overflow tile.
  // - Sparse: any entry whose slot index >= slotCount is overflow. When that
  //   happens we also reserve the last visible slot for the indicator, so a
  //   watch claiming slot (slotCount-1) gets bumped into hidden too.
  const sparseOverflow = useMemo(() => {
    if (!isSparse || !watchBySlot) return null
    const entries = Array.from(watchBySlot.entries()).sort((a, b) => a[0] - b[0])
    const hasOverflow = entries.some(([slot]) => slot >= sc.n)
    const visibleSlots = hasOverflow ? Math.max(sc.n - 1, 0) : sc.n
    const hiddenItems = entries
      .filter(([slot]) => slot >= visibleSlots)
      .map(([slot, w]) => ({ item: w, index: slot }))
    return { hasOverflow, visibleSlots, hiddenItems, overflowCount: hiddenItems.length }
  }, [isSparse, watchBySlot, sc.n])

  const overflow = useMemo(
    () => sparseOverflow ?? getWatchboxOverflow(watches, sc.n),
    [sparseOverflow, watches, sc.n],
  )
  const denseVisibleItems = useMemo(
    () => sparseOverflow ? [] : getWatchboxOverflow(watches, sc.n).visibleItems,
    [sparseOverflow, watches, sc.n],
  )
  const useHighContrastSlotText = isDarkColor(ln.slotBg) || isDarkColor(ln.color)
  const slotMetaColor = useHighContrastSlotText ? 'rgba(201,168,76,0.52)' : 'rgba(80,60,40,0.3)'
  const emptyPrimaryColor = useHighContrastSlotText ? brand.colors.gold : ln.emptyColor
  const overflowPrimaryColor = useHighContrastSlotText ? brand.colors.gold : brand.colors.ink
  const overflowSecondaryColor = useHighContrastSlotText ? 'rgba(201,168,76,0.82)' : brand.colors.muted
  const shouldShowJewel = (watchId: string) => (
    jewelWatchIds
      ? publicJewelSet.has(watchId)
      : mode === 'collection' && isWatchJewel(watchId)
  )

  const inPreview = onReorder !== undefined
    && draggedIndex !== null
    && dragOverIndex !== null
    && draggedIndex !== dragOverIndex

  function watchAtSlot(slotIndex: number): ResolvedWatch | null {
    if (isSparse) return watchBySlot?.get(slotIndex) ?? null
    return denseVisibleItems[slotIndex] ?? null
  }

  const slots = Array.from({ length: sc.n }, (_, i) => {
    if (overflow.hasOverflow && i === sc.n - 1) {
      return { type: 'overflow' as const }
    }
    // Drag preview swaps watch-at-slot-from with watch-at-slot-to visually.
    let watch: ResolvedWatch | null
    if (inPreview && i === draggedIndex) watch = watchAtSlot(dragOverIndex!)
    else if (inPreview && i === dragOverIndex) watch = watchAtSlot(draggedIndex!)
    else watch = watchAtSlot(i)
    return watch ? { type: 'watch' as const, watch, originalIndex: i } : { type: 'empty' as const }
  })

  const overflowSlotActive = overflow.hasOverflow && activeSlot !== null && activeSlot >= overflow.visibleSlots
  const trashVisible = draggedIndex !== null && onTrashDrop !== undefined

  return (
    <>
      {overflowOpen && (
        <div
          className="watchbox-overflow-backdrop"
          onClick={() => setOverflowOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(26, 20, 16, 0.45)',
            zIndex: 189,
            backdropFilter: 'blur(2px)',
            display: 'block',
          }}
        />
      )}

      <div
        className={wobble ? 'watchbox-wobble' : undefined}
        style={{
          borderRadius: isMobile ? 7 : 10,
          padding: `${metrics.outerPaddingTop}px ${metrics.outerPaddingSide}px ${metrics.outerPaddingBottom}px`,
          background: fr.css,
          boxShadow: fr.shadow,
          position: 'relative',
        }}
      >
        <div
          style={{
            background: ln.color,
            borderRadius: 5,
            padding: metrics.innerPadding,
            boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)',
            transition: 'background 0.4s ease',
            position: 'relative',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: slotWidth
                ? `repeat(${sc.cols}, ${slotWidth}px)`
                : `repeat(${sc.cols}, 1fr)`,
              gap: metrics.slotGap,
            }}
          >
            {slots.map((slot, i) => {
              const isActive = activeSlot === i || (slot.type === 'overflow' && overflowSlotActive)

              if (slot.type === 'empty') {
                const isFirstSlot = i === 0
                const isExternalHover = externalDragOverIndex === i || externalHoverIndex === i
                const isInternalHover = !!onReorder && draggedIndex !== null && dragOverIndex === i && draggedIndex !== i
                const showDropAffordance = isExternalHover || isInternalHover
                return (
                  <div
                    key={i}
                    data-slot-index={i}
                    style={{ aspectRatio: '3/4', borderRadius: 3, position: 'relative' }}
                    onDragOver={(onExternalDrop || onReorder) ? e => {
                      if (hasExternalPayload(e) && onExternalDrop) {
                        e.preventDefault()
                        e.dataTransfer.dropEffect = 'copy'
                        setExternalDragOverIndex(i)
                        return
                      }
                      if (onReorder && draggedIndex !== null) {
                        e.preventDefault()
                        setDragOverIndex(i)
                      }
                    } : undefined}
                    onDragLeave={(onExternalDrop || onReorder) ? () => {
                      setExternalDragOverIndex(prev => (prev === i ? null : prev))
                      setDragOverIndex(prev => (prev === i ? null : prev))
                    } : undefined}
                    onDrop={(onExternalDrop || onReorder) ? e => {
                      if (hasExternalPayload(e) && onExternalDrop) {
                        e.preventDefault()
                        const watchId = readExternalPayload(e)
                        setExternalDragOverIndex(null)
                        if (watchId) onExternalDrop(i, watchId)
                        return
                      }
                      if (onReorder && draggedIndex !== null && draggedIndex !== i) {
                        onReorder(draggedIndex, i)
                      }
                      setDraggedIndex(null)
                      setDragOverIndex(null)
                    } : undefined}
                  >
                    <div
                      onClick={readonly ? undefined : (onEmptySlotClick ? () => onEmptySlotClick(i) : undefined)}
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: 3,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: readonly ? 'default' : 'pointer',
                        opacity: useHighContrastSlotText ? 0.88 : showDropAffordance ? 1 : 0.55,
                        background: showDropAffordance ? 'rgba(201,168,76,0.10)' : ln.slotBg,
                        border: showDropAffordance
                          ? '2px dashed rgba(201,168,76,0.95)'
                          : '1.5px solid transparent',
                        boxShadow: showDropAffordance
                          ? 'inset 0 0 0 2px rgba(255,252,247,0.4), 0 0 0 2px rgba(201,168,76,0.55), 0 6px 22px rgba(201,168,76,0.28)'
                          : undefined,
                        transform: showDropAffordance ? 'scale(1.04)' : 'scale(1)',
                        transition: 'border-color 0.18s, box-shadow 0.18s, background 0.18s, transform 0.18s, opacity 0.18s',
                      }}
                    >
                      {readonly ? (
                        <span style={{ fontFamily: brand.font.sans, fontSize: 8, letterSpacing: '0.1em', color: emptyPrimaryColor }}>
                          EMPTY
                        </span>
                      ) : showFirstSlotLabel ? (
                        // Empty collection: keep the PR #47 restrained behavior —
                        // first slot carries the onboarding label, others stay blank.
                        isFirstSlot ? (
                          <span
                            style={{
                              fontFamily: brand.font.sans,
                              fontSize: 9,
                              fontWeight: 500,
                              letterSpacing: '0.06em',
                              color: emptyPrimaryColor,
                              textAlign: 'center',
                              padding: '0 6px',
                              lineHeight: 1.2,
                            }}
                          >
                            Add your first watch
                          </span>
                        ) : null
                      ) : (
                        // Collection has ≥1 watch — restore the canonical
                        // "+ / ADD WATCH" affordance so empty slots read as
                        // clickable. Matches docs/design-system preview spec.
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                          <span
                            aria-hidden="true"
                            style={{ fontSize: 20, lineHeight: 1, color: emptyPrimaryColor }}
                          >
                            +
                          </span>
                          <span
                            style={{
                              fontFamily: brand.font.sans,
                              fontSize: 7.5,
                              letterSpacing: '0.08em',
                              color: emptyPrimaryColor,
                            }}
                          >
                            ADD WATCH
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              }

              if (slot.type === 'overflow') {
                return (
                  <div key={i} style={{ aspectRatio: '3/4', borderRadius: 3, position: 'relative' }}>
                    <button
                      onClick={() => setOverflowOpen(true)}
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: 3,
                        border: isActive ? '1.5px solid rgba(201,168,76,0.8)' : '1.5px solid transparent',
                        boxShadow: isActive
                          ? 'inset 0 1px 4px rgba(0,0,0,0.12), 0 0 0 1px rgba(201,168,76,0.4), 0 3px 14px rgba(201,168,76,0.16)'
                          : 'inset 0 1px 4px rgba(0,0,0,0.12)',
                        background: ln.slotBg,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        position: 'relative',
                        overflow: 'hidden',
                        transition: 'border-color 0.2s, box-shadow 0.2s',
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          top: 5,
                          left: 6,
                          fontFamily: brand.font.sans,
                          fontSize: 8,
                          fontWeight: 500,
                          letterSpacing: '0.08em',
                          color: slotMetaColor,
                          pointerEvents: 'none',
                          zIndex: 2,
                        }}
                      >
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div
                        style={{
                          fontFamily: brand.font.serif,
                          fontSize: 26,
                          color: overflowPrimaryColor,
                          lineHeight: 1,
                        }}
                      >
                        +{overflow.overflowCount}
                      </div>
                      <div
                        style={{
                          fontFamily: brand.font.sans,
                          fontSize: 9,
                          fontWeight: 600,
                          letterSpacing: '0.12em',
                          textTransform: 'uppercase',
                          color: overflowSecondaryColor,
                        }}
                      >
                        More
                      </div>
                      {isActive && (
                        <span
                          style={{
                            position: 'absolute',
                            bottom: 5,
                            right: 5,
                            width: 4,
                            height: 4,
                            borderRadius: '50%',
                            background: brand.colors.gold,
                            boxShadow: '0 0 6px rgba(201,168,76,0.8)',
                            zIndex: 2,
                          }}
                        />
                      )}
                    </button>
                  </div>
                )
              }

              const w = slot.watch
              const isSourceInPreview = inPreview && i === draggedIndex
              const isDestInPreview = inPreview && i === dragOverIndex
              const isBeingDragged = !inPreview && onReorder !== undefined && draggedIndex === i
              const isDragTarget = !inPreview && onReorder !== undefined && dragOverIndex === i && draggedIndex !== i
              const isExternalDragTarget = externalDragOverIndex === i || externalHoverIndex === i
              const slotOpacity = isBeingDragged ? 0.5 : isSourceInPreview ? 0.4 : 1

              return (
                <motion.div
                  key={`watch-${w.id}`}
                  layout={reduceMotion ? false : 'position'}
                  initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : {
                          layout: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
                          opacity: { duration: 0.18, ease: [0.4, 0, 0.2, 1], delay: i * 0.04 },
                          scale: { duration: 0.3, ease: [0.4, 0, 0.2, 1], delay: i * 0.04 },
                        }
                  }
                  whileHover={reduceMotion || draggedIndex !== null ? undefined : { y: -2 }}
                  style={{ position: 'relative', aspectRatio: '3/4' }}
                >
                <div
                  data-slot-index={i}
                  draggable={onReorder !== undefined && !isTouchDevice}
                  onPointerDown={isTouchDevice && onReorder ? e => handleSlotTouchPointerDown(e, i) : undefined}
                  onClick={() => {
                    if (didTouchDragRef.current) {
                      didTouchDragRef.current = false
                      return
                    }
                    onSlotClick(slot.originalIndex)
                  }}
                  onDragStart={onReorder ? e => {
                    dragCounter.current = 0
                    setDraggedIndex(i)
                    const el = e.currentTarget as HTMLElement
                    const clone = el.cloneNode(true) as HTMLDivElement
                    clone.style.cssText += `;position:absolute;top:-9999px;left:-9999px;width:${el.offsetWidth}px;height:${el.offsetHeight}px;border:1.5px solid rgba(201,168,76,0.8);box-shadow:0 0 0 1px rgba(201,168,76,0.4),0 8px 24px rgba(201,168,76,0.2);opacity:1;border-radius:3px;pointer-events:none`
                    document.body.appendChild(clone)
                    ghostRef.current = clone
                    e.dataTransfer.setDragImage(clone, e.nativeEvent.offsetX, e.nativeEvent.offsetY)
                  } : undefined}
                  onDragOver={(onReorder || onExternalDrop) ? e => {
                    if (hasExternalPayload(e)) {
                      e.preventDefault()
                      e.dataTransfer.dropEffect = 'copy'
                      setExternalDragOverIndex(i)
                      return
                    }
                    if (!onReorder) return
                    e.preventDefault()
                    setDragOverIndex(i)
                  } : undefined}
                  onDragEnter={onReorder ? () => { dragCounter.current++ } : undefined}
                  onDragLeave={(onReorder || onExternalDrop) ? () => {
                    if (onReorder) {
                      dragCounter.current--
                      if (dragCounter.current === 0) setDragOverIndex(null)
                    }
                    setExternalDragOverIndex(prev => (prev === i ? null : prev))
                  } : undefined}
                  onDrop={(onReorder || onExternalDrop) ? (e: ReactDragEvent) => {
                    if (hasExternalPayload(e) && onExternalDrop) {
                      e.preventDefault()
                      const watchId = readExternalPayload(e)
                      setExternalDragOverIndex(null)
                      if (watchId) onExternalDrop(i, watchId)
                      return
                    }
                    if (onReorder && draggedIndex !== null && draggedIndex !== i) onReorder(draggedIndex, i)
                    setDraggedIndex(null)
                    setDragOverIndex(null)
                  } : undefined}
                  onDragEnd={onReorder ? () => {
                    ghostRef.current?.remove()
                    ghostRef.current = null
                    setDraggedIndex(null)
                    setDragOverIndex(null)
                  } : undefined}
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: 3,
                    position: 'relative',
                    cursor: 'pointer',
                    overflow: 'visible',
                    // Transient drag/preview dimming stays plain CSS (instant,
                    // position-correct). Framer owns only the entrance + reorder
                    // opacity on the wrapper, so the two never fight and a slot
                    // can't get stranded mid-fade.
                    opacity: slotOpacity,
                    transition: 'opacity 0.15s ease',
                    // iOS Safari intercepts long-press on the slot image with
                    // its native callout menu before our custom long-press
                    // timer can fire. These CSS knobs suppress that gesture
                    // at the wrapper. NB: we do NOT set WebkitUserDrag:'none'
                    // here — that would also nuke desktop HTML5 drag, which
                    // is the wrapper-driven reorder source. The inner <img>
                    // gets that suppression instead.
                    WebkitTouchCallout: 'none',
                    WebkitUserSelect: 'none',
                    userSelect: 'none',
                    // Lock out native scroll/zoom on the slot when long-press
                    // reorder is wired up. Without this, iOS fires
                    // pointercancel the moment the user's finger trembles a
                    // pixel, killing the timer before it can arm. Users can
                    // still scroll the page by starting their touch outside
                    // any slot (frame, configurator, tray, page margin).
                    touchAction: (isTouchDevice && onReorder) ? 'none' : undefined,
                  }}
                  onMouseEnter={() => {
                    if (draggedIndex !== null) return
                    if (onReorder !== undefined) setHoveredSlot(i)
                  }}
                  onMouseLeave={() => {
                    if (onReorder !== undefined) setHoveredSlot(null)
                  }}
                >
                  {onReorder !== undefined && !isTouchDevice && hoveredSlot === i && !isBeingDragged && (
                    <div
                      style={{
                        position: 'absolute',
                        right: 7,
                        bottom: 7,
                        zIndex: 10,
                        cursor: isBeingDragged ? 'grabbing' : 'grab',
                        padding: 0,
                        pointerEvents: 'none',
                      }}
                    >
                      <div
                        aria-hidden="true"
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(2, 3px)',
                          gap: 2,
                          padding: '2px 1px',
                          opacity: 0.82,
                        }}
                      >
                        {Array.from({ length: 4 }).map((_, dotIndex) => (
                          <span
                            key={dotIndex}
                            style={{
                              width: 3,
                              height: 3,
                              borderRadius: '50%',
                              background: 'rgba(201,168,76,0.7)',
                              boxShadow: '0 0 4px rgba(26,20,16,0.12)',
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: 3,
                      overflow: 'hidden',
                      position: 'relative',
                      background: ln.slotBg,
                      cursor: 'pointer',
                      border: isExternalDragTarget
                        ? '2px solid rgba(201,168,76,0.95)'
                        : (isActive || isDragTarget || isDestInPreview)
                        ? '1.5px solid rgba(201,168,76,0.8)'
                        : isSourceInPreview
                        ? '1.5px dashed rgba(201,168,76,0.6)'
                        : '1.5px solid transparent',
                      boxShadow: isExternalDragTarget
                        ? 'inset 0 1px 4px rgba(0,0,0,0.12), 0 0 0 2px rgba(201,168,76,0.55), 0 6px 22px rgba(201,168,76,0.28)'
                        : (isActive || isDragTarget || isDestInPreview)
                        ? 'inset 0 1px 4px rgba(0,0,0,0.12), 0 0 0 1px rgba(201,168,76,0.4), 0 3px 14px rgba(201,168,76,0.16)'
                        : 'inset 0 1px 4px rgba(0,0,0,0.12)',
                      transform: isExternalDragTarget ? 'scale(1.04)' : 'scale(1)',
                      transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.2s',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        top: 5,
                        left: 6,
                        fontFamily: 'var(--font-dm-sans)',
                        fontSize: 8,
                        fontWeight: 500,
                        letterSpacing: '0.08em',
                        color: slotMetaColor,
                        pointerEvents: 'none',
                        zIndex: 2,
                      }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <WatchImageOrDial
                      watch={w}
                      fill
                      sizes="(max-width: 768px) 20vw, 10vw"
                      imageStyle={{
                        objectFit: 'contain',
                        objectPosition: 'center center',
                        // The wrapper's onPointerDown owns long-press reorder.
                        // Make the <img> non-interactive so Safari's image
                        // gestures don't get a target to act on.
                        pointerEvents: 'none',
                        ...({ WebkitUserDrag: 'none', WebkitTouchCallout: 'none' } as Record<string, string>),
                      }}
                      draggable={false}
                      dialSize={Math.round((slotWidth ?? 90) * 0.58)}
                    />
                    {shouldShowJewel(w.watchId) && (
                      <div
                        className={mode === 'collection' && !readonly ? 'watchbox-jewel-mobile-hide' : undefined}
                        style={{ position: 'absolute', top: 5, right: 5, zIndex: 3 }}
                      >
                        <IntentBadge state="jewel" compact iconOnly />
                      </div>
                    )}
                    {isActive && (
                      <span
                        style={{
                          position: 'absolute',
                          bottom: 5,
                          right: 5,
                          width: 4,
                          height: 4,
                          borderRadius: '50%',
                          background: brand.colors.gold,
                          boxShadow: '0 0 6px rgba(201,168,76,0.8)',
                          zIndex: 2,
                        }}
                      />
                    )}
                  </div>
                </div>
                </motion.div>
              )
            })}
          </div>

          {overflow.hasOverflow && (
            <>
              <div
                className="watchbox-overflow-flyout"
                role="dialog"
                aria-modal="true"
                aria-label="Hidden watches"
                style={{
                  position: 'fixed',
                  top: '50%',
                  left: '50%',
                  transform: overflowOpen
                    ? 'translate(-50%, -50%) scale(1)'
                    : 'translate(-50%, -50%) scale(0.96)',
                  width: 'min(640px, 92vw)',
                  maxHeight: 'min(560px, 80vh)',
                  display: 'flex',
                  flexDirection: 'column',
                  background: brand.colors.bg,
                  border: `1px solid ${brand.colors.borderMid}`,
                  borderRadius: brand.radius.xl,
                  boxShadow: '0 24px 60px rgba(26,20,16,0.32)',
                  opacity: overflowOpen ? 1 : 0,
                  pointerEvents: overflowOpen ? 'auto' : 'none',
                  transition: 'opacity 0.18s ease, transform 0.18s ease',
                  zIndex: 191,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    padding: '16px 20px 14px',
                    borderBottom: `1px solid ${brand.colors.border}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: brand.colors.slot,
                    flexShrink: 0,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontFamily: brand.font.sans,
                        fontSize: 9.5,
                        fontWeight: 600,
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        color: brand.colors.muted,
                        marginBottom: 4,
                      }}
                    >
                      Hidden Watches
                    </div>
                    <div style={{ fontFamily: brand.font.serif, fontSize: 22, color: brand.colors.ink, lineHeight: 1.1 }}>
                      {overflow.overflowCount} more in this box
                    </div>
                  </div>
                  <button
                    onClick={() => setOverflowOpen(false)}
                    aria-label="Close"
                    style={{
                      background: brand.colors.white,
                      border: `1px solid ${brand.colors.border}`,
                      borderRadius: brand.radius.sm,
                      cursor: 'pointer',
                      color: brand.colors.muted,
                      fontSize: 16,
                      lineHeight: 1,
                      padding: '6px 9px',
                    }}
                  >
                    ✕
                  </button>
                </div>
                <div
                  style={{
                    overflowY: 'auto',
                    padding: 18,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                    gap: 14,
                    alignContent: 'start',
                  }}
                >
                  {overflow.hiddenItems.map(({ item, index }) => (
                    <OverflowGridCard
                      key={item.id}
                      watch={item}
                      mode={mode}
                      showJewelBadge={shouldShowJewel(item.watchId)}
                      onClick={() => {
                        onSlotClick(index)
                        setOverflowOpen(false)
                      }}
                    />
                  ))}
                </div>
              </div>

              {overflowOpen && (
                <div
                  className="watchbox-overflow-sheet"
                  style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    zIndex: 190,
                    background: brand.colors.white,
                    borderRadius: '20px 20px 0 0',
                    transform: 'translateY(0)',
                    display: 'none',
                    maxHeight: '70vh',
                    overflowY: 'auto',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
                    <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E0DAD0' }} />
                  </div>
                  <div
                    style={{
                      padding: '12px 20px 8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontFamily: brand.font.sans,
                          fontSize: 10,
                          fontWeight: 600,
                          letterSpacing: '0.12em',
                          textTransform: 'uppercase',
                          color: brand.colors.muted,
                          marginBottom: 4,
                        }}
                      >
                        Hidden Watches
                      </div>
                      <div style={{ fontFamily: brand.font.sans, fontSize: 12, color: brand.colors.ink }}>
                        {overflow.overflowCount} more in this box
                      </div>
                    </div>
                    <button
                      onClick={() => setOverflowOpen(false)}
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
                  <div style={{ paddingBottom: 20 }}>
                    {overflow.hiddenItems.map(({ item, index }) => (
                      <OverflowListItem
                        key={item.id}
                        watch={item}
                        mode={mode}
                        showJewelBadge={shouldShowJewel(item.watchId)}
                        onClick={() => {
                          onSlotClick(index)
                          setOverflowOpen(false)
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {onTrashDrop !== undefined && (
        <div
          aria-hidden={!trashVisible}
          style={{
            position: 'absolute',
            bottom: -82,
            left: '50%',
            transform: trashVisible
              ? 'translate(-50%, 0)'
              : 'translate(-50%, -6px)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            opacity: trashVisible ? 1 : 0,
            pointerEvents: trashVisible ? 'auto' : 'none',
            transition: 'opacity 0.18s ease, transform 0.18s ease',
            zIndex: 20,
          }}
        >
          <div
            data-watchbox-trash="1"
            onDragOver={e => {
              if (draggedIndex === null) return
              e.preventDefault()
              e.dataTransfer.dropEffect = 'move'
              setTrashHover(true)
            }}
            onDragLeave={() => setTrashHover(false)}
            onDrop={e => {
              e.preventDefault()
              const from = draggedIndex
              setTrashHover(false)
              setDraggedIndex(null)
              setDragOverIndex(null)
              if (from !== null) onTrashDrop(from)
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 22px 12px 18px',
              minWidth: 168,
              height: 64,
              borderRadius: 32,
              background: trashHover ? 'rgba(220,70,60,0.18)' : 'rgba(220,70,60,0.08)',
              border: trashHover ? '2px solid #B7322A' : '2px dashed rgba(183,50,42,0.55)',
              boxShadow: trashHover
                ? '0 0 0 6px rgba(220,70,60,0.16), 0 10px 28px rgba(183,50,42,0.22)'
                : '0 4px 14px rgba(183,50,42,0.10)',
              color: '#B7322A',
              transition: 'background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, transform 0.18s ease',
              transform: trashHover ? 'scale(1.06)' : 'scale(1)',
              whiteSpace: 'nowrap',
              userSelect: 'none',
              WebkitUserSelect: 'none',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 30,
                height: 30,
                borderRadius: '50%',
                background: trashHover ? '#B7322A' : 'rgba(220,70,60,0.18)',
                color: trashHover ? '#FFFFFF' : '#B7322A',
                transition: 'background 0.15s ease, color 0.15s ease',
                flexShrink: 0,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
                <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
              </svg>
            </span>
            <span
              style={{
                fontFamily: brand.font.sans,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: '#B7322A',
              }}
            >
              {trashHover ? 'Release to remove' : 'Drop to remove'}
            </span>
          </div>
        </div>
      )}
    </>
  )
}
