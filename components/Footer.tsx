'use client'

import Link from 'next/link'
import { brand } from '@/lib/brand'
import { useAuth } from '@/lib/auth/AuthProvider'
import { isAdminEmail } from '@/lib/auth/admin'

const linkStyle: React.CSSProperties = {
  fontFamily: brand.font.sans,
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: brand.colors.gold,
  textDecoration: 'none',
  whiteSpace: 'nowrap',
}

export default function Footer() {
  const { user } = useAuth()
  const showAdmin = isAdminEmail(user?.email)

  return (
    <footer
      className="site-footer"
      style={{
        width: '100%',
        borderTop: `1px solid ${brand.colors.border}`,
      }}
    >
      <div
        className="site-footer__inner"
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '24px 56px',
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

        <div
          className="site-footer__links"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}
        >
          <Link href="/privacy" style={linkStyle}>Privacy</Link>
          <Link href="/terms" style={linkStyle}>Terms</Link>
          <Link href="/settings" style={linkStyle}>Settings</Link>
          {showAdmin && (
            <Link href="/admin/catalog" style={{ ...linkStyle, color: brand.colors.muted }}>
              Admin
            </Link>
          )}
        </div>

        <span style={{ fontFamily: brand.font.sans, fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: brand.colors.muted }}>
          © 2026 · virtualwatchbox.com
        </span>
      </div>
    </footer>
  )
}
