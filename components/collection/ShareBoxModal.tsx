'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { brand } from '@/lib/brand'

interface ShareWatch {
  id: string
  brand: string
  model: string
  imageUrl?: string | null
  estimatedValue?: number
}

interface Props {
  open: boolean
  onClose: () => void
  watches: ShareWatch[]
  totalValue: number
  handle: string
  shareUrl: string
  title?: string
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

const SUCCESS_GREEN = '#2D6A2D'
const SUCCESS_BG = '#E8F4E8'

const microLabel: React.CSSProperties = {
  fontFamily: brand.font.sans,
  fontSize: 9.5,
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
}: Props) {
  const [copied, setCopied] = useState(false)

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
      await navigator.clipboard.writeText(shareUrl)
    } catch {
      /* noop — graceful */
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const text = encodeURIComponent(`My Virtual Watchbox — ${watches.length} watches.`)
  const enc = encodeURIComponent(shareUrl)

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
            <span style={{ color: brand.colors.gold }}>Auto-generated</span>
          </div>
          <OGPreview watches={watches} handle={handle} totalValue={totalValue} />
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
                fontSize: 12,
                color: brand.colors.ink,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {shareUrl}
            </span>
            <button
              onClick={copy}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontFamily: brand.font.sans,
                fontSize: 10.5,
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
          <SocialBtn
            label="Share on X"
            onClick={() => window.open(`https://twitter.com/intent/tweet?text=${text}&url=${enc}`, '_blank', 'noopener')}
          >
            X / Twitter
          </SocialBtn>
          <SocialBtn
            label="Share on Threads"
            onClick={() => window.open(`https://www.threads.net/intent/post?text=${text}%20${enc}`, '_blank', 'noopener')}
          >
            Threads
          </SocialBtn>
          <SocialBtn
            label="Share via Email"
            onClick={() => window.open(`mailto:?subject=${text}&body=${enc}`, '_self')}
          >
            Email
          </SocialBtn>
          <SocialBtn label="Download OG image" onClick={() => alert('Download will export the rendered 1200×630 OG image (coming soon).')}>
            Download
          </SocialBtn>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '10px 22px',
            borderTop: `1px solid ${brand.colors.border}`,
            background: brand.colors.bg,
            fontFamily: brand.font.sans,
            fontSize: 11,
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
            style={{ color: brand.colors.gold, textDecoration: 'none', fontWeight: 500 }}
          >
            Profile settings →
          </a>
        </div>
      </div>
    </div>
  )
}

function SocialBtn({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      style={{
        flex: 1,
        minWidth: 100,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        fontFamily: brand.font.sans,
        fontSize: 10.5,
        fontWeight: 500,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        padding: '9px 12px',
        background: 'transparent',
        color: brand.colors.ink,
        border: `1px solid ${brand.colors.borderLight}`,
        borderRadius: brand.radius.btn,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}

function OGPreview({
  watches,
  handle,
  totalValue,
}: {
  watches: ShareWatch[]
  handle: string
  totalValue: number
}) {
  const visible = watches.slice(0, 6)
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '1200 / 630',
        borderRadius: 10,
        overflow: 'hidden',
        background: 'linear-gradient(160deg, #1e1b16 0%, #2a2420 100%)',
        border: '1px solid #2A2520',
        display: 'flex',
        containerType: 'inline-size',
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

      {/* Left meta */}
      <div
        style={{
          flex: '0 0 38%',
          padding: '7% 6%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: brand.font.sans,
              fontSize: 'clamp(8px, 1.2cqw, 11px)',
              fontWeight: 500,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'rgba(201,168,76,0.85)',
              marginBottom: 8,
            }}
          >
            Virtual Watchbox
          </div>
          <div
            style={{
              fontFamily: brand.font.serif,
              fontSize: 'clamp(20px, 4cqw, 38px)',
              color: brand.colors.bg,
              fontWeight: 400,
              lineHeight: 1.05,
              letterSpacing: '-0.01em',
            }}
          >
            {handle}&apos;s
          </div>
          <div
            style={{
              fontFamily: brand.font.serif,
              fontStyle: 'italic',
              fontSize: 'clamp(20px, 4cqw, 38px)',
              color: brand.colors.bg,
              fontWeight: 300,
              lineHeight: 1.05,
            }}
          >
            Watchbox.
          </div>
        </div>
        <div>
          <div
            style={{
              fontFamily: brand.font.sans,
              fontSize: 'clamp(7px, 1cqw, 10px)',
              fontWeight: 500,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.45)',
              marginBottom: 4,
            }}
          >
            {watches.length} Watches · Est.
          </div>
          <div
            style={{
              fontFamily: brand.font.sans,
              fontSize: 'clamp(14px, 2.6cqw, 24px)',
              fontWeight: 600,
              color: brand.colors.gold,
              lineHeight: 1,
            }}
          >
            {fmt(totalValue)}
          </div>
        </div>
      </div>

      {/* Mini watchbox */}
      <div
        style={{
          flex: '1 1 auto',
          padding: '4% 5% 4% 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div
          style={{
            width: '100%',
            aspectRatio: '3 / 2',
            background: 'linear-gradient(180deg, #C9A04C 0%, #B58836 100%)',
            border: '1px solid #A87A2E',
            borderRadius: 6,
            padding: '3%',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gridTemplateRows: 'repeat(2, 1fr)',
            gap: '3%',
            boxShadow: '0 8px 28px rgba(0,0,0,0.4)',
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => {
            const w = visible[i]
            return (
              <div
                key={i}
                style={{
                  borderRadius: 4,
                  background: w ? brand.colors.slot : '#F5EFE5',
                  border: w ? '1px solid #E0DAD0' : '1.5px dashed #D0C9BE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '8%',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                {w && w.imageUrl ? (
                  <Image
                    src={w.imageUrl}
                    alt=""
                    fill
                    sizes="120px"
                    style={{ objectFit: 'contain', padding: '12%' }}
                  />
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
