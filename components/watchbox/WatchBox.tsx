'use client'

import { useState } from 'react'
import type { Watch, WatchCondition } from '@/types/watch'
import { watches } from '@/lib/watches'
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
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null)
  const [activeSidebar, setActiveSidebar] = useState<number | null>(null)

  const activeWatch: Watch | null =
    activeSidebar !== null ? (watches[activeSidebar] ?? null) : null

  function handleSlotClick(index: number) {
    setActiveSidebar((prev) => (prev === index ? null : index))
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
            const watch = watches[i]
            const isFilled = watch !== undefined
            const isActive = activeSidebar === i
            const isHovered = hoveredSlot === i

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
                className="relative rounded-lg cursor-pointer select-none"
                style={{
                  aspectRatio: '3/4',
                  backgroundColor: '#FFFCF7',
                  border:
                    isActive || isHovered
                      ? '1.5px solid #C9A84C'
                      : '1.5px solid #E0DAD0',
                  boxShadow:
                    isActive
                      ? '0 4px 20px rgba(201,168,76,0.22)'
                      : isHovered
                      ? '0 4px 16px rgba(201,168,76,0.16)'
                      : '0 1px 4px rgba(26,20,16,0.05)',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={() => setHoveredSlot(i)}
                onMouseLeave={() => setHoveredSlot(null)}
                onClick={() => handleSlotClick(i)}
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
