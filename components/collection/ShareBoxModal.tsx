'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { brand } from '@/lib/brand'

interface ShareWatch {
  id: string
  brand: string
  model: string
  imageUrl?: string | null
  estimatedValue?: number
}

export interface ShareFlags {
  showCount: boolean
  showValue: boolean
  showBrands: boolean
}

interface Props {
  open: boolean
  onClose: () => void
  watches: ShareWatch[]
  totalValue: number
  handle: string
  shareUrl: string
  title?: string
  slotCount?: number
  source?: 'collection' | 'playground'
  buildShareUrl?: (flags: ShareFlags) => string
}

const SLOT_LAYOUTS: Record<number, { cols: number; rows: number }> = {
  4: { cols: 2, rows: 2 },
  6: { cols: 3, rows: 2 },
  8: { cols: 4, rows: 2 },
  10: { cols: 5, rows: 2 },
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

const SUCCESS_GREEN = '#2D6A2D'
const SUCCESS_BG = '#E8F4E8'

const microLabel: React.CSSProperties = {
  fontFamily: brand.font.sans,
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: brand.colors.muted,
}

export default function ShareBoxModal({
  open,
  onClose,
  watches,
  totalValue,
  handle,
  shareUrl,
  title,
  slotCount = 6,
  source = 'collection',
  buildShareUrl,
}: Props) {
  const [copied, setCopied] = useState(false)
  const [flags, setFlags] = useState<ShareFlags>({ showCount: true, showValue: true, showBrands: true })

  const brandCount = useMemo(
    () => new Set(watches.map(w => w.brand).filter(Boolean)).size,
    [watches],
  )

  const effectiveShareUrl = buildShareUrl ? buildShareUrl(flags) : shareUrl

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  async function copy() {
    try {
      await navigator.clipboard.writeText(effectiveShareUrl)
    } catch {
      /* noop — graceful */
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const text = encodeURIComponent(`My Virtual Watchbox — ${watches.length} watches.`)
  const enc = encodeURIComponent(effectiveShareUrl)

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'rgba(26,20,16,0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{
          background: brand.colors.slot,
          border: `1px solid ${brand.colors.border}`,
          borderRadius: 14,
          width: '100%',
          maxWidth: 620,
          boxShadow: '0 24px 60px rgba(26,20,16,0.32)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 22px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: `1px solid ${brand.colors.border}`,
          }}
        >
          <div>
            <div style={{ ...microLabel, marginBottom: 4 }}>Share</div>
            <h3
              style={{
                fontFamily: brand.font.serif,
                fontSize: 22,
                fontWeight: 400,
                color: brand.colors.ink,
                margin: 0,
                lineHeight: 1.1,
              }}
            >
              {title ? title : (
                <>
                  Your Public <em style={{ fontStyle: 'italic' }}>Watchbox.</em>
                </>
              )}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: brand.colors.muted,
              display: 'inline-flex',
              padding: 6,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
              <line x1="3.5" y1="3.5" x2="10.5" y2="10.5" />
              <line x1="10.5" y1="3.5" x2="3.5" y2="10.5" />
            </svg>
          </button>
        </div>

        {/* OG preview */}
        <div style={{ padding: '22px 22px 14px' }}>
          <div
            style={{
              ...microLabel,
              marginBottom: 10,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>Preview · 1200 × 630</span>
            <span style={{ color: brand.colors.goldDeep }}>Auto-generated</span>
          </div>
          <OGPreview
            watches={watches}
            handle={handle}
            totalValue={totalValue}
            brandCount={brandCount}
            flags={flags}
            slotCount={slotCount}
            source={source}
            boxTitle={title}
          />
        </div>

        {/* Show toggles */}
        <div style={{ padding: '0 22px 14px' }}>
          <div style={{ ...microLabel, marginBottom: 8 }}>Show on preview</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <ToggleChip
              label="Watch count"
              active={flags.showCount}
              onClick={() => setFlags(f => ({ ...f, showCount: !f.showCount }))}
            />
            <ToggleChip
              label="Brand count"
              active={flags.showBrands}
              onClick={() => setFlags(f => ({ ...f, showBrands: !f.showBrands }))}
            />
            <ToggleChip
              label="Total value"
              active={flags.showValue}
              onClick={() => setFlags(f => ({ ...f, showValue: !f.showValue }))}
            />
          </div>
        </div>

        {/* URL row */}
        <div style={{ padding: '0 22px 14px' }}>
          <div style={{ ...microLabel, marginBottom: 8 }}>Public Profile Link</div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: brand.colors.bg,
              border: `1px solid ${brand.colors.border}`,
              borderRadius: brand.radius.sm,
              padding: '8px 8px 8px 14px',
            }}
          >
            <span
              style={{
                flex: 1,
                fontFamily: brand.font.sans,
                fontSize: 14,
                color: brand.colors.ink,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {effectiveShareUrl}
            </span>
            <button
              onClick={copy}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontFamily: brand.font.sans,
                fontSize: 12,
                fontWeight: 500,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding: '7px 12px',
                background: copied ? SUCCESS_BG : brand.colors.ink,
                color: copied ? SUCCESS_GREEN : brand.colors.bg,
                border: 'none',
                borderRadius: brand.radius.btn,
                cursor: 'pointer',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {copied ? (
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="3,7.5 6,10.5 11,4" />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="4" y="4" width="8" height="8" rx="1.2" />
                  <path d="M2 9V3a1 1 0 011-1h6" />
                </svg>
              )}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Share targets */}
        <div style={{ padding: '0 22px 22px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <ShareTargetBtn
            label="X"
            ariaLabel="Share on X"
            onClick={() => window.open(`https://twitter.com/intent/tweet?text=${text}&url=${enc}`, '_blank', 'noopener')}
            icon={<XIcon />}
          />
          <ShareTargetBtn
            label="Threads"
            ariaLabel="Share on Threads"
            onClick={() => window.open(`https://www.threads.net/intent/post?text=${text}%20${enc}`, '_blank', 'noopener')}
            icon={<ThreadsIcon />}
          />
          <ShareTargetBtn
            label="Instagram"
            ariaLabel="Copy link for Instagram"
            onClick={async () => {
              try { await navigator.clipboard.writeText(effectiveShareUrl) } catch { /* noop */ }
              setCopied(true)
              setTimeout(() => setCopied(false), 1800)
              window.open('https://www.instagram.com/', '_blank', 'noopener')
            }}
            icon={<InstagramIcon />}
          />
          <ShareTargetBtn
            label="Email"
            ariaLabel="Share via Email"
            onClick={() => window.open(`mailto:?subject=${text}&body=${enc}`, '_self')}
            icon={<EmailIcon />}
          />
          <ShareTargetBtn
            label="Download"
            ariaLabel="Download OG image"
            onClick={() => alert('Download will export the rendered 1200×630 OG image (coming soon).')}
            icon={<DownloadIcon />}
          />
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '10px 22px',
            borderTop: `1px solid ${brand.colors.border}`,
            background: brand.colors.bg,
            fontFamily: brand.font.sans,
            fontSize: 12,
            color: brand.colors.muted,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <span>Shared links open your public profile.</span>
          <a
            href="/settings"
            style={{ color: brand.colors.goldDeep, textDecoration: 'none', fontWeight: 500 }}
          >
            Profile settings →
          </a>
        </div>
      </div>
    </div>
  )
}

function ToggleChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      type="button"
      aria-pressed={active}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontFamily: brand.font.sans,
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: '0.04em',
        padding: '7px 12px',
        background: active ? brand.colors.goldWash : 'transparent',
        color: active ? brand.colors.ink : brand.colors.muted,
        border: `1px solid ${active ? brand.colors.goldLine : brand.colors.borderLight}`,
        borderRadius: brand.radius.pill,
        cursor: 'pointer',
        transition: 'background 0.12s, border-color 0.12s, color 0.12s',
      }}
    >
      <span
        aria-hidden
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 14,
          height: 14,
          borderRadius: 3,
          border: `1px solid ${active ? brand.colors.gold : brand.colors.borderLight}`,
          background: active ? brand.colors.gold : 'transparent',
          color: brand.colors.white,
        }}
      >
        {active ? (
          <svg width="9" height="9" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3,7.5 6,10.5 11,4" />
          </svg>
        ) : null}
      </span>
      {label}
    </button>
  )
}

