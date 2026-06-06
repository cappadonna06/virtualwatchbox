'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import type { CatalogWatch, WatchTarget } from '@/types/watch'
import { brand } from '@/lib/brand'
import { buildChrono24URL } from '@/lib/discover'
import { useAuth } from '@/lib/auth/AuthProvider'
import { useCollectionSession } from '@/app/collection/CollectionSessionProvider'
import WatchImageOrDial from '@/components/watchbox/WatchImageOrDial'
import { CrownIcon } from '@/components/collection/WatchStateIcons'
import EditorialHeader from './EditorialHeader'

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

const marketCta: React.CSSProperties = {
  fontFamily: brand.font.sans,
  fontSize: 12,
  fontWeight: 500,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: brand.colors.ink,
  textDecoration: 'none',
}

export default function TargetsGrailSection() {
  const { user } = useAuth()
  const { nextTargetWatches, grailWatch, grailWatchId } = useCollectionSession()

  const isLoggedIn = Boolean(user)
  const hasGrail = Boolean(grailWatchId && grailWatch)
  if (!isLoggedIn || (nextTargetWatches.length === 0 && !hasGrail)) return null

  return (
    <motion.section
      id="targets"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      style={{
        maxWidth: 1280,
        margin: '0 auto',
        padding: '56px 56px 32px',
      }}
    >
      <EditorialHeader
        kicker="§ 03"
        title="What you're chasing."
        sub="Your own shortlist. The grail you've crowned and the targets you're tracking."
      />

      {hasGrail && grailWatch && <GrailCard watch={grailWatch} />}

      {nextTargetWatches.length > 0 && (
        <div
          className="discover-targets-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16,
            marginTop: hasGrail ? 16 : 0,
          }}
        >
          {nextTargetWatches.slice(0, 3).map(({ target, watch }) => (
            <TargetCard key={watch.id} target={target} watch={watch} />
          ))}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginTop: 20,
          paddingTop: 16,
          borderTop: `1px solid ${brand.colors.border}`,
        }}
      >
        <Link
          href="/followed"
          style={{
            fontFamily: brand.font.sans,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: brand.colors.ink,
            textDecoration: 'none',
            borderBottom: `1px solid ${brand.colors.gold}`,
            paddingBottom: 2,
            whiteSpace: 'nowrap',
          }}
        >
          + Add a target
        </Link>
        <span style={{ fontFamily: brand.font.serif, fontStyle: 'italic', fontSize: 15, color: brand.colors.muted, letterSpacing: '0.02em' }}>
          {nextTargetWatches.length >= 3
            ? 'Target list full. Remove one from its detail sidebar to add another.'
            : 'Open a followed watch and choose “Set as Target” to track it here.'}
        </span>
      </div>
    </motion.section>
  )
}

function GrailCard({ watch }: { watch: CatalogWatch }) {
  return (
    <article
      style={{
        background: brand.colors.slot,
        border: `1px solid ${brand.colors.goldLine}`,
        boxShadow: brand.shadow.gold,
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: 'minmax(220px, 360px) 1fr',
        gap: 24,
        alignItems: 'center',
        padding: '28px 36px',
      }}
      className="discover-grail-card"
    >
      <div
        style={{
          position: 'relative',
          aspectRatio: '1 / 1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '92%',
            height: '92%',
            background:
              'radial-gradient(ellipse at center, rgba(201,168,76,0.30) 0%, rgba(201,168,76,0.12) 42%, rgba(201,168,76,0) 72%)',
            pointerEvents: 'none',
          }}
        />
        <div style={{ position: 'relative', width: '82%', height: '82%', zIndex: 1 }}>
          <WatchImageOrDial
            watch={watch}
            fill
            sizes="(max-width: 768px) 70vw, 320px"
            imageStyle={{ objectFit: 'contain', filter: 'drop-shadow(0 20px 34px rgba(26,20,16,0.26))' }}
            dialSize={180}
          />
        </div>
      </div>

      <div style={{ minWidth: 0 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 11px',
            borderRadius: brand.radius.pill,
            background: brand.colors.white,
            border: `1px solid ${brand.colors.goldLine}`,
            color: brand.colors.goldDeep,
            boxShadow: brand.shadow.xs,
            marginBottom: 14,
          }}
        >
          <CrownIcon size={13} />
          <span
            style={{
              fontFamily: brand.font.sans,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              lineHeight: 1,
            }}
          >
            Your Grail
          </span>
        </span>

        <div
          style={{
            fontFamily: brand.font.sans,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: brand.colors.ink,
            marginBottom: 6,
          }}
        >
          {watch.brand}
        </div>
        <div
          style={{
            fontFamily: brand.font.serif,
            fontStyle: 'italic',
            fontSize: 34,
            fontWeight: 400,
            lineHeight: 1.05,
            color: brand.colors.ink,
            marginBottom: 8,
          }}
        >
          {watch.model}
        </div>
        <div
          style={{
            fontFamily: brand.font.sans,
            fontSize: 12,
            color: brand.colors.muted,
            letterSpacing: '0.04em',
            marginBottom: 18,
          }}
        >
          Ref. {watch.reference} · {watch.caseSizeMm} mm{watch.estimatedValue ? ` · ${fmt(watch.estimatedValue)}` : ''}
        </div>

        <a
          href={buildChrono24URL(watch.brand, watch.model, 'buy')}
          target="_blank"
          rel="noopener noreferrer"
          style={marketCta}
        >
          Find on Market →
        </a>
      </div>
    </article>
  )
}

