'use client'

import { type CSSProperties, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { brand } from '@/lib/brand'
import { useAuth } from '@/lib/auth/AuthProvider'

type NavIconName = 'collection' | 'playground' | 'discover' | 'news' | 'profile' | 'settings'
type NavLink = { label: string; href: string; coming?: boolean; icon: NavIconName }

const LINKS: NavLink[] = [
  { label: 'My Collection', href: '/collection', icon: 'collection' },
  { label: 'Playground', href: '/playground', icon: 'playground' },
  { label: 'Discover', href: '#', coming: true, icon: 'discover' },  // TODO(coming-soon): Discover / explore page
  { label: 'News', href: '#', coming: true, icon: 'news' },  // TODO(coming-soon): News / editorial page
]

function NavIcon({ name, size = 16 }: { name: NavIconName; size?: number }) {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 20 20',
    fill: 'none',
    'aria-hidden': 'true' as const,
  }

  switch (name) {
    case 'collection':
      return (
        <svg {...props}>
          <path d="M3.25 5.25h13.5v10.5H3.25z" stroke="currentColor" strokeWidth="1.35" />
          <path d="M6.5 3.25h7" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
          <path d="M6.25 8.5h7.5M6.25 11.5h5.25" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      )
    case 'playground':
      return (
        <svg {...props}>
          <path d="M10 2.75l1.5 3.55 3.75.45-2.85 2.45.85 3.8L10 10.95 6.75 13l.85-3.8L4.75 6.75l3.75-.45L10 2.75z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
        </svg>
      )
    case 'discover':
      return (
        <svg {...props}>
          <circle cx="10" cy="10" r="6.4" stroke="currentColor" strokeWidth="1.35" />
          <path d="M11.95 8.05l-1.55 4.2-4.15 1.55 1.55-4.2 4.15-1.55z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
        </svg>
      )
    case 'news':
      return (
        <svg {...props}>
          <path d="M4 4.25h9.75a2 2 0 0 1 2 2V14a1.75 1.75 0 0 1-1.75 1.75H6a2 2 0 0 1-2-2V4.25z" stroke="currentColor" strokeWidth="1.35" />
          <path d="M6.75 7h6M6.75 9.9h6M6.75 12.8h4.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M4 13.2c0 1.4.95 2.55 2.35 2.55" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      )
    case 'profile':
      return (
        <svg {...props}>
          <circle cx="10" cy="6.6" r="2.5" stroke="currentColor" strokeWidth="1.3" />
          <path d="M4.5 15.2c.75-2.35 2.8-3.65 5.5-3.65 2.7 0 4.75 1.3 5.5 3.65" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      )
    case 'settings':
      return (
        <svg {...props}>
          <path
            d="M11.6 3.1 11.05 4.7a5.7 5.7 0 0 0-2.1 0L8.4 3.1l-2.3 1 .55 1.6a5.7 5.7 0 0 0-1.5 1.5l-1.6-.55-1 2.3 1.6.55a5.7 5.7 0 0 0 0 2.1l-1.6.55 1 2.3 1.6-.55a5.7 5.7 0 0 0 1.5 1.5l-.55 1.6 2.3 1 .55-1.6a5.7 5.7 0 0 0 2.1 0l.55 1.6 2.3-1-.55-1.6a5.7 5.7 0 0 0 1.5-1.5l1.6.55 1-2.3-1.6-.55a5.7 5.7 0 0 0 0-2.1l1.6-.55-1-2.3-1.6.55a5.7 5.7 0 0 0-1.5-1.5l.55-1.6-2.3-1z"
            stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round"
          />
          <circle cx="10" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.35" />
        </svg>
      )
    default:
      return null
  }
}

