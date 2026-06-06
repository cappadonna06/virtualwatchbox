'use client'

import { useState } from 'react'
import { brand } from '@/lib/brand'
import { formatRelativeDate } from '@/lib/relativeDate'
import type { NewsItem } from '@/types/news'

const PLACEHOLDER_GRADIENT = `linear-gradient(135deg, ${brand.colors.heroDark1}, ${brand.colors.heroDark2})`
const SCRIM = 'linear-gradient(180deg, rgba(15,12,10,0.0) 30%, rgba(15,12,10,0.45) 60%, rgba(15,12,10,0.88) 100%)'

export default function NewsHeroCard({ item }: { item: NewsItem }) {
  const [hovered, setHovered] = useState(false)
  const [imgFailed, setImgFailed] = useState(false)

  const showImage = !!item.imageUrl && !imgFailed

  const visibleTags = [
    ...item.tags.brands.slice(0, 2).map((b) => ({ label: b, kind: 'brand' as const })),
    ...item.tags.categories.slice(0, 1).map((c) => ({ label: c.replace('-', ' '), kind: 'category' as const })),
  ].slice(0, 3)

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="news-hero-card"
      style={{
        position: 'relative',
        display: 'block',
        width: '100%',
        borderRadius: brand.radius.lg,
        overflow: 'hidden',
        background: PLACEHOLDER_GRADIENT,
        textDecoration: 'none',
        color: 'inherit',
        boxShadow: hovered
          ? `inset 0 0 0 2px ${brand.colors.gold}, ${brand.shadow.lg}`
          : brand.shadow.md,
        transition: `box-shadow ${brand.transition.base}`,
      }}
    >
      {/* Image */}
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.imageUrl}
          alt=""
          loading="eager"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            transform: hovered ? 'scale(1.025)' : 'scale(1)',
            transition: `transform 0.6s cubic-bezier(0.22, 0.61, 0.36, 1)`,
          }}
        />
      ) : (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: brand.colors.onDarkMuted,
            opacity: 0.4,
            fontSize: 96,
            lineHeight: 1,
          }}
        >
          ◷
        </div>
      )}

      {/* Scrim */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: SCRIM,
        }}
      />

      {/* Featured pin (top-left) */}
      <div
        style={{
          position: 'absolute',
          top: 18,
          left: 18,
          padding: '5px 10px 5px 8px',
          background: 'rgba(15,12,10,0.55)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.16)',
          borderRadius: brand.radius.pill,
          fontFamily: brand.font.sans,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: '#fff',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span style={{ color: brand.colors.gold, fontSize: 12, lineHeight: 1 }}>◆</span>
        Featured Story
      </div>

      {/* Read CTA (bottom-right) — slides on hover */}
      <div
        style={{
          position: 'absolute',
          top: 18,
          right: 18,
          padding: '7px 14px',
          background: hovered ? brand.colors.gold : 'rgba(255,255,255,0.14)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderRadius: brand.radius.pill,
          fontFamily: brand.font.sans,
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: hovered ? brand.colors.ink : '#fff',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          transition: `background ${brand.transition.base}, color ${brand.transition.base}`,
        }}
      >
        Read article
        <span
          style={{
            display: 'inline-block',
            transform: hovered ? 'translateX(3px)' : 'translateX(0)',
            transition: `transform ${brand.transition.base}`,
          }}
        >
          ↗
        </span>
      </div>

      {/* Content */}
      <div
        className="news-hero-card__content"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: '28px 32px 26px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          maxWidth: '85%',
        }}
      >
        <div
          style={{
            fontFamily: brand.font.sans,
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.78)',
          }}
        >
          {item.source} · {formatRelativeDate(item.publishedAt) || '—'}
        </div>

        <h2
          className="news-hero-card__headline"
          style={{
            margin: 0,
            fontFamily: brand.font.serif,
            fontSize: 40,
            fontWeight: 400,
            lineHeight: 1.08,
            color: '#fff',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textShadow: '0 2px 18px rgba(0,0,0,0.45)',
            letterSpacing: '-0.01em',
          }}
        >
          {item.title}
        </h2>

        {item.excerpt && (
          <p
            className="news-hero-card__excerpt"
            style={{
              margin: 0,
              fontFamily: brand.font.sans,
              fontSize: 15,
              lineHeight: 1.55,
              color: 'rgba(255,255,255,0.82)',
              display: '-webkit-box',
              WebkitLineClamp: 1,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              maxWidth: 720,
            }}
          >
            {item.excerpt}
          </p>
        )}

        {visibleTags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
            {visibleTags.map((t) => (
              <span
                key={`${t.kind}-${t.label}`}
                style={{
                  padding: '3px 10px',
                  fontFamily: brand.font.sans,
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  borderRadius: brand.radius.pill,
                  background: t.kind === 'brand' ? 'rgba(201,168,76,0.28)' : 'rgba(255,255,255,0.16)',
                  color: t.kind === 'brand' ? '#F2D891' : 'rgba(255,255,255,0.92)',
                  backdropFilter: 'blur(6px)',
                  WebkitBackdropFilter: 'blur(6px)',
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
