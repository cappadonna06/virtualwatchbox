'use client'

import { useState } from 'react'
import Link from 'next/link'
import { brand } from '@/lib/brand'

const LINKS: { label: string; href: string }[] = [
  { label: 'My Collection', href: '/collection' },
  { label: 'Playground',    href: '/playground'  },
  { label: 'Discover',      href: '#'           },
  { label: 'News',          href: '#'           },
]

export default function NavBar() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <nav
        className="nav-root"
        style={{
          borderBottom: `1px solid ${brand.colors.border}`,
          background: brand.colors.bg,
          position: 'sticky', top: 0, zIndex: brand.zIndex.nav,
        }}
      >
        <div
          style={{
            maxWidth: 1280, margin: '0 auto',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '20px 56px',
          }}
        >
        <Link
          href="/"
          style={{ fontFamily: brand.font.serif, fontSize: 20, fontWeight: 500, letterSpacing: '0.03em', color: brand.colors.ink, textDecoration: 'none' }}
        >
          Virtual Watchbox
        </Link>

        <div className="nav-links" style={{ display: 'flex', gap: 32 }}>
          {LINKS.map(link => (
            <Link
              key={link.label}
              href={link.href}
              style={{
                fontFamily: brand.font.sans, fontSize: 12, fontWeight: 400,
                letterSpacing: '0.04em', color: brand.colors.muted,
                textDecoration: 'none', cursor: 'pointer',
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <button
          className="nav-signin"
          style={{
            fontFamily: brand.font.sans, fontSize: 11, fontWeight: 500,
            letterSpacing: '0.08em', padding: '9px 22px',
            background: brand.colors.ink, color: brand.colors.bg,
            border: 'none', borderRadius: brand.radius.btn, cursor: 'pointer',
          }}
        >
          Sign In
        </button>

        <button
          className="nav-hamburger"
          onClick={() => setOpen(o => !o)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          style={{
            display: 'none',
            background: 'none', border: 'none',
            cursor: 'pointer', padding: '4px 2px',
            color: brand.colors.ink, lineHeight: 1,
          }}
        >
          {open ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M4 4L16 16M16 4L4 16" stroke={brand.colors.ink} strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg width="22" height="16" viewBox="0 0 22 16" fill="none">
              <path d="M1 1H21M1 8H21M1 15H21" stroke={brand.colors.ink} strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          )}
        </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      <div
        className="nav-drawer"
        style={{
          display: 'none',
          position: 'fixed',
          top: 61,
          left: 0, right: 0,
          background: brand.colors.bg,
          borderBottom: `1px solid ${brand.colors.border}`,
          zIndex: brand.zIndex.nav - 1,
          flexDirection: 'column',
          padding: '8px 24px 28px',
          opacity: open ? 1 : 0,
          transform: open ? 'translateY(0)' : 'translateY(-6px)',
          pointerEvents: open ? 'auto' : 'none',
          transition: `transform ${brand.transition.slide}, opacity ${brand.transition.slide}`,
        }}
      >
        {LINKS.map((link, i) => (
          <Link
            key={link.label}
            href={link.href}
            onClick={() => setOpen(false)}
            style={{
              fontFamily: brand.font.sans,
              fontSize: 14, fontWeight: 400,
              letterSpacing: '0.04em', color: brand.colors.ink,
              textDecoration: 'none',
              padding: '16px 0',
              borderBottom: i < LINKS.length - 1 ? `1px solid ${brand.colors.border}` : 'none',
              display: 'block',
            }}
          >
            {link.label}
          </Link>
        ))}
        <button
          onClick={() => setOpen(false)}
          style={{
            marginTop: 20,
            fontFamily: brand.font.sans, fontSize: 11, fontWeight: 500,
            letterSpacing: '0.08em', padding: '13px 22px',
            background: brand.colors.ink, color: brand.colors.bg,
            border: 'none', borderRadius: brand.radius.btn, cursor: 'pointer',
            width: '100%',
          }}
        >
          Sign In
        </button>
      </div>
    </>
  )
}
