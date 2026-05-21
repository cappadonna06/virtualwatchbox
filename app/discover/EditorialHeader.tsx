'use client'

import { brand } from '@/lib/brand'

type Props = {
  kicker: string
  title: string
  italic?: boolean
  sub?: string
}

export default function EditorialHeader({ kicker, title, italic = true, sub }: Props) {
  return (
    <div
      className="discover-section-head"
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: 24,
        alignItems: 'baseline',
        marginBottom: 28,
        paddingBottom: 16,
        borderBottom: `1px solid ${brand.colors.border}`,
      }}
    >
      <div>
        <div
          style={{
            fontFamily: brand.font.sans,
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: brand.colors.gold,
            marginBottom: 10,
          }}
        >
          {kicker}
        </div>
        <h2
          style={{
            fontFamily: brand.font.serif,
            fontWeight: 400,
            fontSize: 30,
            lineHeight: 1,
            letterSpacing: '-0.008em',
            color: brand.colors.ink,
            margin: 0,
          }}
        >
          {italic ? <em style={{ fontStyle: 'italic' }}>{title}</em> : title}
        </h2>
      </div>
      {sub && (
        <div
          style={{
            fontFamily: brand.font.sans,
            fontSize: 11.5,
            color: brand.colors.muted,
            letterSpacing: '0.04em',
            maxWidth: 320,
            textAlign: 'right',
            textWrap: 'pretty',
            alignSelf: 'end',
          }}
        >
          {sub}
        </div>
      )}
    </div>
  )
}
