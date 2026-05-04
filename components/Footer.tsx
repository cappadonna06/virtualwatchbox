import Link from 'next/link'
import { brand } from '@/lib/brand'

export default function Footer() {
  return (
    <footer
      className="site-footer"
      style={{
        padding: '24px 56px',
        borderTop: `1px solid ${brand.colors.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap',
      }}
    >
      <span style={{ fontFamily: brand.font.serif, fontSize: 16, fontWeight: 500, color: brand.colors.ink }}>
        Virtual Watchbox
      </span>

      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 14 }}>
        <Link
          href="/privacy"
          style={{ fontFamily: brand.font.sans, fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: brand.colors.gold, textDecoration: 'none' }}
        >
          Privacy
        </Link>
        <Link
          href="/terms"
          style={{ fontFamily: brand.font.sans, fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: brand.colors.gold, textDecoration: 'none' }}
        >
          Terms
        </Link>
        <Link
          href="/settings"
          style={{ fontFamily: brand.font.sans, fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: brand.colors.gold, textDecoration: 'none' }}
        >
          Settings
        </Link>
      </div>

      <span style={{ fontFamily: brand.font.sans, fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: brand.colors.muted }}>
        © 2026 · virtualwatchbox.com
      </span>
    </footer>
  )
}