export default function NavBar() {
  const [open, setOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [toastVisible, setToastVisible] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [mobileSearchTerm, setMobileSearchTerm] = useState('')
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const accountWrapRef = useRef<HTMLDivElement>(null)
  const searchWrapRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const pathname = usePathname()
  const router = useRouter()
  const { user, signOut } = useAuth()

  useEffect(() => {
    if (!searchOpen) return
    const id = window.setTimeout(() => searchInputRef.current?.focus(), 50)
    function onPointerDown(e: PointerEvent) {
      if (!searchWrapRef.current?.contains(e.target as Node)) {
        if (!searchTerm.trim()) setSearchOpen(false)
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setSearchOpen(false)
        setSearchTerm('')
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      window.clearTimeout(id)
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [searchOpen, searchTerm])

  function submitSearch(term: string) {
    const trimmed = term.trim()
    const params = new URLSearchParams({ from: 'home' })
    if (trimmed) params.set('q', trimmed)
    router.push(`/collection/add?${params.toString()}`)
    setSearchOpen(false)
    setSearchTerm('')
    setMobileSearchOpen(false)
    setMobileSearchTerm('')
  }

  useEffect(() => {
    setOpen(false)
    setAccountOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!accountOpen) return
    const handleMouseDown = (event: MouseEvent) => {
      if (accountWrapRef.current && !accountWrapRef.current.contains(event.target as Node)) {
        setAccountOpen(false)
      }
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAccountOpen(false)
    }
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKey)
    }
  }, [accountOpen])

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

  function showComingSoon() {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    setToastMsg('Coming soon.')
    setToastVisible(true)
    hideTimer.current = setTimeout(() => {
      setToastVisible(false)
      hideTimer.current = setTimeout(() => setToastMsg(null), 300)
    }, 2400)
  }

  const isLinkActive = (href: string) => href !== '#' && (pathname === href || pathname.startsWith(`${href}/`))
  const profileActive = pathname === '/profile' || pathname.startsWith('/profile/')

  const desktopLinkStyle = (active: boolean) => ({
    '--nav-link-color': active ? brand.colors.ink : brand.colors.muted,
    '--nav-link-underline': active ? brand.colors.gold : 'transparent',
    fontFamily: brand.font.sans,
    fontSize: 12,
    fontWeight: 400,
    letterSpacing: '0.04em',
    textDecoration: 'none',
  }) as CSSProperties

  const accountItemStyle = (color: string): CSSProperties => ({
    fontFamily: brand.font.sans,
    fontSize: 13,
    color,
    padding: '10px 16px',
    textDecoration: 'none',
    display: 'block',
    lineHeight: 1.3,
  })

  const mobileRowStyle = (active: boolean, hasBorder: boolean) => ({
    '--nav-mobile-color': active ? brand.colors.ink : brand.colors.muted,
    '--nav-mobile-icon': active ? brand.colors.gold : brand.colors.muted,
    '--nav-mobile-bg': active ? brand.colors.goldWash : 'transparent',
    fontFamily: brand.font.sans,
    fontSize: 14,
    fontWeight: 500,
    letterSpacing: '0.03em',
    color: brand.colors.ink,
    textDecoration: 'none',
    borderBottom: hasBorder ? `1px solid ${brand.colors.border}` : 'none',
    background: 'none',
    boxShadow: active ? `inset 2px 0 0 ${brand.colors.gold}` : 'none',
  }) as CSSProperties

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
          {LINKS.map(link => {
            const active = isLinkActive(link.href)
            return link.coming ? (
              <button
                key={link.label}
                onClick={showComingSoon}
                className="nav-link-button"
                style={desktopLinkStyle(active)}
              >
                {link.label}
              </button>
            ) : (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setOpen(false)}
                className="nav-link-button"
                style={desktopLinkStyle(active)}
                aria-current={active ? 'page' : undefined}
              >
                {link.label}
              </Link>
            )
          })}
        </div>

        <div className="nav-right-cluster" style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
        <div
          ref={searchWrapRef}
          className="nav-search-desktop"
          style={{ display: 'inline-flex', alignItems: 'center', position: 'relative' }}
        >
          {searchOpen ? (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                width: 280,
                padding: '8px 10px 8px 12px',
                background: brand.colors.white,
                border: `1px solid ${brand.colors.goldLine}`,
                borderRadius: brand.radius.md,
                boxShadow: brand.shadow.sm,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke={brand.colors.muted} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="9" cy="9" r="6" />
                <line x1="13.5" y1="13.5" x2="17.5" y2="17.5" />
              </svg>
              <input
                ref={searchInputRef}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') submitSearch(searchTerm) }}
                placeholder="Search brand, model, or reference"
                style={{
                  flex: 1,
                  minWidth: 0,
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontFamily: brand.font.sans,
                  fontSize: 13,
                  color: brand.colors.ink,
                }}
              />
              <button
                type="button"
                aria-label="Close search"
                onClick={() => { setSearchOpen(false); setSearchTerm('') }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: brand.colors.muted,
                  display: 'inline-flex',
                  padding: 2,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                  <line x1="3.5" y1="3.5" x2="10.5" y2="10.5" />
                  <line x1="10.5" y1="3.5" x2="3.5" y2="10.5" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              type="button"
              aria-label="Search watches"
              onClick={() => setSearchOpen(true)}
              onMouseEnter={e => { e.currentTarget.style.borderColor = brand.colors.goldLine; e.currentTarget.style.color = brand.colors.ink }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = brand.colors.border; e.currentTarget.style.color = brand.colors.muted }}
              style={{
                width: 36,
                height: 36,
                borderRadius: brand.radius.circle,
                background: brand.colors.white,
                border: `1px solid ${brand.colors.border}`,
                color: brand.colors.muted,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'border-color 0.15s, color 0.15s',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="9" cy="9" r="6" />
                <line x1="13.5" y1="13.5" x2="17.5" y2="17.5" />
              </svg>
            </button>
          )}
        </div>

        {user ? (
          <div ref={accountWrapRef} className="nav-account-wrap" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setAccountOpen(o => !o)}
              aria-haspopup="menu"
              aria-expanded={accountOpen}
              aria-label={`Account menu for ${user.email ?? 'you'}`}
              title={user.email ?? undefined}
              style={{
                width: 34,
                height: 34,
                borderRadius: brand.radius.circle,
                background: brand.colors.ink,
                color: brand.colors.bg,
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                fontFamily: brand.font.sans,
                fontSize: 12,
                fontWeight: 500,
                letterSpacing: '0.04em',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {(user.email?.charAt(0) ?? '?').toUpperCase()}
            </button>
            {accountOpen && (
              <div
                role="menu"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  minWidth: 160,
                  background: brand.colors.white,
                  border: `1px solid ${brand.colors.border}`,
                  borderRadius: brand.radius.md,
                  boxShadow: '0 8px 24px rgba(26,20,16,0.10)',
                  padding: '6px 0',
                  zIndex: brand.zIndex.nav + 1,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Link
                  href="/profile"
                  role="menuitem"
                  onClick={() => setAccountOpen(false)}
                  className="nav-account-item"
                  style={accountItemStyle(brand.colors.ink)}
                >
                  Profile
                </Link>
                <Link
                  href="/settings"
                  role="menuitem"
                  onClick={() => setAccountOpen(false)}
                  className="nav-account-item"
                  style={accountItemStyle(brand.colors.ink)}
                >
                  Settings
                </Link>
                <div style={{ height: 1, background: brand.colors.border, margin: '6px 0' }} />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => { setAccountOpen(false); void signOut() }}
                  className="nav-account-item"
                  style={{
                    ...accountItemStyle(brand.colors.muted),
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    width: '100%',
                  }}
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link
            href="/auth"
            className="nav-link-button nav-signin"
            style={{
              ...desktopLinkStyle(false),
              padding: '7px 14px',
              border: `1px solid ${brand.colors.borderLight}`,
              borderRadius: brand.radius.btn,
            }}
          >
            Sign in
          </Link>
        )}
        </div>

        <div className="nav-mobile-actions" style={{ display: 'none', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            aria-label={mobileSearchOpen ? 'Close search' : 'Search watches'}
            aria-expanded={mobileSearchOpen}
            onClick={() => setMobileSearchOpen(o => !o)}
            className="nav-search-mobile"
            style={{
              width: 44,
              height: 44,
              padding: 0,
              borderRadius: brand.radius.md,
              background: brand.colors.slot,
              border: `1px solid ${brand.colors.border}`,
              color: brand.colors.ink,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: brand.shadow.xs,
              cursor: 'pointer',
            }}
          >
            {mobileSearchOpen ? (
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <path d="M4 4L16 16M16 4L4 16" stroke={brand.colors.ink} strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="9" cy="9" r="6" />
                <line x1="13.5" y1="13.5" x2="17.5" y2="17.5" />
              </svg>
            )}
          </button>
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
        </div>
      </nav>

      {/* Mobile search drawer (drops below navbar) */}
      <div
        className={`nav-mobile-search-drawer ${mobileSearchOpen ? 'is-open' : ''}`}
        style={{
          display: 'none',
          position: 'sticky',
          top: 80,
          zIndex: brand.zIndex.nav,
          background: brand.colors.bg,
          borderBottom: `1px solid ${brand.colors.border}`,
          padding: '12px 20px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: brand.colors.white,
            border: `1px solid ${brand.colors.goldLine}`,
            borderRadius: brand.radius.md,
            padding: '10px 12px',
            boxShadow: brand.shadow.sm,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke={brand.colors.muted} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="9" cy="9" r="6" />
            <line x1="13.5" y1="13.5" x2="17.5" y2="17.5" />
          </svg>
          <input
            value={mobileSearchTerm}
            onChange={e => setMobileSearchTerm(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') submitSearch(mobileSearchTerm)
              if (e.key === 'Escape') { setMobileSearchOpen(false); setMobileSearchTerm('') }
            }}
            placeholder="Search brand, model, or reference"
            autoFocus={mobileSearchOpen}
            style={{
              flex: 1,
              minWidth: 0,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontFamily: brand.font.sans,
              fontSize: 14,
              color: brand.colors.ink,
            }}
          />
          {mobileSearchTerm.trim() ? (
            <button
              type="button"
              onClick={() => submitSearch(mobileSearchTerm)}
              style={{
                fontFamily: brand.font.sans,
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding: '6px 12px',
                background: brand.colors.ink,
                color: brand.colors.bg,
                border: 'none',
                borderRadius: brand.radius.btn,
                cursor: 'pointer',
              }}
            >
              Search
            </button>
          ) : null}
        </div>
      </div>

      {/* Mobile drawer */}
      <div
        className={`nav-drawer ${open ? 'is-open' : ''}`}
        style={{
          display: 'none',
          position: 'fixed',
          top: 80,
          left: '50%',
          width: 'min(calc(100vw - 56px), 360px)',
          maxWidth: 360,
          zIndex: brand.zIndex.dropdown,
          flexDirection: 'column',
          padding: '10px 18px 18px',
          background: brand.colors.white,
          border: `1px solid ${brand.colors.borderMid}`,
          borderRadius: brand.radius.xl,
          boxShadow: brand.shadow.menu,
          opacity: open ? 1 : 0,
          transform: open ? 'translate(-50%, 0)' : 'translate(-50%, -8px)',
          pointerEvents: open ? 'auto' : 'none',
          transition: `transform ${brand.transition.smooth}, opacity ${brand.transition.smooth}`,
        }}
      >
        {user && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '16px 0 20px 0',
              borderBottom: `1px solid ${brand.colors.border}`,
              marginBottom: 8,
            }}
          >
            <div
              aria-hidden="true"
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: brand.colors.ink,
                color: brand.colors.bg,
                fontFamily: brand.font.sans,
                fontSize: 11,
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {(user.email?.charAt(0) ?? '?').toUpperCase()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span
                style={{
                  fontFamily: brand.font.sans,
                  fontSize: 12,
                  fontWeight: 400,
                  color: brand.colors.ink,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: 220,
                }}
              >
                {user.email ?? ''}
              </span>
              <span
                style={{
                  fontFamily: brand.font.sans,
                  fontSize: 11,
                  fontWeight: 400,
                  color: brand.colors.muted,
                }}
              >
                Signed in
              </span>
            </div>
          </div>
        )}
        {LINKS.map(link => {
          const active = isLinkActive(link.href)
          const hasBorder = true
          const rowContent = (
            <>
              <span className="nav-mobile-row-main">
                <span className="nav-mobile-row-icon">
                  <NavIcon name={link.icon} />
                </span>
                <span>{link.label}</span>
              </span>
            </>
          )

          return link.coming ? (
            <button
              key={link.label}
              onClick={() => { showComingSoon(); setOpen(false) }}
              className="nav-mobile-row"
              style={mobileRowStyle(active, hasBorder)}
            >
              {rowContent}
            </button>
          ) : (
            <Link
              key={link.label}
              href={link.href}
              onClick={() => setOpen(false)}
              className="nav-mobile-row"
              style={mobileRowStyle(active, hasBorder)}
              aria-current={active ? 'page' : undefined}
            >
              {rowContent}
            </Link>
          )
        })}
        {user ? (
          <>
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="nav-mobile-row"
              style={{
                ...mobileRowStyle(profileActive, true),
                marginTop: 8,
              }}
              aria-current={profileActive ? 'page' : undefined}
            >
              <span className="nav-mobile-row-main">
                <span className={`nav-mobile-row-icon ${profileActive ? 'is-profile-active' : ''}`}>
                  <NavIcon name="profile" />
                </span>
                <span>Profile</span>
              </span>
            </Link>
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="nav-mobile-row"
              style={mobileRowStyle(pathname.startsWith('/settings'), true)}
              aria-current={pathname.startsWith('/settings') ? 'page' : undefined}
            >
              <span className="nav-mobile-row-main">
                <span className="nav-mobile-row-icon">
                  <NavIcon name="settings" />
                </span>
                <span>Settings</span>
              </span>
            </Link>
            <button
              onClick={() => { void signOut(); setOpen(false) }}
              className="nav-mobile-row"
              style={{
                ...mobileRowStyle(false, false),
                marginTop: 14,
                '--nav-mobile-color': brand.colors.ink,
              } as CSSProperties}
            >
              <span className="nav-mobile-row-main">
                <span className="nav-mobile-row-icon" />
                <span>Sign out</span>
              </span>
            </button>
          </>
        ) : (
          <Link
            href="/auth"
            onClick={() => setOpen(false)}
            className="nav-mobile-row"
            style={{
              ...mobileRowStyle(false, false),
              marginTop: 8,
            }}
          >
            <span className="nav-mobile-row-main">
              <span className="nav-mobile-row-icon">
                <NavIcon name="profile" />
              </span>
              <span>Sign in</span>
            </span>
          </Link>
        )}
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

      {/* Coming soon toast */}
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            bottom: 28,
            left: '50%',
            transform: `translateX(-50%) translateY(${toastVisible ? '0' : '12px'})`,
            opacity: toastVisible ? 1 : 0,
            transition: 'opacity 0.22s, transform 0.22s',
            background: brand.colors.ink,
            color: brand.colors.bg,
            borderRadius: brand.radius.pill,
            padding: '10px 20px',
            fontFamily: brand.font.sans,
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: '0.04em',
            boxShadow: brand.shadow.lg,
            zIndex: brand.zIndex.dropdown + 10,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
          aria-live="polite"
        >
          {toastMsg}
        </div>
      )}
    </>
  )
}
