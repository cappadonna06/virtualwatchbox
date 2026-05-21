'use client'

import { brand } from '@/lib/brand'
import { FRAMES, LININGS } from '@/lib/frameConfig'
import { bestFitBoxIndex } from '@/lib/discover'
import EditorialHeader from './EditorialHeader'

type BoxOption = {
  id: string
  label: string
  desc: string
  partner: string
  price: string
  capacity: number
  frameId: string
  liningId: string
  cols: number
  cta: string
}

const BOXES: BoxOption[] = [
  {
    id: 'travel-roll',
    label: 'Travel Roll',
    desc: 'Soft cognac leather, four slots, fits a carry-on without fuss.',
    partner: 'Wolf 1834',
    price: '$165',
    capacity: 4,
    frameId: 'cognac',
    liningId: 'cream',
    cols: 2,
    cta: 'Shop',
  },
  {
    id: 'six-slot',
    label: '6-Slot Display Box',
    desc: 'Light oak with a navy interior — the rotation you actually wear in a week.',
    partner: 'Rapport London',
    price: '$425',
    capacity: 6,
    frameId: 'light-oak',
    liningId: 'navy',
    cols: 3,
    cta: 'Shop',
  },
  {
    id: 'ten-slot',
    label: '10-Slot Collector',
    desc: 'Ebony case, bordeaux interior. For the box that has outgrown the dresser.',
    partner: 'Holme & Hadfield',
    price: '$680',
    capacity: 10,
    frameId: 'ebony',
    liningId: 'bordeaux',
    cols: 5,
    cta: 'Shop',
  },
]

export default function BoxEditorial({ userSlotCount }: { userSlotCount: number }) {
  const bestIdx = bestFitBoxIndex(userSlotCount, BOXES.map(b => b.capacity))

  return (
    <section
      id="box"
      style={{
        maxWidth: 1280,
        margin: '0 auto',
        padding: '56px 56px 32px',
      }}
    >
      <EditorialHeader
        kicker="§ 05"
        title="Upgrade this box."
        sub="Physical cases for the collection you actually own. Sized to your slot count."
      />
      <div
        className="discover-box-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 18,
        }}
      >
        {BOXES.map((b, i) => (
          <BoxCard key={b.id} box={b} bestFit={i === bestIdx} />
        ))}
      </div>
      <div
        style={{
          marginTop: 16,
          fontFamily: brand.font.serif,
          fontStyle: 'italic',
          fontSize: 12,
          color: brand.colors.muted,
        }}
      >
        Virtual Watchbox may earn a commission on box purchases.
      </div>
    </section>
  )
}

function BoxCard({ box, bestFit }: { box: BoxOption; bestFit: boolean }) {
  return (
    <article
      style={{
        background: brand.colors.slot,
        border: `1px solid ${bestFit ? brand.colors.gold : brand.colors.border}`,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      {bestFit && (
        <div
          style={{
            position: 'absolute',
            top: 14,
            left: 14,
            zIndex: 2,
            fontFamily: brand.font.sans,
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            padding: '4px 10px',
            borderRadius: 20,
            background: brand.colors.gold,
            color: brand.colors.ink,
          }}
        >
          Best fit
        </div>
      )}

      <BoxPreview frameId={box.frameId} liningId={box.liningId} capacity={box.capacity} cols={box.cols} />

      <div style={{ padding: '22px 24px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 8,
            gap: 8,
          }}
        >
          <SubKicker>{box.partner}</SubKicker>
          <SubKicker>{box.capacity} slots</SubKicker>
        </div>
        <div
          style={{
            fontFamily: brand.font.serif,
            fontSize: 22,
            fontWeight: 400,
            color: brand.colors.ink,
            marginBottom: 8,
            lineHeight: 1.1,
          }}
        >
          {box.label}
        </div>
        <p
          style={{
            fontFamily: brand.font.sans,
            fontSize: 12,
            color: brand.colors.mutedDark,
            margin: 0,
            marginBottom: 18,
            lineHeight: 1.5,
          }}
        >
          {box.desc}
        </p>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 14,
            borderTop: `1px solid ${brand.colors.border}`,
            marginTop: 'auto',
          }}
        >
          <div style={{ fontFamily: brand.font.serif, fontSize: 20, color: brand.colors.ink }}>
            {box.price}
          </div>
          <span
            style={{
              fontFamily: brand.font.sans,
              fontSize: 10.5,
              fontWeight: 500,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: brand.colors.ink,
            }}
          >
            {box.cta} ↗
          </span>
        </div>
      </div>
    </article>
  )
}

function BoxPreview({
  frameId,
  liningId,
  capacity,
  cols,
}: {
  frameId: string
  liningId: string
  capacity: number
  cols: number
}) {
  const frame = FRAMES.find(f => f.id === frameId) ?? FRAMES[0]
  const lining = LININGS.find(l => l.id === liningId) ?? LININGS[0]
  const rows = Math.ceil(capacity / cols)

  // Light linings cast a darker inner shadow; deep linings cast a lighter highlight.
  const liningIsLight = ['cream', 'taupe'].includes(lining.id)
  const innerShadow = liningIsLight
    ? 'inset 0 2px 10px rgba(0,0,0,0.18), inset 0 -1px 0 rgba(255,255,255,0.4)'
    : 'inset 0 2px 12px rgba(0,0,0,0.45), inset 0 -1px 0 rgba(255,255,255,0.05)'
  const dividerColor = liningIsLight ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.07)'

  return (
    <div
      style={{
        position: 'relative',
        height: 188,
        background: frame.css,
        boxShadow: frame.shadow,
        padding: 18,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          position: 'relative',
          flex: 1,
          alignSelf: 'stretch',
          background: lining.color,
          borderRadius: 2,
          boxShadow: innerShadow,
          overflow: 'hidden',
        }}
      >
        {/* Subtle slot grid — purely visual, suggests compartments without
            drawing pillows or hardware. */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 6,
            backgroundImage: [
              `repeating-linear-gradient(90deg, transparent 0, transparent calc(100%/${cols} - 1px), ${dividerColor} calc(100%/${cols} - 1px), ${dividerColor} calc(100%/${cols}))`,
              `repeating-linear-gradient(0deg,  transparent 0, transparent calc(100%/${rows} - 1px), ${dividerColor} calc(100%/${rows} - 1px), ${dividerColor} calc(100%/${rows}))`,
            ].join(', '),
          }}
        />
      </div>
    </div>
  )
}

function SubKicker({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: brand.font.sans,
        fontSize: 9,
        fontWeight: 600,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: brand.colors.muted,
      }}
    >
      {children}
    </div>
  )
}
