'use client'

import { useState } from 'react'
import Link from 'next/link'

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
          borderBottom: '1px solid #EAE5DC',
          background: '#FAF8F4',
          position: 'sticky', top: 0, zIndex: 100,
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
          style={{ fontFamily: 'var(--font-cormorant)', fontSize: 20, fontWeight: 500, letterSpacing: '0.03em', color: '#1A1410', textDecoration: 'none' }}
        >
          Virtual Watchbox
        </Link>

        <div className="nav-links" style={{ display: 'flex', gap: 32 }}>
          {LINKS.map(link => (
            <Link
              key={link.label}
              href={link.href}
              style={{
                fontFamily: 'var(--font-dm-sans)', fontSize: 12, fontWeight: 400,
                letterSpacing: '0.04em', color: '#A89880',
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
            fontFamily: 'var(--font-dm-sans)', fontSize: 11, fontWeight: 500,
            letterSpacing: '0.08em', padding: '9px 22px',
            background: '#1A1410', color: '#FAF8F4',
            border: 'none', borderRadius: 4, cursor: 'pointer',
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
            color: '#1A1410', lineHeight: 1,
          }}
        >
          {open ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M4 4L16 16M16 4L4 16" stroke="#1A1410" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg width="22" height="16" viewBox="0 0 22 16" fill="none">
              <path d="M1 1H21M1 8H21M1 15H21" stroke="#1A1410" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          )}
        </button>
        </div>
      </nav>

      {/* Mobile drawer — always in DOM, animated via opacity/transform */}
      <div
        className="nav-drawer"
        style={{
          display: 'none',
          position: 'fixed',
          top: 61,
          left: 0, right: 0,
          background: '#FAF8F4',
          borderBottom: '1px solid #EAE5DC',
          zIndex: 99,
          flexDirection: 'column',
          padding: '8px 24px 28px',
          opacity: open ? 1 : 0,
          transform: open ? 'translateY(0)' : 'translateY(-6px)',
          pointerEvents: open ? 'auto' : 'none',
          transition: 'transform 0.2s ease, opacity 0.2s ease',
        }}
      >
        {LINKS.map((link, i) => (
          <Link
            key={link.label}
            href={link.href}
            onClick={() => setOpen(false)}
            style={{
              fontFamily: 'var(--font-dm-sans)',
              fontSize: 14, fontWeight: 400,
              letterSpacing: '0.04em', color: '#1A1410',
              textDecoration: 'none',
              padding: '16px 0',
              borderBottom: i < LINKS.length - 1 ? '1px solid #EAE5DC' : 'none',
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
            fontFamily: 'var(--font-dm-sans)', fontSize: 11, fontWeight: 500,
            letterSpacing: '0.08em', padding: '13px 22px',
            background: '#1A1410', color: '#FAF8F4',
            border: 'none', borderRadius: 4, cursor: 'pointer',
            width: '100%',
          }}
        >
          Sign In
        </button>
      </div>
    </>
  )
}
