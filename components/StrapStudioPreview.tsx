'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { useCollectionSession } from '@/app/collection/CollectionSessionProvider'
import { useIsMobile, usePrefersReducedMotion } from '@/components/collection/useResponsiveState'
import { MountedWatchPreview, WornStrapPreview } from '@/components/straps/studio/StudioComposite'
import StudioArrow from '@/components/straps/studio/StudioArrow'
import { brand } from '@/lib/brand'
import { getCaseOnly } from '@/lib/caseOnlyImages'
import { buildBandDemoStraps, strapStudioHref, studioFit } from '@/lib/strapStudio'

const demoWatchId = 'omega-310-32-42-50-04-001'
const demoWatchLabel = 'Omega Speedmaster Moonwatch'
const demoWatch = getCaseOnly(demoWatchId)
const catalog = buildBandDemoStraps()
const presets = [
  { id: 'fabric-sailcloth-charcoal', label: 'Charcoal sailcloth' },
  { id: 'leather-suede-sand', label: 'Sand suede' },
  { id: 'rubber-tropical-oxblood', label: 'Oxblood rubber' },
].flatMap(look => {
  const strap = catalog.find(item => item.id === look.id)
  return strap?.band && strap.templateId && strap.imageUrl ? [{ ...look, strap }] : []
})