function TargetCard({ target, watch }: { target: WatchTarget; watch: CatalogWatch }) {
  const type = watch.watchType ?? 'Watch'
  return (
    <article
      style={{
        background: brand.colors.slot,
        border: `1px solid ${brand.colors.border}`,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          background: brand.colors.paperWarm,
          aspectRatio: '4/3',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 14,
            left: 14,
            display: 'inline-flex',
            alignItems: 'center',
            padding: '4px 9px',
            borderRadius: brand.radius.pill,
            background: brand.colors.white,
            border: `1px solid ${brand.colors.borderMid}`,
            fontFamily: brand.font.sans,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: brand.colors.muted,
            zIndex: 1,
          }}
        >
          {target.intent}
        </div>
        <div style={{ position: 'relative', width: '70%', height: '90%' }}>
          <WatchImageOrDial
            watch={watch}
            fill
            sizes="(max-width: 768px) 80vw, 280px"
            imageStyle={{ objectFit: 'contain', filter: 'drop-shadow(0 12px 22px rgba(26,20,16,0.18))' }}
            dialSize={140}
          />
        </div>
      </div>

      <div style={{ padding: '20px 22px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            fontFamily: brand.font.sans,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: brand.colors.ink,
            marginBottom: 6,
          }}
        >
          {watch.brand}
        </div>
        <div
          style={{
            fontFamily: brand.font.serif,
            fontSize: 22,
            fontWeight: 400,
            fontStyle: 'italic',
            lineHeight: 1.1,
            color: brand.colors.ink,
            marginBottom: 6,
          }}
        >
          {watch.model}
        </div>
        <div
          style={{
            fontFamily: brand.font.sans,
            fontSize: 12,
            color: brand.colors.muted,
            marginBottom: 14,
            letterSpacing: '0.04em',
          }}
        >
          Ref. {watch.reference} · {type}
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            marginBottom: 16,
            flex: 1,
          }}
        >
          <TargetMeta label="Target" value={target.targetPrice ? fmt(target.targetPrice) : 'Open'} />
          <TargetMeta label="Condition" value={target.desiredCondition} />
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            paddingTop: 14,
            borderTop: `1px solid ${brand.colors.border}`,
          }}
        >
          <a
            href={buildChrono24URL(watch.brand, watch.model, 'buy')}
            target="_blank"
            rel="noopener noreferrer"
            style={marketCta}
          >
            Track Listings →
          </a>
        </div>
      </div>
    </article>
  )
}

function TargetMeta({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
      <span
        style={{
          fontFamily: brand.font.sans,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: brand.colors.muted,
        }}
      >
        {label}
      </span>
      <span style={{ fontFamily: brand.font.sans, fontSize: 14, fontWeight: 500, color: brand.colors.ink }}>
        {value}
      </span>
    </div>
  )
}
