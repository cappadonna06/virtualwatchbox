'use client'

import type { ReactNode } from 'react'
import { brand } from '@/lib/brand'

type Props = {
  kicker: string
  title: string
  italic?: boolean
  sub?: string
  action?: ReactNode
}

export default function EditorialHeader({ kicker, title, italic = true, sub, action }: Props) {
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
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: brand.colors.goldDeep,
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
      {(sub || action) && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 10,
            alignSelf: 'end',
            maxWidth: 320,
          }}
        >
          {sub && (
            <div
              style={{
                fontFamily: brand.font.sans,
                fontSize: 12,
                color: brand.colors.muted,
                letterSpacing: '0.04em',
                textAlign: 'right',
                textWrap: 'pretty',
              }}
            >
              {sub}
            </div>
          )}
          {action}
        </div>
      )}
    </div>
  )
}
