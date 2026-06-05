'use client'

import { motion } from 'framer-motion'
import { brand } from '@/lib/brand'
import type { StudioController } from './useStudioController'

// Buy (only when a real purchase link exists), Share (URL copy), and — for a
// watch the user doesn't own — Follow. Saving looks ships in a later pass, so it
// is omitted here rather than shown disabled.
export default function StudioFooter({ c }: { c: StudioController }) {
  const showFollow = c.studioWatch ? !c.studioWatch.isOwned : false

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        flexWrap: 'wrap',
      }}
    >
      {c.buyUrl && (
        <FooterButton
          primary
          href={c.buyUrl}
          label="Buy this strap"
          glyph="↗"
        />
      )}
      <FooterButton label="Share look" glyph="↗" onClick={() => void c.shareLook()} />
      {showFollow && (
        <FooterButton
          label={c.followed ? 'Followed' : 'Add to followed'}
          glyph={c.followed ? '♥' : '♡'}
          active={c.followed}
          onClick={c.toggleFollow}
        />
      )}
    </div>
  )
}

function FooterButton({
  label, glyph, href, onClick, primary, active,
}: {
  label: string
  glyph: string
  href?: string
  onClick?: () => void
  primary?: boolean
  active?: boolean
}) {
  const style: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    height: 44,
    padding: '0 22px',
    borderRadius: brand.radius.pill,
    border: `1px solid ${primary || active ? brand.colors.gold : brand.studio.hairline}`,
    background: primary ? 'rgba(201,168,76,0.10)' : 'rgba(255,255,255,0.03)',
    color: primary || active ? brand.colors.gold : brand.studio.textHi,
    font: `500 13px ${brand.font.sans}`,
    letterSpacing: '0.03em',
    cursor: 'pointer',
    textDecoration: 'none',
  }
  const inner = (
    <>
      <span>{label}</span>
      <span style={{ color: active ? brand.colors.gold : undefined }}>{glyph}</span>
    </>
  )
  const motionProps = {
    whileHover: { y: -1 },
    transition: { type: 'spring' as const, stiffness: 500, damping: 30 },
  }
  if (href) {
    return (
      <motion.a {...motionProps} href={href} target="_blank" rel="noopener noreferrer" style={style}>
        {inner}
      </motion.a>
    )
  }
  return (
    <motion.button {...motionProps} onClick={onClick} style={style}>
      {inner}
    </motion.button>
  )
}