function ShareTargetBtn({
  label,
  ariaLabel,
  onClick,
  icon,
}: {
  label: string
  ariaLabel: string
  onClick: () => void
  icon: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={ariaLabel}
      aria-label={ariaLabel}
      style={{
        flex: 1,
        minWidth: 92,
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        fontFamily: brand.font.sans,
        fontSize: 12,
        fontWeight: 500,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        padding: '14px 10px 12px',
        background: 'transparent',
        color: brand.colors.ink,
        border: `1px solid ${brand.colors.borderLight}`,
        borderRadius: brand.radius.btn,
        cursor: 'pointer',
        transition: 'background 0.12s, border-color 0.12s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = brand.colors.bg
        e.currentTarget.style.borderColor = brand.colors.borderMid
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.borderColor = brand.colors.borderLight
      }}
    >
      <span aria-hidden style={{ display: 'inline-flex', color: brand.colors.ink }}>{icon}</span>
      {label}
    </button>
  )
}

function XIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function ThreadsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 21c5 0 8-3 8-8s-3-8-8-8-8 3-8 8 2 6 5 7" />
      <path d="M9.5 14c0 1.5 1.2 2.5 3 2.5 2.5 0 4-1.6 4-4 0-2.6-2-4-4.6-4-2 0-3.5.9-4 2" />
      <path d="M12 8.5c2.4 0 4 1.2 4.5 3" />
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  )
}

function EmailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3.5 6.5l8.5 6.5 8.5-6.5" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 4v12" />
      <path d="M7 11l5 5 5-5" />
      <path d="M5 20h14" />
    </svg>
  )
}

// These constants mirror app/api/og/box/[slug]/route.tsx exactly so the modal
// preview is a pixel-perfect scale-down of the rendered OG image.
const OG_W = 1200
const OG_H = 630
const OG_LEFT_W = Math.round(OG_W * 0.34)

function autoTitleSizePx(text: string) {
  const len = text.length
  if (len >= 22) return 30
  if (len >= 18) return 36
  if (len >= 15) return 42
  if (len >= 12) return 52
  if (len >= 9) return 62
  return 72
}

function clampTitleText(text: string, max: number) {
  if (text.length <= max) return text
  return text.slice(0, Math.max(0, max - 1)).trimEnd() + '…'
}

function computeWatchboxSize(cols: number, rows: number) {
  const maxBoxW = OG_W - OG_LEFT_W - 88
  const maxBoxH = OG_H - 48
  const innerPad = 22
  const gap = 14
  const cellAspect = 3 / 4
  const cellWFromW = (maxBoxW - innerPad * 2 - gap * (cols - 1)) / cols
  const cellHFromW = cellWFromW / cellAspect
  const totalHFromW = cellHFromW * rows + gap * (rows - 1) + innerPad * 2
  const cellHFromH = (maxBoxH - innerPad * 2 - gap * (rows - 1)) / rows
  const cellWFromH = cellHFromH * cellAspect
  const cellW = totalHFromW <= maxBoxH ? cellWFromW : cellWFromH
  const cellH = cellW / cellAspect
  return {
    cellW,
    cellH,
    innerPad,
    gap,
    boxW: cellW * cols + gap * (cols - 1) + innerPad * 2,
    boxH: cellH * rows + gap * (rows - 1) + innerPad * 2,
  }
}

