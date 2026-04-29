'use client'

import { useEffect, useRef, useState } from 'react'
import type { Watch, WatchCondition } from '@/types/watch'
import { watches } from '@/lib/watches'
import { brand } from '@/lib/brand'
import DialSVG from './DialSVG'

const TOTAL_SLOTS = 6

const conditionColors: Record<WatchCondition, { bg: string; text: string }> = {
  Unworn: { bg: '#E8F4E8', text: '#2D6A2D' },
  'Like New': { bg: '#EDF4E8', text: '#3A6A2D' },
  Excellent: { bg: '#FFF8E6', text: '#8A6A10' },
  Good: { bg: '#FDF0E0', text: '#8A5010' },
  Fair: { bg: '#FAE8E8', text: '#8A2020' },
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}

interface Props {
  onEmptySlotClick?: () => void
}

export default function WatchBox({ onEmptySlotClick }: Props) {
  const [watchOrder, setWatchOrder] = useState(() => watches.slice(0, TOTAL_SLOTS))
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null)
  const [activeSidebar, setActiveSidebar] = useState<number | null>(null)
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

  const activeWatch: Watch | null =
    activeSidebar !== null ? (watchOrder[activeSidebar] ?? null) : null

  function handleSlotClick(index: number) {
    setActiveSidebar((prev) => (prev === index ? null : index))
  }

  function handleReorder(from: number, to: number) {
    setWatchOrder(prev => {
      const arr = [...prev]
      ;[arr[from], arr[to]] = [arr[to], arr[from]]
      return arr
    })
    if (activeSidebar === from) setActiveSidebar(to)
    else if (activeSidebar === to) setActiveSidebar(from)
  }

  return (
    <>
      {/* Grid */}
      <div
        className="rounded-xl p-3"
        style={{ backgroundColor: '#EDE9E2', border: '1px solid #E0DAD0' }}
      >
        <div className="grid grid-cols-3 gap-2.5">
          {Array.from({ length: TOTAL_SLOTS }, (_, i) => {
            const watch = watchOrder[i]
            const isFilled = watch !== undefined
            const isActive = activeSidebar === i
            const isHovered = hoveredSlot === i
            const isBeingDragged = draggedIndex === i
            const isDragTarget = dragOverIndex === i && draggedIndex !== i

            if (!isFilled) {
              return (
                <div
                  key={i}
                  className="flex flex-col items-center justify-center rounded-lg cursor-pointer select-none"
                  onClick={onEmptySlotClick}
                  style={{
                    aspectRatio: '3/4',
                    border: '1.5px dashed #D0C9BE',
                    backgroundColor: '#FFFCF7',
                    color: '#A89880',
                    gap: '6px',
                  }}
                >
                  <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>+</span>
                  <span
                    className="font-sans"
                    style={{ fontSize: '0.6rem', letterSpacing: '0.08em' }}
                  >
                    ADD WATCH
                  </span>
                </div>
              )
            }

            return (
              <div
                key={i}
                data-slot-index={i}
                draggable={!isTouchDevice}
                className="relative rounded-lg select-none"
                style={{
                  aspectRatio: '3/4',
                  backgroundColor: '#FFFCF7',
                  cursor: 'pointer',
                  opacity: isBeingDragged ? 0.5 : 1,
                  border:
                    isActive || isHovered || isDragTarget
                      ? '1.5px solid #C9A84C'
                      : '1.5px solid #E0DAD0',
                  boxShadow:
                    isActive || isDragTarget
                      ? '0 4px 20px rgba(201,168,76,0.22)'
                      : isHovered
                      ? '0 4px 16px rgba(201,168,76,0.16)'
                      : '0 1px 4px rgba(26,20,16,0.05)',
                  transition: 'border-color 0.15s, box-shadow 0.15s, opacity 0.15s',
                }}
                onMouseEnter={() => { if (draggedIndex === null) setHoveredSlot(i) }}
                onMouseLeave={() => setHoveredSlot(null)}
                onClick={() => handleSlotClick(i)}
                onDragStart={(e: React.DragEvent<HTMLDivElement>) => {
                  dragCounter.current = 0
                  setDraggedIndex(i)
                  const el = e.currentTarget as HTMLElement
                  const clone = el.cloneNode(true) as HTMLDivElement
                  clone.style.cssText += `;position:absolute;top:-9999px;left:-9999px;width:${el.offsetWidth}px;height:${el.offsetHeight}px;border:1.5px solid rgba(201,168,76,0.8);box-shadow:0 0 0 1px rgba(201,168,76,0.4),0 8px 24px rgba(201,168,76,0.2);opacity:1;border-radius:3px;pointer-events:none`
                  document.body.appendChild(clone)
                  ghostRef.current = clone
                  e.dataTransfer.setDragImage(clone, e.nativeEvent.offsetX, e.nativeEvent.offsetY)
                }}
                onDragOver={e => { e.preventDefault(); setDragOverIndex(i) }}
                onDragEnter={() => { dragCounter.current++ }}
                onDragLeave={() => { dragCounter.current--; if (dragCounter.current === 0) setDragOverIndex(null) }}
                onDrop={() => {
                  if (draggedIndex !== null && draggedIndex !== i) handleReorder(draggedIndex, i)
                  setDraggedIndex(null)
                  setDragOverIndex(null)
                }}
                onDragEnd={() => {
                  ghostRef.current?.remove()
                  ghostRef.current = null
                  setDraggedIndex(null)
                  setDragOverIndex(null)
                }}
              >
                {/* Slot number */}
                <span
                  className="absolute font-sans"
                  style={{
                    top: '8px',
                    left: '10px',
                    fontSize: '0.58rem',
                    color: '#A89880',
                    letterSpacing: '0.05em',
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>

                {/* Dial — centered */}
                <div className="flex items-center justify-center h-full">
                  <DialSVG
                    dialColor={watch.dialConfig.dialColor}
                    markerColor={watch.dialConfig.markerColor}
                    handColor={watch.dialConfig.handColor}
                    size={80}
                  />
                </div>

                {(isTouchDevice || isHovered) && !isBeingDragged && (
                  <div
                    style={{
                      position: 'absolute',
                      right: -8,
                      top: '66%',
                      transform: 'translateY(-50%)',
                      zIndex: 10,
                      cursor: isTouchDevice ? 'default' : 'grab',
                      padding: '9px 2px 9px 11px',
                      touchAction: 'none',
                    }}
                    onPointerDown={isTouchDevice ? (e: React.PointerEvent) => {
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
                        if (hit && hit.index !== i) handleReorder(i, hit.index)
                        setDraggedIndex(null)
                        setDragOverIndex(null)
                      }

                      document.addEventListener('pointermove', onMove)
                      document.addEventListener('pointerup', onUp)
                      document.addEventListener('pointercancel', onUp)
                    } : undefined}
                  >
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
                  </div>
                )}

                {/* Hover card — floats above slot, pointer-events-none prevents flicker */}
                {isHovered && (
                  <div
                    className="absolute left-0 right-0 pointer-events-none"
                    style={{ bottom: 'calc(100% + 8px)', zIndex: 20 }}
                  >
                    <div
                      className="rounded-lg p-3"
                      style={{
                        backgroundColor: '#FFFCF7',
                        border: '1px solid #E8E2D8',
                        boxShadow: '0 8px 24px rgba(26,20,16,0.13)',
                      }}
                    >
                      <p
                        className="font-sans"
                        style={{
                          fontSize: '0.6rem',
                          color: '#A89880',
                          letterSpacing: '0.08em',
                          marginBottom: '3px',
                        }}
                      >
                        {watch.brand.toUpperCase()}
                      </p>
                      <p
                        className="font-serif"
                        style={{
                          fontSize: '0.9rem',
                          color: '#1A1410',
                          fontWeight: 500,
                          lineHeight: 1.2,
                          marginBottom: '3px',
                        }}
                      >
                        {watch.model}
                      </p>
                      <p
                        className="font-sans"
                        style={{
                          fontSize: '0.65rem',
                          color: '#A89880',
                          marginBottom: '8px',
                        }}
                      >
                        Ref. {watch.reference}
                      </p>
                      <div
                        className="flex justify-between items-center"
                        style={{
                          borderTop: '1px solid #E8E2D8',
                          paddingTop: '7px',
                        }}
                      >
                        <span
                          className="font-sans"
                          style={{ fontSize: '0.62rem', color: '#A89880' }}
                        >
                          {watch.caseSizeMm}mm
                        </span>
                        <span
                          className="font-sans"
                          style={{
                            fontSize: '0.72rem',
                            color: '#C9A84C',
                            fontWeight: 600,
                          }}
                        >
                          {formatCurrency(watch.estimatedValue)}
                        </span>
                      </div>
                      <p
                        className="font-sans"
                        style={{
                          fontSize: '0.58rem',
                          color: '#A89880',
                          marginTop: '5px',
                          textAlign: 'right',
                        }}
                      >
                        Click to expand ↗
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Backdrop */}
      {activeSidebar !== null && (
        <div
          className="fixed inset-0"
          style={{ zIndex: 30, backgroundColor: 'rgba(26,20,16,0.18)' }}
          onClick={() => setActiveSidebar(null)}
        />
      )}

      {/* Sidebar */}
      <div
        className="fixed top-0 right-0 h-full font-sans overflow-y-auto"
        style={{
          width: 'min(360px, 100vw)',
          zIndex: 40,
          backgroundColor: '#FFFCF7',
          borderLeft: '1px solid #E8E2D8',
          transform:
            activeSidebar !== null ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '-8px 0 32px rgba(26,20,16,0.09)',
        }}
      >
        {activeWatch && (
          <div className="p-6">
            {/* Header */}
            <div
              className="flex justify-between items-center"
              style={{ marginBottom: '24px' }}
            >
              <span
                className="font-sans"
                style={{
                  fontSize: '0.62rem',
                  color: '#A89880',
                  letterSpacing: '0.1em',
                }}
              >
                WATCH DETAIL
              </span>
              <button
                onClick={() => setActiveSidebar(null)}
                aria-label="Close sidebar"
                style={{
                  color: '#A89880',
                  fontSize: '1.1rem',
                  lineHeight: 1,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                ✕
              </button>
            </div>

            {/* Dial */}
            <div
              className="flex justify-center"
              style={{ marginBottom: '24px' }}
            >
              <DialSVG
                dialColor={activeWatch.dialConfig.dialColor}
                markerColor={activeWatch.dialConfig.markerColor}
                handColor={activeWatch.dialConfig.handColor}
                size={140}
              />
            </div>

            {/* Brand / Model / Ref */}
            <p
              className="font-sans"
              style={{
                fontSize: '0.65rem',
                color: '#A89880',
                letterSpacing: '0.1em',
                marginBottom: '4px',
              }}
            >
              {activeWatch.brand.toUpperCase()}
            </p>
            <h3
              className="font-serif"
              style={{
                fontSize: '1.5rem',
                color: '#1A1410',
                fontWeight: 500,
                lineHeight: 1.15,
                marginBottom: '4px',
              }}
            >
              {activeWatch.model}
            </h3>
            <p
              className="font-sans"
              style={{
                fontSize: '0.75rem',
                color: '#A89880',
                marginBottom: '20px',
              }}
            >
              Ref. {activeWatch.reference}
            </p>

            {/* Estimated value */}
            <div
              className="flex justify-between items-center"
              style={{
                padding: '12px 14px',
                backgroundColor: '#FAF8F4',
                borderRadius: '8px',
                border: '1px solid #E8E2D8',
                marginBottom: '20px',
              }}
            >
              <span
                className="font-sans"
                style={{ fontSize: '0.68rem', color: '#A89880' }}
              >
                Est. Market Value
              </span>
              <span
                className="font-sans"
                style={{
                  fontSize: '1.15rem',
                  color: '#C9A84C',
                  fontWeight: 700,
                }}
              >
                {formatCurrency(activeWatch.estimatedValue)}
              </span>
            </div>

            {/* Specs */}
            <div
              style={{
                borderTop: '1px solid #E8E2D8',
                paddingTop: '16px',
                marginBottom: '16px',
              }}
            >
              {(
                [
                  ['Case Size', `${activeWatch.caseSizeMm}mm`],
                  ['Case Material', activeWatch.caseMaterial],
                  ['Dial Color', activeWatch.dialColor],
                  ['Movement', activeWatch.movement],
                  ['Complications', activeWatch.complications.join(', ')],
                ] as [string, string][]
              ).map(([label, value]) => (
                <div
                  key={label}
                  className="flex justify-between"
                  style={{ marginBottom: '12px' }}
                >
                  <span
                    className="font-sans"
                    style={{ fontSize: '0.68rem', color: '#A89880' }}
                  >
                    {label}
                  </span>
                  <span
                    className="font-sans"
                    style={{
                      fontSize: '0.73rem',
                      color: '#1A1410',
                      textAlign: 'right',
                      maxWidth: '55%',
                    }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>

            {/* Condition + Purchase */}
            <div
              style={{
                borderTop: '1px solid #E8E2D8',
                paddingTop: '16px',
                marginBottom: '24px',
              }}
            >
              <div
                className="flex justify-between items-center"
                style={{ marginBottom: '12px' }}
              >
                <span
                  className="font-sans"
                  style={{ fontSize: '0.68rem', color: '#A89880' }}
                >
                  Condition
                </span>
                <span
                  className="font-sans"
                  style={{
                    fontSize: '0.66rem',
                    fontWeight: 600,
                    padding: '3px 9px',
                    borderRadius: '20px',
                    backgroundColor: conditionColors[activeWatch.condition].bg,
                    color: conditionColors[activeWatch.condition].text,
                    letterSpacing: '0.03em',
                  }}
                >
                  {activeWatch.condition}
                </span>
              </div>
              <div
                className="flex justify-between"
                style={{ marginBottom: '12px' }}
              >
                <span
                  className="font-sans"
                  style={{ fontSize: '0.68rem', color: '#A89880' }}
                >
                  Purchased
                </span>
                <span
                  className="font-sans"
                  style={{ fontSize: '0.73rem', color: '#1A1410' }}
                >
                  {new Date(activeWatch.purchaseDate).toLocaleDateString(
                    'en-US',
                    { year: 'numeric', month: 'short' }
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span
                  className="font-sans"
                  style={{ fontSize: '0.68rem', color: '#A89880' }}
                >
                  Price Paid
                </span>
                <span
                  className="font-sans"
                  style={{ fontSize: '0.73rem', color: '#1A1410' }}
                >
                  {formatCurrency(activeWatch.purchasePrice)}
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col" style={{ gap: '8px' }}>
              <button
                className="font-sans"
                style={{
                  width: '100%',
                  padding: '11px',
                  backgroundColor: '#1A1410',
                  color: '#FAF8F4',
                  fontSize: '0.7rem',
                  letterSpacing: '0.07em',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Find For Sale ↗
              </button>
              <button
                className="font-sans"
                style={{
                  width: '100%',
                  padding: '11px',
                  backgroundColor: 'transparent',
                  color: '#1A1410',
                  fontSize: '0.7rem',
                  letterSpacing: '0.07em',
                  borderRadius: '6px',
                  border: '1px solid #E8E2D8',
                  cursor: 'pointer',
                }}
              >
                Sell This Watch
              </button>
              <button
                className="font-sans"
                style={{
                  width: '100%',
                  padding: '11px',
                  backgroundColor: 'transparent',
                  color: '#1A1410',
                  fontSize: '0.7rem',
                  letterSpacing: '0.07em',
                  borderRadius: '6px',
                  border: '1px solid #E8E2D8',
                  cursor: 'pointer',
                }}
              >
                Swap Strap
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
