import Link from 'next/link'
import { brand } from '@/lib/brand'

export default function StrapDrawerPage() {
  return (
    <div
      style={{
        maxWidth: 1280,
        margin: '0 auto',
        padding: '96px 56px',
        textAlign: 'center',
        borderTop: `1px solid ${brand.colors.border}`,
      }}
    >
      <div
        style={{
          fontFamily: brand.font.sans,
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: brand.colors.gold,
          marginBottom: 14,
        }}
      >
        § The Strap Drawer
      </div>
      <h1
        style={{
          fontFamily: brand.font.serif,
          fontStyle: 'italic',
          fontWeight: 400,
          fontSize: 36,
          lineHeight: 1.1,
          color: brand.colors.ink,
          margin: '0 0 14px',
        }}
      >
        Coming soon.
      </h1>
      <p
        style={{
          fontFamily: brand.font.sans,
          fontSize: 13.5,
          lineHeight: 1.6,
          color: brand.colors.muted,
          maxWidth: 460,
          margin: '0 auto 28px',
          textWrap: 'pretty',
        }}
      >
        A first-class strap inventory — auto-matched by lug width, with combo stats and a
        compatibility matrix across your box. Feature 7 is in progress.
      </p>
      <Link
        href="/collection"
        style={{
          fontFamily: brand.font.sans,
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: brand.colors.ink,
          textDecoration: 'none',
          borderBottom: `1px solid ${brand.colors.gold}`,
          paddingBottom: 3,
        }}
      >
        ← Back to Collection
      </Link>
    </div>
  )
}
