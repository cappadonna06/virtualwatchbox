'use client'

import { useEffect, useMemo, useRef, useState, type DragEvent, type PointerEvent as ReactPointerEvent } from 'react'
import type { CatalogWatch, ResolvedOwnedWatch } from '@/types/watch'
import { brand } from '@/lib/brand'
import WatchImageOrDial from '@/components/watchbox/WatchImageOrDial'
import { PLAYGROUND_WATCH_MIME, startGhostDrag } from '@/lib/dragGhost'

type Tab = 'followed' | 'collection'

interface Props {
  followedWatches: CatalogWatch[]
  collectionWatches: ResolvedOwnedWatch[]
  onWatchDropped: (slotIndex: number | null, watchId: string) => void
  /** Fires as the touch ghost moves over slots, so the page can light up the target slot in WatchBox. */
  onTouchHoverChange?: (slotIndex: number | null) => void
  /** Selector that resolves to all valid drop-target slot wrappers in the active watchbox. */
  slotSelector?: string
}

const COLLAPSE_KEY = 'playgroundTray.collapsed'
const TAB_KEY = 'playgroundTray.tab'
const LONG_PRESS_MS = 350
const MOVE_CANCEL_PX = 8

export default function WatchTray({
  followedWatches,
  collectionWatches,
  onWatchDropped,
  onTouchHoverChange,
  slotSelector = '[data-slot-index]',
}: Props) {
  const [tab, setTab] = useState<Tab>('followed')
  const [collapsed, setCollapsed] = useState(false)
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [armedId, setArmedId] = useState<string | null>(null)
  const [hoverSlot, setHoverSlot] = useState<number | null>(null)
  const [showLeftFade, setShowLeftFade] = useState(false)
  const [showRightFade, setShowRightFade] = useState(false)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)
  const longPressRef = useRef<{
    timer: ReturnType<typeof setTimeout> | null
    startX: number
    startY: number
    watchId: string
    pointerId: number
    el: HTMLElement
    moveHandler: (ev: PointerEvent) => void
    cancelHandler: (ev: PointerEvent) => void
  } | null>(null)

  useEffect(() => {
    setIsTouchDevice(window.matchMedia('(hover: none) and (pointer: coarse)').matches)
    const desktopQuery = window.matchMedia('(min-width: 768px)')
    const updateDesktop = () => setIsDesktop(desktopQuery.matches)
    updateDesktop()
    desktopQuery.addEventListener('change', updateDesktop)
    try {
      const c = sessionStorage.getItem(COLLAPSE_KEY)
      if (c === '1') setCollapsed(true)
      const t = sessionStorage.getItem(TAB_KEY)
      if (t === 'collection' || t === 'followed') setTab(t)
    } catch {}
    return () => desktopQuery.removeEventListener('change', updateDesktop)
  }, [])

  useEffect(() => {
    try {
      sessionStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0')
    } catch {}
  }, [collapsed])

  useEffect(() => {
    try {
      sessionStorage.setItem(TAB_KEY, tab)
    } catch {}
  }, [tab])

  useEffect(() => {
    if (followedWatches.length === 0 && collectionWatches.length > 0) setTab('collection')
  }, [followedWatches.length, collectionWatches.length])

  useEffect(() => () => {
    cleanupRef.current?.()
    cancelLongPress()
  }, [])

  // Show fade affordance when there's offscreen tray content. Recompute on
  // scroll, resize, tab/collapse changes, and whenever the item list shifts.
  useEffect(() => {
    if (collapsed) {
      setShowLeftFade(false)
      setShowRightFade(false)
      return
    }
    const el = scrollRef.current
    if (!el) return
    const sync = () => {
      const overflow = el.scrollWidth - el.clientWidth
      setShowLeftFade(el.scrollLeft > 2)
      setShowRightFade(overflow - el.scrollLeft > 2)
    }
    sync()
    el.addEventListener('scroll', sync, { passive: true })
    window.addEventListener('resize', sync)
    return () => {
      el.removeEventListener('scroll', sync)
      window.removeEventListener('resize', sync)
    }
  }, [collapsed, tab, followedWatches.length, collectionWatches.length, isDesktop])

  const items = useMemo(() => {
    if (tab === 'followed') {
      return followedWatches.map(w => ({
        id: w.id,
        watchId: w.id,
        brand: w.brand,
        model: w.model,
        imageUrl: w.imageUrl,
        dialConfig: w.dialConfig,
      }))
    }
    return collectionWatches.map(w => ({
      id: w.id,
      watchId: w.watchId,
      brand: w.brand,
      model: w.model,
      imageUrl: w.imageUrl,
      dialConfig: w.dialConfig,
    }))
  }, [tab, followedWatches, collectionWatches])

  function handleDesktopDragStart(e: DragEvent<HTMLDivElement>, watchId: string) {
    e.dataTransfer.effectAllowed = 'copy'
    e.dataTransfer.setData(PLAYGROUND_WATCH_MIME, watchId)
    e.dataTransfer.setData('text/plain', watchId)
    setActiveDragId(watchId)
  }

  function handleDesktopDragEnd() {
    setActiveDragId(null)
  }

  function cancelLongPress() {
    const lp = longPressRef.current
    if (!lp) return
    if (lp.timer) clearTimeout(lp.timer)
    document.removeEventListener('pointermove', lp.moveHandler)
    document.removeEventListener('pointerup', lp.cancelHandler)
    document.removeEventListener('pointercancel', lp.cancelHandler)
    longPressRef.current = null
  }

  function armDrag(watchId: string, el: HTMLElement, clientX: number, clientY: number, pointerId: number) {
    setArmedId(watchId)
    setActiveDragId(watchId)
    try { el.setPointerCapture(pointerId) } catch {}
    try { (navigator as Navigator & { vibrate?: (n: number) => void }).vibrate?.(10) } catch {}

    cleanupRef.current?.()
    cleanupRef.current = startGhostDrag({
      sourceEl: el,
      clientX,
      clientY,
      ghostWidth: 72,
      ghostHeight: 96,
      payload: watchId,
      dropZones: [{ kind: 'slot', selector: slotSelector }],
      onHover: hit => {
        const idx = hit && hit.kind === 'slot' ? hit.index : null
        setHoverSlot(idx)
        onTouchHoverChange?.(idx)
      },
      onDrop: (hit, id) => {
        setActiveDragId(null)
        setArmedId(null)
        setHoverSlot(null)
        onTouchHoverChange?.(null)
        const slotIndex = hit && hit.kind === 'slot' ? hit.index : null
        onWatchDropped(slotIndex, id)
      },
    })
  }

  function handleTouchPointerDown(e: ReactPointerEvent<HTMLDivElement>, watchId: string) {
    if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return
    const el = e.currentTarget as HTMLElement
    const startX = e.clientX
    const startY = e.clientY
    const pointerId = e.pointerId

    cancelLongPress()

    const moveHandler = (ev: PointerEvent) => {
      const dx = Math.abs(ev.clientX - startX)
      const dy = Math.abs(ev.clientY - startY)
      if (dx + dy > MOVE_CANCEL_PX) cancelLongPress()
    }
    const cancelHandler = () => cancelLongPress()

    document.addEventListener('pointermove', moveHandler, { passive: true })
    document.addEventListener('pointerup', cancelHandler)
    document.addEventListener('pointercancel', cancelHandler)

    const timer = setTimeout(() => {
      const lp = longPressRef.current
      longPressRef.current = null
      if (!lp) return
      document.removeEventListener('pointermove', lp.moveHandler)
      document.removeEventListener('pointerup', lp.cancelHandler)
      document.removeEventListener('pointercancel', lp.cancelHandler)
      armDrag(watchId, el, startX, startY, pointerId)
    }, LONG_PRESS_MS)

    longPressRef.current = { timer, startX, startY, watchId, pointerId, el, moveHandler, cancelHandler }
  }

  return (
    <>
    <div
      style={{
        position: 'relative',
        marginTop: 18,
        background: brand.colors.white,
        border: `1px solid ${brand.colors.border}`,
        borderRadius: brand.radius.lg,
        boxShadow: brand.shadow.sm,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '8px 12px',
          borderBottom: collapsed ? 'none' : `1px solid ${brand.colors.border}`,
          background: brand.colors.slot,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <TabButton
            label="Followed"
            count={followedWatches.length}
            active={tab === 'followed'}
            onSelect={() => setTab('followed')}
          />
          <TabButton
            label="Collection"
            count={collectionWatches.length}
            active={tab === 'collection'}
            onSelect={() => setTab('collection')}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => setCollapsed(v => !v)}
            aria-label={collapsed ? 'Expand tray' : 'Collapse tray'}
            title={collapsed ? 'Expand' : 'Collapse'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 26,
              height: 26,
              borderRadius: brand.radius.sm,
              background: brand.colors.white,
              border: `1px solid ${brand.colors.border}`,
              color: brand.colors.muted,
              cursor: 'pointer',
            }}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              aria-hidden="true"
              style={{ transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.18s ease' }}
            >
              <polyline points="2,6.5 5,3.5 8,6.5" />
            </svg>
          </button>
        </div>
      </div>

      {!collapsed && (
        <div style={{ position: 'relative' }}>
        <div
          ref={scrollRef}
          style={{
            display: 'flex',
            gap: isDesktop ? 14 : 10,
            padding: isDesktop ? '16px 16px 18px' : '12px 12px 14px',
            overflowX: 'auto',
            overflowY: 'hidden',
            scrollbarWidth: isDesktop ? 'auto' : 'thin',
            touchAction: isTouchDevice ? 'pan-x' : undefined,
          }}
        >
          {items.length === 0 ? (
            <div
              style={{
                fontFamily: brand.font.sans,
                fontSize: 11,
                color: brand.colors.muted,
                padding: '14px 6px',
                lineHeight: 1.5,
              }}
            >
              {tab === 'followed'
                ? 'No followed watches yet. Tap any watch and follow it to see it here.'
                : 'Your collection is empty. Add a watch from Discover to see it here.'}
            </div>
          ) : (
            items.map(item => {
              const isActive = activeDragId === item.watchId
              const isArmed = armedId === item.watchId
              return (
                <div
                  key={item.id}
                  draggable={!isTouchDevice}
                  onDragStart={!isTouchDevice ? e => handleDesktopDragStart(e as DragEvent<HTMLDivElement>, item.watchId) : undefined}
                  onDragEnd={!isTouchDevice ? handleDesktopDragEnd : undefined}
                  onPointerDown={isTouchDevice ? e => handleTouchPointerDown(e, item.watchId) : undefined}
                  title={`${item.brand} ${item.model}`}
                  style={{
                    flexShrink: 0,
                    width: isDesktop ? 128 : 76,
                    cursor: 'grab',
                    background: brand.colors.bg,
                    border: isArmed
                      ? `1px solid ${brand.colors.gold}`
                      : `1px solid ${brand.colors.borderMid}`,
                    borderRadius: brand.radius.md,
                    padding: isDesktop ? 9 : 6,
                    opacity: isActive ? 0.45 : 1,
                    boxShadow: isArmed ? brand.shadow.gold : undefined,
                    transition: 'opacity 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
                    transform: isActive ? 'scale(0.96)' : isArmed ? 'scale(1.04)' : 'scale(1)',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                  }}
                >
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      aspectRatio: '3/4',
                      borderRadius: brand.radius.sm,
                      overflow: 'hidden',
                      background: brand.colors.paper,
                      marginBottom: isDesktop ? 7 : 4,
                      pointerEvents: 'none',
                    }}
                  >
                    <WatchImageOrDial
                      watch={item}
                      fill
                      sizes={isDesktop ? '128px' : '76px'}
                      imageStyle={{ objectFit: 'contain', objectPosition: 'center center' }}
                      dialSize={isDesktop ? 64 : 42}
                    />
                  </div>
                  <div
                    style={{
                      fontFamily: brand.font.sans,
                      fontSize: isDesktop ? 10 : 8.5,
                      fontWeight: 600,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: brand.colors.gold,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      pointerEvents: 'none',
                    }}
                  >
                    {item.brand}
                  </div>
                  <div
                    style={{
                      fontFamily: brand.font.serif,
                      fontSize: isDesktop ? 14 : 11,
                      color: brand.colors.ink,
                      lineHeight: 1.15,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      pointerEvents: 'none',
                    }}
                  >
                    {item.model}
                  </div>
                </div>
              )
            })
          )}
        </div>
        {showLeftFade && (
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: 28,
              background: `linear-gradient(to right, ${brand.colors.white}, rgba(255,255,255,0))`,
              pointerEvents: 'none',
            }}
          />
        )}
        {showRightFade && (
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: isTouchDevice ? 44 : 36,
              background: `linear-gradient(to left, ${brand.colors.white}, rgba(255,255,255,0))`,
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              paddingRight: 6,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={brand.colors.muted} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="5,3 9,7 5,11" />
            </svg>
          </div>
        )}
        </div>
      )}

    </div>
    {!collapsed && (
      <div
        style={{
          marginTop: 6,
          textAlign: 'center',
          fontFamily: brand.font.sans,
          fontSize: 9.5,
          color: brand.colors.borderLight,
          letterSpacing: '0.06em',
          pointerEvents: 'none',
        }}
      >
        {isTouchDevice
          ? (hoverSlot !== null
              ? `Drop into slot ${String(hoverSlot + 1).padStart(2, '0')}`
              : 'Hold to drag')
          : 'Drag onto a slot'}
      </div>
    )}
  </>
  )
}

function TabButton({ label, count, active, onSelect }: { label: string; count: number; active: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        borderRadius: brand.radius.sm,
        background: active ? brand.colors.white : 'transparent',
        border: `1px solid ${active ? brand.colors.borderMid : 'transparent'}`,
        fontFamily: brand.font.sans,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: active ? brand.colors.ink : brand.colors.muted,
        cursor: 'pointer',
        transition: 'background 0.15s, color 0.15s',
      }}
    >
      {label}
      <span
        style={{
          fontVariantNumeric: 'tabular-nums',
          fontSize: 9.5,
          fontWeight: 500,
          padding: '1px 7px',
          borderRadius: brand.radius.pill,
          background: active ? brand.colors.goldWash : brand.colors.bg,
          color: active ? brand.colors.gold : brand.colors.muted,
          border: `1px solid ${active ? brand.colors.goldLine : brand.colors.borderLight}`,
        }}
      >
        {count}
      </span>
    </button>
  )
}
