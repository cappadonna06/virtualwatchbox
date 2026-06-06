import type { ReactNode } from 'react'
import { masthead } from '@/lib/brand'

interface PageMastheadProps {
  /** Optional uppercase kicker above the title (string or multi-part node). */
  eyebrow?: ReactNode
  /** The page title (may include an <em> for an italic word). */
  title: ReactNode
  /** Optional lead/subtitle below the title. */
  subtitle?: ReactNode
  /** Use light-on-dark colors for dark-surface mastheads. */
  onDark?: boolean
}

/**
 * Canonical page masthead — eyebrow -> serif title -> subtitle. The type
 * treatment lives in `masthead` (lib/brand) so every page title matches.
 * Page-specific controls (buttons, badges, toggles) stay in the page layout
 * alongside this block.
 */
export default function PageMasthead({ eyebrow, title, subtitle, onDark = false }: PageMastheadProps) {
  return (
    <div>
      {eyebrow != null && (
        <div style={{ ...masthead.eyebrow, marginBottom: 12 }}>{eyebrow}</div>
      )}
      <h1 style={onDark ? masthead.titleOnDark : masthead.title}>{title}</h1>
      {subtitle != null && (
        <p style={{ ...(onDark ? masthead.subtitleOnDark : masthead.subtitle), marginTop: 12 }}>
          {subtitle}
        </p>
      )}
    </div>
  )
}
