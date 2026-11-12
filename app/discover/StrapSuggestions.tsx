'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePrefersReducedMotion } from '@/components/collection/useResponsiveState'
import { MountedWatchPreview, SideBySideWatchPreview } from '@/components/straps/studio/StudioComposite'
import { brand } from '@/lib/brand'
import type { StrapSuggestion } from '@/lib/discoverStraps'
import { strapStudioHref } from '@/lib/strapStudio'
import EditorialHeader from './EditorialHeader'

export default function StrapSuggestions({ suggestions, personalized, kicker }: {
  suggestions: StrapSuggestion[]
  personalized: boolean
  kicker: string
}) {
  return (
    <section id="straps" aria-label="Strap suggestions" style={{
      maxWidth: 1280, margin: '0 auto', scrollMarginTop: 122,
      padding: 'clamp(32px, 4.4vw, 56px) clamp(18px, 4.4vw, 56px) 28px',
    }}>
      <EditorialHeader
        kicker={kicker}
        title={personalized ? 'New straps for your watches' : 'Discover new straps'}
        sub={personalized ? 'Strap ideas matched to the lug widths in your collection.' : 'Three pairings to try in Strap Studio.'}
      />
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 255px), 1fr))', gap: 16,
      }}>
        {suggestions.map(suggestion => (
          <StrapLookCard key={`${suggestion.watch.catalogId}:${suggestion.strap.id}`} suggestion={suggestion} />
        ))}
      </div>
    </section>
  )
}

function StrapLookCard({ suggestion: { watch, caseOnly, strap, fillsMaterialGap } }: { suggestion: StrapSuggestion }) {
  const [failedCaseUrl, setFailedCaseUrl] = useState<string>()
  const reducedMotion = usePrefersReducedMotion()
  const watchLabel = `${watch.brand} ${watch.model}`
  const strapLabel = [strap.color, strap.design].filter(Boolean).join(' ')
  const action = caseOnly ? 'Try on straps' : 'Compare straps'
  const href = strapStudioHref(watch.catalogId, strap.id, 'discover')

  return (
    <article style={{
      minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      background: brand.colors.slot, border: `1px solid ${brand.colors.border}`, borderRadius: brand.radius.lg,
    }}>
      <div style={{
        height: 226, display: 'grid', placeItems: 'center', overflow: 'hidden',
        background: `radial-gradient(ellipse at center, ${brand.colors.white}, ${brand.colors.paper})`,
        borderBottom: `1px solid ${brand.colors.border}`,
      }}>
        {caseOnly && failedCaseUrl !== caseOnly.caseOnlyUrl ? (
          <MountedWatchPreview
            caseOnly={caseOnly} strap={strap} watchLabel={watchLabel} rowHeight={226}
            reducedMotion={reducedMotion} onCaseError={setFailedCaseUrl} loading="lazy"
          />
        ) : watch.imageUrl || watch.transparentUrl ? (
          <SideBySideWatchPreview watch={watch} strap={strap} blockHeight={158} reducedMotion={reducedMotion} loading="lazy" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={strap.imageUrl} alt={strapLabel} loading="lazy"
            style={{ width: 134, height: 176, objectFit: 'contain', borderRadius: brand.radius.sm }} />
        )}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 16 }}>
        <h3 style={{ margin: '0 0 4px', font: `500 25px/1.06 ${brand.font.serif}`, color: brand.colors.ink }}>
          {strapLabel}
        </h3>
        <p style={{ margin: '0 0 5px', font: `400 13px/1.4 ${brand.font.sans}`, color: brand.colors.inkSoft }}>
          For {watchLabel}
        </p>
        <p style={{ margin: '0 0 13px', font: `400 12px/1.4 ${brand.font.sans}`, color: brand.colors.muted }}>
          {watch.lugWidthMm} mm · {strap.category}{fillsMaterialGap && ' · New material for this watch'}
        </p>
        <Link href={href} prefetch={false} aria-label={`${action} · ${strapLabel} for ${watchLabel}`} style={{
          display: 'inline-flex', alignItems: 'center', alignSelf: 'flex-start', gap: 6, minHeight: 38, marginTop: 'auto',
          color: brand.colors.ink, font: `600 12px ${brand.font.sans}`,
          textDecoration: 'underline', textDecorationColor: brand.colors.goldDeep, textUnderlineOffset: 4,
        }}>
          {action} <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  )
}
