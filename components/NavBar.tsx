'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { brand } from '@/lib/brand'

const LINKS: { label: string; href: string }[] = [
  { label: 'My Collection', href: '/collection' },
  { label: 'Playground',    href: '/playground'  },
  { label: 'Discover',      href: '#'           },
  { label: 'News',          href: '#'           },
]

export default function NavBar() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    const handleResize = () => {
      if (window.innerWidth >= 768) setOpen(false)
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', handleResize)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', handleResize)
    }
  }, [open])

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
          className="nav-shell"
          style={{
            position: 'relative',
            maxWidth: 1280, margin: '0 auto',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 16,
            padding: '20px 56px',
          }}
        >
        <Link
          href="/"
          className="nav-wordmark"
          onClick={() => setOpen(false)}
          style={{ fontFamily: brand.font.serif, fontSize: 20, fontWeight: 500, letterSpacing: '0.03em', color: brand.colors.ink, textDecoration: 'none' }}
        >
          Virtual Watchbox
        </Link>

        <div className="nav-links" style={{ display: 'flex', gap: 32 }}>
          {LINKS.map(link => (
            <Link
              key={link.label}
              href={link.href}
              onClick={() => setOpen(false)}
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

        <Link
          href="/profile"
          className="nav-signin"
          style={{
            width: 38,
            height: 38,
            borderRadius: brand.radius.circle,
            background: brand.colors.ink,
            color: brand.colors.bg,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: brand.shadow.sm,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="5.25" r="2.35" stroke="currentColor" strokeWidth="1.3" />
            <path d="M3.25 13.2c.65-2.05 2.45-3.2 4.75-3.2s4.1 1.15 4.75 3.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </Link>

        <button
          className="nav-hamburger"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
          style={{
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center',
            width: 44,
            height: 44,
            padding: 0,
            background: brand.colors.slot,
            border: `1px solid ${brand.colors.border}`,
            borderRadius: brand.radius.md,
            cursor: 'pointer',
            color: brand.colors.ink,
            lineHeight: 1,
            flexShrink: 0,
            boxShadow: brand.shadow.xs,
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
        className={`nav-drawer ${open ? 'is-open' : ''}`}
        style={{
          display: 'none',
          position: 'fixed',
          top: 76,
          left: 20,
          right: 20,
          zIndex: brand.zIndex.dropdown,
          flexDirection: 'column',
          padding: '10px 18px 18px',
          background: brand.colors.white,
          border: `1px solid ${brand.colors.borderMid}`,
          borderRadius: brand.radius.xl,
          boxShadow: brand.shadow.menu,
          opacity: open ? 1 : 0,
          transform: open ? 'translateY(0)' : 'translateY(-8px)',
          pointerEvents: open ? 'auto' : 'none',
          transition: `transform ${brand.transition.smooth}, opacity ${brand.transition.smooth}`,
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
        <Link
          href="/profile"
          onClick={() => setOpen(false)}
          style={{
            marginTop: 18,
            fontFamily: brand.font.sans, fontSize: 11, fontWeight: 500,
            letterSpacing: '0.08em', padding: '13px 22px',
            background: brand.colors.ink, color: brand.colors.bg,
            borderRadius: brand.radius.btn,
            width: '100%',
            textDecoration: 'none',
            textAlign: 'center',
            display: 'block',
          }}
        >
          Profile
        </Link>
      </div>

      <div
        className={`nav-scrim ${open ? 'is-active' : ''}`}
        onClick={() => setOpen(false)}
        style={{
          display: 'none',
          position: 'fixed',
          inset: 0,
          zIndex: brand.zIndex.nav - 1,
          background: 'rgba(26,20,16,0.16)',
          backdropFilter: 'blur(3px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: `opacity ${brand.transition.smooth}`,
        }}
      />
    </>
  )
}
