'use client'

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import Image from 'next/image'
import type { ResolvedWatch } from '@/types/watch'
import { FRAMES, LININGS, SLOT_COUNTS } from '@/lib/frameConfig'
import { getWatchboxOverflow } from '@/lib/watchboxOverflow'
import DialSVG from '@/components/watchbox/DialSVG'
import { brand } from '@/lib/brand'

interface Props {
  watches: ResolvedWatch[]
  activeSlot: number | null
  onSlotClick: (i: number) => void
  onEmptySlotClick?: () => void
  onReorder?: (from: number, to: number) => void
  frame: string
  lining: string
  slotCount: number
  slotWidth?: number
  mode?: 'collection' | 'playground'
  readonly?: boolean
}

function OverflowListItem({
  watch,
  onClick,
  mode,
}: {
  watch: ResolvedWatch
  onClick: () => void
  mode: 'collection' | 'playground'
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
        {mode === 'playground' ? (
          <DialSVG
            dialColor={watch.dialConfig.dialColor}
            markerColor={watch.dialConfig.markerColor}
            handColor={watch.dialConfig.handColor}
            size={32}
          />
        ) : (
          <Image
            src={watch.imageUrl}
            alt={watch.model}
            fill
            sizes="48px"
            style={{ objectFit: 'cover', objectPosition: 'center 45%' }}
          />
        )}
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontFamily: brand.font.sans,
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: brand.colors.gold,
            marginBottom: 2,
          }}
        >
          {watch.brand}
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
  frame,
  lining,
  slotCount,
  slotWidth,
  mode = 'collection',
  readonly = false,
}: Props) {
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null)
  const [overflowOpen, setOverflowOpen] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const dragCounter = useRef(0)
  const ghostRef = useRef<HTMLDivElement | null>(null)
  const touchDragging = useRef(false)
  const touchGhostRef = useRef<HTMLDivElement | null>(null)
  const slotRectsRef = useRef<{ rect: DOMRect; index: number }[]>([])

  useEffect(() => {
    setIsTouchDevice(window.matchMedia('(hover: none) and (pointer: coarse)').matches)
    return () => {
      ghostRef.current?.remove()
      touchGhostRef.current?.remove()
    }
  }, [])

  const fr = FRAMES.find(f => f.id === frame) ?? FRAMES[0]
  const ln = LININGS.find(l => l.id === lining) ?? LININGS[0]
  const sc = SLOT_COUNTS.find(s => s.n === slotCount) ?? SLOT_COUNTS[1]
  const overflow = useMemo(() => getWatchboxOverflow(watches, sc.n), [watches, sc.n])
  const useHighContrastSlotText = isDarkColor(ln.slotBg) || isDarkColor(ln.color)
  const slotMetaColor = useHighContrastSlotText ? 'rgba(201,168,76,0.52)' : 'rgba(80,60,40,0.3)'
  const emptyPrimaryColor = useHighContrastSlotText ? brand.colors.gold : ln.emptyColor
  const overflowPrimaryColor = useHighContrastSlotText ? brand.colors.gold : brand.colors.ink
  const overflowSecondaryColor = useHighContrastSlotText ? 'rgba(201,168,76,0.82)' : brand.colors.muted

  const inPreview = onReorder !== undefined
    && draggedIndex !== null
    && dragOverIndex !== null
    && draggedIndex !== dragOverIndex

  const previewVisibleItems = useMemo(() => {
    if (!inPreview) return overflow.visibleItems
    const arr = [...overflow.visibleItems]
    ;[arr[draggedIndex!], arr[dragOverIndex!]] = [arr[dragOverIndex!], arr[draggedIndex!]]
    return arr
  }, [inPreview, draggedIndex, dragOverIndex, overflow.visibleItems])

  const slots = Array.from({ length: sc.n }, (_, i) => {
    if (overflow.hasOverflow && i === sc.n - 1) {
      return { type: 'overflow' as const }
    }
    const watch = previewVisibleItems[i] ?? null
    return watch ? { type: 'watch' as const, watch, originalIndex: i } : { type: 'empty' as const }
  })

  const overflowSlotActive = overflow.hasOverflow && activeSlot !== null && activeSlot >= overflow.visibleItems.length
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
        style={{
          borderRadius: 10,
          padding: '22px 22px 24px',
          background: fr.css,
          boxShadow: fr.shadow,
          position: 'relative',
        }}
      >
        <div
          style={{
            background: ln.color,
            borderRadius: 5,
            padding: 10,
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
              gap: 6,
            }}
          >
            {slots.map((slot, i) => {
              const isActive = activeSlot === i || (slot.type === 'overflow' && overflowSlotActive)

              if (slot.type === 'empty') {
                return (
                  <div key={i} style={{ aspectRatio: '3/4', borderRadius: 3, position: 'relative' }}>
                    <div
                      onClick={readonly ? undefined : onEmptySlotClick}
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: 3,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 5,
                        cursor: readonly ? 'default' : 'pointer',
                        opacity: useHighContrastSlotText ? 0.88 : 0.4,
                        background: ln.slotBg,
                      }}
                    >
                      {readonly ? (
                        <span style={{ fontFamily: brand.font.sans, fontSize: 8, letterSpacing: '0.1em', color: emptyPrimaryColor }}>
                          EMPTY
                        </span>
                      ) : (
                        <>
                          <span style={{ fontSize: 18, color: emptyPrimaryColor }}>+</span>
                          <span style={{ fontFamily: brand.font.sans, fontSize: 8, letterSpacing: '0.1em', color: emptyPrimaryColor }}>ADD</span>
                        </>
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

              return (
                <div
                  key={i}
                  data-slot-index={i}
                  draggable={onReorder !== undefined && !isTouchDevice}
                  onClick={() => onSlotClick(slot.originalIndex)}
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
                  onDragOver={onReorder ? e => {
                    e.preventDefault()
                    setDragOverIndex(i)
                  } : undefined}
                  onDragEnter={onReorder ? () => { dragCounter.current++ } : undefined}
                  onDragLeave={onReorder ? () => {
                    dragCounter.current--
                    if (dragCounter.current === 0) setDragOverIndex(null)
                  } : undefined}
                  onDrop={onReorder ? () => {
                    if (draggedIndex !== null && draggedIndex !== i) onReorder(draggedIndex, i)
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
                    aspectRatio: '3/4',
                    borderRadius: 3,
                    position: 'relative',
                    cursor: 'pointer',
                    overflow: 'visible',
                    opacity: isBeingDragged ? 0.5 : isSourceInPreview ? 0.4 : 1,
                    transform: 'translateY(0)',
                    transition: 'transform 0.18s ease, opacity 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    if (draggedIndex !== null) return
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    if (onReorder !== undefined) setHoveredSlot(i)
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    if (onReorder !== undefined) setHoveredSlot(null)
                  }}
                >
                  {onReorder !== undefined && (isTouchDevice || hoveredSlot === i) && !isBeingDragged && (
                    <div
                      style={{
                        position: 'absolute',
                        right: isTouchDevice ? -8 : 7,
                        top: isTouchDevice ? '66%' : 'auto',
                        bottom: isTouchDevice ? 'auto' : 7,
                        transform: isTouchDevice ? 'translateY(-50%)' : 'none',
                        zIndex: 10,
                        cursor: isTouchDevice ? 'default' : isBeingDragged ? 'grabbing' : 'grab',
                        padding: isTouchDevice ? '9px 2px 9px 11px' : 0,
                        touchAction: 'none',
                        pointerEvents: isTouchDevice ? 'auto' : 'none',
                      }}
                      onPointerDown={isTouchDevice ? (e: ReactPointerEvent) => {
                        e.stopPropagation()
                        e.preventDefault()
                        touchDragging.current = true
                        setDraggedIndex(i)

                        slotRectsRef.current = Array.from(
                          document.querySelectorAll('[data-slot-index]')
                        ).map(el => ({
                          rect: (el as HTMLElement).getBoundingClientRect(),
                          index: Number((el as HTMLElement).dataset.slotIndex),
                        }))

                        const slotEl = (e.currentTarget as HTMLElement).closest('[data-slot-index]') as HTMLElement
                        const clone = slotEl.cloneNode(true) as HTMLDivElement
                        clone.style.cssText += `;position:fixed;pointer-events:none;z-index:9999;width:${slotEl.offsetWidth}px;height:${slotEl.offsetHeight}px;border:1.5px solid rgba(201,168,76,0.9);box-shadow:0 0 0 1px rgba(201,168,76,0.4),0 12px 32px rgba(201,168,76,0.25);border-radius:3px;opacity:0.92;transform:scale(1.04);left:${e.clientX - slotEl.offsetWidth / 2}px;top:${e.clientY - slotEl.offsetHeight * 1.15}px`
                        document.body.appendChild(clone)
                        touchGhostRef.current = clone

                        function onMove(ev: PointerEvent) {
                          if (!touchGhostRef.current) return
                          touchGhostRef.current.style.left = `${ev.clientX - slotEl.offsetWidth / 2}px`
                          touchGhostRef.current.style.top = `${ev.clientY - slotEl.offsetHeight * 1.15}px`
                          const hit = slotRectsRef.current.find(({ rect }) =>
                            ev.clientX >= rect.left && ev.clientX <= rect.right &&
                            ev.clientY >= rect.top && ev.clientY <= rect.bottom
                          )
                          setDragOverIndex(hit ? hit.index : null)
                        }

                        function onUp(ev: PointerEvent) {
                          document.removeEventListener('pointermove', onMove)
                          document.removeEventListener('pointerup', onUp)
                          document.removeEventListener('pointercancel', onUp)
                          touchGhostRef.current?.remove()
                          touchGhostRef.current = null
                          touchDragging.current = false
                          const hit = slotRectsRef.current.find(({ rect }) =>
                            ev.clientX >= rect.left && ev.clientX <= rect.right &&
                            ev.clientY >= rect.top && ev.clientY <= rect.bottom
                          )
                          if (hit && hit.index !== i) onReorder!(i, hit.index)
                          setDraggedIndex(null)
                          setDragOverIndex(null)
                        }

                        document.addEventListener('pointermove', onMove)
                        document.addEventListener('pointerup', onUp)
                        document.addEventListener('pointercancel', onUp)
                      } : undefined}
                    >
                      {isTouchDevice ? (
                        <div style={{
                          width: 7,
                          height: 21,
                          borderRadius: '2px 4px 4px 2px',
                          background: 'rgba(201,168,76,0.12)',
                          border: '1px solid rgba(201,168,76,0.22)',
                          boxShadow: '0.5px 1px 2px rgba(0,0,0,0.1)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 2,
                        }}>
                          {[0, 1, 2].map(d => (
                            <div key={d} style={{ width: 3, height: 1, borderRadius: 1, background: 'rgba(201,168,76,0.42)' }} />
                          ))}
                        </div>
                      ) : (
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
                      )}
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
                      border: (isActive || isDragTarget || isDestInPreview)
                        ? '1.5px solid rgba(201,168,76,0.8)'
                        : isSourceInPreview
                        ? '1.5px dashed rgba(201,168,76,0.6)'
                        : '1.5px solid transparent',
                      boxShadow: (isActive || isDragTarget || isDestInPreview)
                        ? 'inset 0 1px 4px rgba(0,0,0,0.12), 0 0 0 1px rgba(201,168,76,0.4), 0 3px 14px rgba(201,168,76,0.16)'
                        : 'inset 0 1px 4px rgba(0,0,0,0.12)',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
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
                    {mode === 'playground' ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <DialSVG
                          dialColor={w.dialConfig.dialColor}
                          markerColor={w.dialConfig.markerColor}
                          handColor={w.dialConfig.handColor}
                          size={Math.round((slotWidth ?? 90) * 0.58)}
                        />
                      </div>
                    ) : (
                      <Image
                        src={w.imageUrl}
                        alt={w.model}
                        fill
                        sizes="(max-width: 768px) 20vw, 10vw"
                        style={{ objectFit: 'cover', objectPosition: 'center 45%' }}
                      />
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
              )
            })}
          </div>

          {overflow.hasOverflow && (
            <>
              <div
                className="watchbox-overflow-flyout"
                style={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  width: 260,
                  maxHeight: 320,
                  overflowY: 'auto',
                  background: brand.colors.white,
                  border: `1px solid ${brand.colors.borderMid}`,
                  borderRadius: brand.radius.lg,
                  boxShadow: '0 16px 40px rgba(26,20,16,0.16)',
                  opacity: overflowOpen ? 1 : 0,
                  transform: overflowOpen ? 'translateY(0)' : 'translateY(-6px)',
                  pointerEvents: overflowOpen ? 'auto' : 'none',
                  transition: 'opacity 0.18s ease, transform 0.18s ease',
                  zIndex: 191,
                }}
              >
                <div
                  style={{
                    padding: '12px 12px 10px',
                    borderBottom: '1px solid #F0EBE3',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontFamily: brand.font.sans,
                        fontSize: 9,
                        fontWeight: 600,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: brand.colors.muted,
                        marginBottom: 2,
                      }}
                    >
                      Hidden Watches
                    </div>
                    <div style={{ fontFamily: brand.font.sans, fontSize: 11, color: brand.colors.ink }}>
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
                      fontSize: 16,
                      lineHeight: 1,
                      padding: 4,
                    }}
                  >
                    ✕
                  </button>
                </div>
                <div>
                  {overflow.hiddenItems.map(({ item, index }) => (
                    <OverflowListItem
                      key={item.id}
                      watch={item}
                      mode={mode}
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
    </>
  )
}
