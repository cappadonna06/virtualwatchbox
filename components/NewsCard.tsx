'use client'

import { useState } from 'react'
import { brand } from '@/lib/brand'
import { formatRelativeDate } from '@/lib/relativeDate'
import type { NewsItem } from '@/types/news'

type Props = {
  item: NewsItem
  variant: 'full' | 'compact'
  sponsored?: boolean
}

const PLACEHOLDER_GRADIENT = `linear-gradient(135deg, ${brand.colors.placeholderStart}, ${brand.colors.placeholderEnd})`
const FRESH_THRESHOLD_MS = 6 * 60 * 60 * 1000 // 6h

export default function NewsCard({ item, variant, sponsored = false }: Props) {
  const [hovered, setHovered] = useState(false)
  const [imgFailed, setImgFailed] = useState(false)

  const isFull = variant === 'full'
  const thumbSize = isFull ? 96 : 64
  const headlineSize = isFull ? 17 : 15
  const headlineClamp = 2

  const accentBorder = hovered ? `2px solid ${brand.colors.gold}` : '2px solid transparent'

  const visibleTags = isFull ? buildVisibleTags(item.tags) : []

  const publishedTs = Date.parse(item.publishedAt)
  const isFresh =
    !sponsored &&
    Number.isFinite(publishedTs) &&
    Date.now() - publishedTs < FRESH_THRESHOLD_MS

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        display: 'flex',
        gap: 14,
        padding: isFull ? '14px 14px 14px 14px' : '0 0 14px 0',
        borderBottom: isFull ? 'none' : `1px solid ${brand.colors.border}`,
        borderLeft: isFull ? accentBorder : 'none',
        borderRadius: isFull ? brand.radius.md : 0,
        background: isFull && hovered ? brand.colors.slot : 'transparent',
        textDecoration: 'none',
        color: 'inherit',
        transition: `background ${brand.transition.base}, border-color ${brand.transition.base}`,
        cursor: 'pointer',
      }}
    >
      {/* Sponsored badge */}
      {sponsored && (
        <span
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            padding: '3px 8px',
            background: brand.colors.goldWash,
            color: brand.colors.muted,
            fontFamily: brand.font.sans,
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            borderRadius: brand.radius.pill,
          }}
        >
          Sponsored
        </span>
      )}

      {/* Thumbnail */}
      <div
        style={{
          width: thumbSize,
          height: thumbSize,
          flexShrink: 0,
          borderRadius: brand.radius.sm,
          overflow: 'hidden',
          background: PLACEHOLDER_GRADIENT,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {item.imageUrl && !imgFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <span
            aria-hidden
            style={{
              fontSize: thumbSize * 0.32,
              color: brand.colors.muted,
              opacity: 0.6,
              lineHeight: 1,
            }}
          >
            ◷
          </span>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 5,
            fontFamily: brand.font.sans,
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: brand.colors.muted,
          }}
        >
          <span>
            {item.source} · {formatRelativeDate(item.publishedAt) || '—'}
          </span>
          {isFresh && (
            <span
              style={{
                padding: '2px 6px',
                background: brand.colors.gold,
                color: brand.colors.ink,
                borderRadius: brand.radius.pill,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.14em',
                lineHeight: 1.2,
                animation: 'vw-news-pulse 2s ease-in-out infinite',
              }}
            >
              New
            </span>
          )}
        </div>

        <h4
          style={{
            margin: 0,
            fontFamily: brand.font.serif,
            fontSize: headlineSize,
            fontWeight: 400,
            lineHeight: 1.3,
            color: brand.colors.ink,
            display: '-webkit-box',
            WebkitLineClamp: headlineClamp,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            marginBottom: 6,
          }}
        >
          {item.title}
        </h4>

        {isFull && item.excerpt && (
          <p
            style={{
              margin: 0,
              fontFamily: brand.font.sans,
              fontSize: 14,
              lineHeight: 1.6,
              color: brand.colors.muted,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              marginBottom: visibleTags.length ? 10 : 0,
            }}
          >
            {item.excerpt}
          </p>
        )}

        {!isFull && item.excerpt && (
          <p
            style={{
              margin: 0,
              fontFamily: brand.font.sans,
              fontSize: 14,
              lineHeight: 1.6,
              color: brand.colors.muted,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {item.excerpt}
          </p>
        )}

        {isFull && visibleTags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {visibleTags.map((t) => (
              <span
                key={`${t.kind}-${t.label}`}
                style={{
                  padding: '2px 8px',
                  fontFamily: brand.font.sans,
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  borderRadius: brand.radius.pill,
                  background: t.kind === 'brand' ? brand.colors.goldWash : brand.colors.border,
                  color: t.kind === 'brand' ? brand.colors.goldDeep : brand.colors.muted,
                }}
              >
                {t.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </a>
  )
}

type VisibleTag = { kind: 'brand' | 'category'; label: string }

function buildVisibleTags(tags: NewsItem['tags']): VisibleTag[] {
  const out: VisibleTag[] = []
  for (const b of tags.brands) {
    out.push({ kind: 'brand', label: b })
    if (out.length >= 3) return out
  }
  for (const c of tags.categories) {
    out.push({ kind: 'category', label: c.replace('-', ' ') })
    if (out.length >= 3) return out
  }
  return out
}