function OGPreview({
  watches,
  handle,
  totalValue,
  brandCount,
  flags,
  slotCount,
  source,
  boxTitle,
}: {
  watches: ShareWatch[]
  handle: string
  totalValue: number
  brandCount: number
  flags: ShareFlags
  slotCount: number
  source: 'collection' | 'playground'
  boxTitle?: string
}) {
  const isPlayground = source === 'playground'
  const layout = SLOT_LAYOUTS[slotCount] ?? SLOT_LAYOUTS[6]
  const visible = watches.slice(0, slotCount)
  const safeHandle = clampTitleText(handle, 18)
  const safeBoxTitle = clampTitleText(boxTitle || 'Dream Box', 24)
  const titleSize = isPlayground ? autoTitleSizePx(safeBoxTitle) : autoTitleSizePx(`${safeHandle}'s`)
  const wbSize = computeWatchboxSize(layout.cols, layout.rows)

  const muted: React.CSSProperties = {
    fontFamily: brand.font.sans,
    fontSize: 24,
    fontWeight: 500,
    letterSpacing: '0.24em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.7)',
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: `${OG_W} / ${OG_H}`,
        borderRadius: 10,
        overflow: 'hidden',
        background: 'linear-gradient(160deg, #1e1b16 0%, #2a2420 100%)',
        border: '1px solid #2A2520',
        containerType: 'inline-size',
      }}
    >
      {/* Inner stage at fixed OG dimensions, scaled to the container width.
          Matches /api/og/box/[slug] exactly so preview ≡ rendered image. */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: OG_W,
          height: OG_H,
          transformOrigin: 'top left',
          transform: `scale(calc(100cqi / ${OG_W}px))`,
          display: 'flex',
        }}
      >
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse 60% 55% at 30% 50%, rgba(201,168,76,0.12) 0%, transparent 70%)',
          }}
        />

        {/* Left column */}
        <div
          style={{
            width: OG_LEFT_W,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '46px 32px 46px 44px',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                fontFamily: brand.font.sans,
                fontSize: 26,
                fontWeight: 700,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: brand.colors.gold,
                lineHeight: 1.1,
                marginBottom: 28,
                display: 'flex',
                flexWrap: 'wrap',
                maxWidth: '100%',
              }}
            >
              {isPlayground ? 'Dream Box' : 'Virtual Watchbox'}
            </div>
            {isPlayground ? (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div
                  style={{
                    fontFamily: brand.font.serif,
                    fontStyle: 'italic',
                    fontSize: titleSize,
                    color: brand.colors.bg,
                    fontWeight: 400,
                    lineHeight: 1.05,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {safeBoxTitle}
                </div>
                <div
                  style={{
                    fontFamily: brand.font.sans,
                    fontSize: 22,
                    fontWeight: 500,
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.6)',
                    marginTop: 18,
                  }}
                >
                  {safeHandle}&apos;s Playground
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div
                  style={{
                    fontFamily: brand.font.serif,
                    fontSize: titleSize,
                    color: brand.colors.bg,
                    fontWeight: 400,
                    lineHeight: 1.05,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {safeHandle}&apos;s
                </div>
                <div
                  style={{
                    fontFamily: brand.font.serif,
                    fontStyle: 'italic',
                    fontSize: titleSize,
                    color: brand.colors.bg,
                    fontWeight: 300,
                    lineHeight: 1.05,
                  }}
                >
                  Watchbox.
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {flags.showCount ? (
              <div style={muted}>
                {watches.length === 1 ? '1 Watch' : `${watches.length} Watches`}
              </div>
            ) : null}
            {flags.showBrands ? (
              <div style={muted}>
                {brandCount === 1 ? '1 Brand' : `${brandCount} Brands`}
              </div>
            ) : null}
            {flags.showValue ? (
              <div style={{ display: 'flex', flexDirection: 'column', marginTop: flags.showCount || flags.showBrands ? 12 : 0 }}>
                <div style={{ ...muted, marginBottom: 10 }}>Est.</div>
                <div
                  style={{
                    fontFamily: brand.font.serif,
                    fontSize: 64,
                    fontWeight: 500,
                    color: brand.colors.gold,
                    lineHeight: 1,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {fmt(totalValue)}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Right column: the watchbox at exact OG dimensions */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px 44px 24px 0',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div
            style={{
              width: wbSize.boxW,
              height: wbSize.boxH,
              background: 'linear-gradient(180deg, #C9A04C 0%, #B58836 100%)',
              border: '1px solid #A87A2E',
              borderRadius: 8,
              padding: wbSize.innerPad,
              display: 'flex',
              flexDirection: 'column',
              gap: wbSize.gap,
              boxShadow: '0 8px 28px rgba(0,0,0,0.4)',
            }}
          >
            {Array.from({ length: layout.rows }).map((_, row) => (
              <div key={row} style={{ display: 'flex', gap: wbSize.gap, height: wbSize.cellH }}>
                {Array.from({ length: layout.cols }).map((__, col) => {
                  const idx = row * layout.cols + col
                  const w = visible[idx]
                  return (
                    <div
                      key={col}
                      style={{
                        width: wbSize.cellW,
                        height: wbSize.cellH,
                        borderRadius: 5,
                        background: w ? brand.colors.slot : '#F5EFE5',
                        border: w ? '1px solid #E0DAD0' : '2px dashed #D0C9BE',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        position: 'relative',
                      }}
                    >
                      {w && w.imageUrl ? (
                        <Image
                          src={w.imageUrl}
                          alt=""
                          fill
                          sizes="200px"
                          style={{ objectFit: 'contain', padding: '8%' }}
                        />
                      ) : null}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
