'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import type { CatalogWatch } from '@/types/watch'
import { brand } from '@/lib/brand'
import { renderableWatches } from '@/lib/renderableWatches'
import { withVersion } from '@/lib/watchImages/cacheBust'
import popularModels from '@/data/popular-models.json'
import { useIsMobile, usePrefersReducedMotion } from './useResponsiveState'

type PopularModel = { brand: string; model: string; query: string }
type ImgResolver = (id: string) => string | undefined

const HEAT = (w: CatalogWatch) => w.market?.heatScore ?? 0

function imageUrlFor(w: CatalogWatch, getImageUrl: ImgResolver) {
  return withVersion(getImageUrl(w.id) ?? w.imageUrl) ?? ''
}
function hasImage(w: CatalogWatch, getImageUrl: ImgResolver) {
  return Boolean(getImageUrl(w.id) ?? w.imageUrl)
}

// Highest-heat imaged watch matching each curated (brand, model). Resolved from
// the live catalog (which carries iconic refs the tiny static seed lacks),
// with the seed as the instant-paint fallback before the catalog hydrates.
function buildModelCards(ranked: CatalogWatch[], getImageUrl: ImgResolver) {
  return (popularModels as PopularModel[])
    .map(m => {
      const needle = m.model.toLowerCase()
      const rep = ranked.find(
        w =>
          w.brand === m.brand &&
          hasImage(w, getImageUrl) &&
          (w.model?.toLowerCase().includes(needle) || w.modelFamily?.toLowerCase().includes(needle)),
      )
      return rep ? { ...m, img: imageUrlFor(rep, getImageUrl) } : null
    })
    .filter((c): c is PopularModel & { img: string } => Boolean(c && c.img))
}

function buildBrandCards(ranked: CatalogWatch[], getImageUrl: ImgResolver) {
  const counts = new Map<string, number>()
  const rep = new Map<string, string>()
  for (const w of ranked) {
    if (!w.brand?.trim()) continue
    counts.set(w.brand, (counts.get(w.brand) ?? 0) + 1)
    if (!rep.has(w.brand) && hasImage(w, getImageUrl)) rep.set(w.brand, imageUrlFor(w, getImageUrl))
  }
  return [...counts.entries()]
    .map(([brandName, count]) => ({ brand: brandName, count, img: rep.get(brandName) ?? '' }))
    .filter(b => b.img)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
}

type AddSearchEmptyStateProps = {
  catalogWatches: CatalogWatch[]
  getImageUrl: ImgResolver
  onPickModel: (query: string) => void
  onPickBrand: (brand: string) => void
}

export default function AddSearchEmptyState({ catalogWatches, getImageUrl, onPickModel, onPickBrand }: AddSearchEmptyStateProps) {
  const isMobile = useIsMobile()
  const prefersReducedMotion = usePrefersReducedMotion()
  const [hovered, setHovered] = useState<string | null>(null)

  const ranked = useMemo(() => {
    const pool = catalogWatches.length > 0 ? catalogWatches : renderableWatches
    return [...pool].sort((a, b) => HEAT(b) - HEAT(a))
  }, [catalogWatches])

  const modelCards = useMemo(() => buildModelCards(ranked, getImageUrl), [ranked, getImageUrl])
  const brandCards = useMemo(() => buildBrandCards(ranked, getImageUrl), [ranked, getImageUrl])

  if (modelCards.length === 0 && brandCards.length === 0) return null

  return (
    <div style={{ marginBottom: 28 }}>
      {modelCards.length > 0 ? (
        <>
          <SectionHeader title="Most popular models" />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))',
              gap: isMobile ? 12 : 18,
            }}
          >
            {modelCards.map(card => {
              const key = `model:${card.query}`
              const active = hovered === key && !prefersReducedMotion
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onPickModel(card.query)}
                  onMouseEnter={() => setHovered(key)}
                  onMouseLeave={() => setHovered(h => (h === key ? null : h))}
                  style={{ display: 'block', textAlign: 'left', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
                >
                  <div
                    style={{
                      position: 'relative',
                      aspectRatio: '1 / 1',
                      borderRadius: brand.radius.lg,
                      background: brand.colors.paperWarm,
                      border: `1px solid ${active ? brand.colors.goldLine : brand.colors.borderMid}`,
                      boxShadow: active ? brand.shadow.md : 'none',
                      transform: active ? 'translateY(-2px)' : 'none',
                      transition: prefersReducedMotion ? 'none' : 'transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease',
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{ position: 'absolute', inset: isMobile ? 16 : 22 }}>
                      <Image src={card.img} alt="" fill sizes="(max-width: 768px) 40vw, 220px" style={{ objectFit: 'contain' }} />
                    </div>
                  </div>
                  <div style={{ marginTop: 11, fontFamily: brand.font.sans, fontSize: brand.text.labelSm, letterSpacing: '0.04em', color: brand.colors.muted }}>
                    {card.brand}
                  </div>
                  <div style={{ marginTop: 2, fontFamily: brand.font.sans, fontSize: brand.text.body, fontWeight: 600, color: brand.colors.ink }}>
                    {card.model}
                  </div>
                </button>
              )
            })}
          </div>
        </>
      ) : null}

      {brandCards.length > 0 ? (
        <>
          <div style={{ height: isMobile ? 26 : 34 }} />
          <SectionHeader title="Browse by brand" />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))',
              gap: isMobile ? 12 : 18,
            }}
          >
            {brandCards.map(card => {
              const key = `brand:${card.brand}`
              const active = hovered === key && !prefersReducedMotion
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onPickBrand(card.brand)}
                  onMouseEnter={() => setHovered(key)}
                  onMouseLeave={() => setHovered(h => (h === key ? null : h))}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    textAlign: 'left',
                    background: brand.colors.white,
                    border: `1px solid ${active ? brand.colors.goldLine : brand.colors.borderMid}`,
                    borderRadius: brand.radius.lg,
                    boxShadow: active ? brand.shadow.md : 'none',
                    transform: active ? 'translateY(-2px)' : 'none',
                    transition: prefersReducedMotion ? 'none' : 'transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease',
                    padding: 10,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ position: 'relative', flexShrink: 0, width: 52, height: 52, borderRadius: brand.radius.md, background: brand.colors.paperWarm, overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', inset: 7 }}>
                      <Image src={card.img} alt="" fill sizes="52px" style={{ objectFit: 'contain' }} />
                    </div>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: brand.font.sans, fontSize: brand.text.body, fontWeight: 600, color: brand.colors.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {card.brand}
                    </div>
                    <div style={{ marginTop: 1, fontFamily: brand.font.sans, fontSize: brand.text.labelSm, color: brand.colors.muted }}>
                      View all →
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </>
      ) : null}
    </div>
  )
}

function SectionHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h3 style={{ fontFamily: brand.font.serif, fontSize: brand.text.cardTitle, fontWeight: 400, color: brand.colors.ink, margin: 0, lineHeight: 1.1 }}>
        {title}
      </h3>
      {hint && (
        <p style={{ margin: '5px 0 0', fontFamily: brand.font.sans, fontSize: brand.text.bodySm, color: brand.colors.muted }}>
          {hint}
        </p>
      )}
    </div>
  )
}