export default function StrapStudioPreview() {
  const { collectionWatches, collectionJewelWatchId, getCatalogWatch } = useCollectionSession()
  const [selectedStrapId, setSelectedStrapId] = useState<string>()
  const [failedCaseUrls, setFailedCaseUrls] = useState<Set<string>>(() => new Set())
  const mobile = useIsMobile()
  const reducedMotion = usePrefersReducedMotion()

  const handleCaseError = useCallback((url: string) => {
    setFailedCaseUrls(previous => previous.has(url) ? previous : new Set(previous).add(url))
  }, [])

  const candidates = collectionWatches.flatMap(owned => {
    const caseOnly = getCaseOnly(owned.watchId)
    if (!caseOnly || failedCaseUrls.has(caseOnly.caseOnlyUrl)) return []

    const catalogWatch = getCatalogWatch(owned.watchId)
    const target = {
      id: owned.watchId,
      lugWidthMm: caseOnly.lugWidthMm ?? catalogWatch?.lugWidthMm ?? owned.lugWidthMm,
      braceletType: catalogWatch?.braceletType,
    }
    const looks = presets.filter(({ strap }) => studioFit(strap, target, []) === 'fits')
    return looks.length ? [{ owned, caseOnly, looks }] : []
  })
  const jewel = candidates.find(({ owned }) => owned.watchId === collectionJewelWatchId)
  const featured = jewel ?? candidates.reduce<(typeof candidates)[number] | undefined>(
    (best, entry) => !best || entry.owned.estimatedValue > best.owned.estimatedValue ? entry : best,
    undefined,
  )
  const watchId = featured?.owned.watchId ?? demoWatchId
  const watchLabel = featured ? `${featured.owned.brand} ${featured.owned.model}` : demoWatchLabel
  const watch = featured?.caseOnly ?? demoWatch
  const looks = featured?.looks ?? presets
  const selected = Math.max(0, looks.findIndex(option => option.id === selectedStrapId))
  const look = looks[selected]
  if (!watch || !look) return null

  const stageHeight = mobile ? 236 : 342
  const adjacentLook = (index: number, direction: -1 | 1) => looks[(index + direction + looks.length) % looks.length]
  const cycle = (direction: -1 | 1) => setSelectedStrapId(previous => {
    const index = Math.max(0, looks.findIndex(option => option.id === previous))
    return adjacentLook(index, direction).id
  })
  const previous = adjacentLook(selected, -1)
  const next = adjacentLook(selected, 1)
  const canCycle = looks.length > 1
  const sidePreview = (option: typeof look) => canCycle && option.strap.band ? {
    label: option.label,
    content: <WornStrapPreview caseOnly={watch} band={option.strap.band} rowHeight={stageHeight} />,
  } : undefined
  return (
    <section aria-labelledby="home-strap-studio-title" style={{ borderTop: `1px solid ${brand.colors.border}` }}>
      <div style={{
        maxWidth: 1280, margin: '0 auto', padding: 'clamp(32px, 5vw, 64px) clamp(20px, 4.4vw, 56px)',
        display: 'grid',
        gridTemplateColumns: mobile ? 'minmax(0, 1fr)' : 'minmax(0, 1.08fr) minmax(0, 1fr)',
        gridTemplateAreas: mobile ? '"intro" "preview" "controls"' : '"preview intro" "preview controls"',
        columnGap: 'clamp(24px, 5vw, 68px)', rowGap: 18,
      }}>
        <header style={{ gridArea: 'intro', alignSelf: 'end' }}>
          <p style={{
            font: `600 12px ${brand.font.sans}`, letterSpacing: '0.16em', textTransform: 'uppercase',
            color: brand.colors.goldDeep, margin: '0 0 10px',
          }}>Strap Studio</p>
          <h2 id="home-strap-studio-title" style={{
            margin: '0 0 12px', color: brand.colors.ink,
            font: `400 clamp(34px, 4.5vw, 56px)/1.02 ${brand.font.serif}`,
          }}>Try on a new strap</h2>
          <p style={{
            margin: 0, maxWidth: 420, color: brand.colors.muted, font: `400 15px/1.55 ${brand.font.sans}`,
          }}>
            Tap a side preview to swap straps on {jewel ? 'your Collection Jewel' : featured ? 'a watch from your collection' : 'the white-dial Moonwatch'}.
            {' '}Open any look in Strap Studio.
          </p>
        </header>

        <figure style={{
          gridArea: 'preview', display: 'grid', justifyItems: 'center', alignContent: 'center',
          gridTemplateColumns: 'minmax(0, 1fr)',
          margin: 0, overflow: 'hidden', minWidth: 0, padding: '8px 14px 17px',
          border: `1px solid ${brand.colors.border}`, borderRadius: brand.radius.xl,
          background: `radial-gradient(ellipse at 50% 44%, ${brand.colors.white}, ${brand.colors.paper})`,
        }}>
          <div role="group" aria-label="Preview straps" onKeyDown={event => {
            if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
            event.preventDefault()
            cycle(event.key === 'ArrowLeft' ? -1 : 1)
          }} style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 'clamp(5px, 0.9vw, 14px)',
          }}>
            <StudioArrow dir="prev" onClick={() => cycle(-1)} disabled={!canCycle}
              preview={sidePreview(previous)} />
            <Link href={strapStudioHref(watchId, look.id)} prefetch={false}
              aria-label={`Open Strap Studio with ${look.label}`}
              style={{ display: 'flex', flex: '0 0 auto', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
              {failedCaseUrls.has(watch.caseOnlyUrl) ? (
                <span style={{
                  display: 'grid', placeItems: 'center', minHeight: stageHeight, textAlign: 'center',
                  color: brand.colors.ink, font: `500 14px ${brand.font.sans}`,
                }}>Open Strap Studio →</span>
              ) : (
                <MountedWatchPreview
                  key={watchId}
                  caseOnly={watch}
                  strap={look.strap}
                  watchLabel={watchLabel}
                  rowHeight={stageHeight}
                  reducedMotion={reducedMotion}
                  onCaseError={handleCaseError}
                  loading="lazy"
                />
              )}
            </Link>
            <StudioArrow dir="next" onClick={() => cycle(1)} disabled={!canCycle}
              preview={sidePreview(next)} />
          </div>
          <figcaption aria-live="polite" style={{
            font: `500 19px/1.1 ${brand.font.serif}`, textAlign: 'center', color: brand.colors.ink,
          }}>
            {watchLabel}
            <span style={{ display: 'block', marginTop: 4, fontStyle: 'italic', color: brand.colors.muted }}>
              on {look.label}
            </span>
          </figcaption>
        </figure>

        <div style={{ gridArea: 'controls', alignSelf: 'start' }}>
          <div role="group" aria-label="Strap options" style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, maxWidth: 424,
          }}>
            {looks.map((option, index) => {
              const active = selected === index
              return (
                <Link
                  key={option.id}
                  href={strapStudioHref(watchId, option.id)}
                  prefetch={false}
                  aria-current={active ? 'true' : undefined}
                  aria-label={`Open ${option.label} in Strap Studio`}
                  style={{
                    display: 'grid', justifyItems: 'center', alignContent: 'start', gap: 7,
                    minWidth: 0, padding: '5px 5px 9px', textDecoration: 'none', textAlign: 'center',
                    border: `1px solid ${active ? brand.colors.goldDeep : brand.colors.borderLight}`,
                    borderRadius: brand.radius.btn, background: active ? brand.colors.goldWash : brand.colors.slot,
                    color: brand.colors.ink, font: `500 12px/1.2 ${brand.font.sans}`,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={option.strap.imageUrl} alt="" loading="lazy" width={1000} height={1200}
                    style={{
                      width: '100%', height: 'auto', aspectRatio: '5 / 6', objectFit: 'contain',
                      background: brand.colors.white, borderRadius: brand.radius.btn,
                    }} />
                  {option.label}
                </Link>
              )
            })}
          </div>
          <Link href={strapStudioHref(watchId, look.id)} prefetch={false} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 44, marginTop: 18, padding: '8px 16px',
            borderRadius: brand.radius.btn, background: brand.colors.ink, color: brand.colors.bg,
            font: `600 13px ${brand.font.sans}`, textDecoration: 'none',
          }}>
            Open Strap Studio <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  )
}
