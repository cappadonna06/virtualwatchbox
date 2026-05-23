'use client'

import { useEffect, useState } from 'react'
import { brand } from '@/lib/brand'

const NAV_SECTIONS = [
  { id: 'lead',      num: '01', label: 'Lead' },
  { id: 'upgrade',   num: '02', label: 'Upgrade' },
  { id: 'next-slot', num: '03', label: 'Next Slot' },
  { id: 'news',      num: '04', label: 'News' },
]

const NAV_HEIGHT = 61

export default function SectionNav() {
  const [active, setActive] = useState<string>('lead')

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter(e => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
      if (visible.length) setActive(visible[0].target.id)
    }, { rootMargin: '-30% 0px -55% 0px', threshold: 0 })
    NAV_SECTIONS.forEach(s => {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault()
    const el = document.getElementById(id)
    if (!el) return
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
    const offset = isMobile ? 106 : 110
    const top = el.getBoundingClientRect().top + window.scrollY - offset
    try { window.scrollTo({ top, behavior: 'smooth' }) }
    catch { window.scrollTo(0, top) }
  }

  return (
    <div
      className="discover-section-nav"
      style={{
        borderBottom: `1px solid ${brand.colors.border}`,
        position: 'sticky',
        top: NAV_HEIGHT,
        zIndex: 90,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        background: 'rgba(250,248,244,0.94)',
      }}
    >
      <div
        className="discover-section-nav-inner"
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '0 56px',
          display: 'flex',
          alignItems: 'center',
          gap: 28,
          height: 44,
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        <div
          className="discover-section-nav-label"
          style={{
            fontFamily: brand.font.serif,
            fontStyle: 'italic',
            fontSize: 13,
            color: brand.colors.muted,
            whiteSpace: 'nowrap',
            paddingRight: 14,
            borderRight: `1px solid ${brand.colors.borderMid}`,
            marginRight: 4,
            flexShrink: 0,
            letterSpacing: '0.02em',
          }}
        >
          In this issue
        </div>

        {NAV_SECTIONS.map(s => {
          const isActive = active === s.id
          return (
            <a
              key={s.id}
              href={`#${s.id}`}
              data-active={isActive || undefined}
              onClick={(e) => handleClick(e, s.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                color: isActive ? brand.colors.ink : brand.colors.muted,
                fontFamily: brand.font.sans,
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
                textDecoration: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                height: 44,
                flexShrink: 0,
                borderBottom: isActive ? `1.5px solid ${brand.colors.gold}` : '1.5px solid transparent',
                transition: 'color 0.18s ease',
              }}
            >
              <span
                style={{
                  fontFamily: brand.font.serif,
                  fontStyle: 'italic',
                  fontSize: 13,
                  color: isActive ? brand.colors.gold : brand.colors.muted,
                  fontWeight: 400,
                  letterSpacing: '0.04em',
                }}
              >
                {s.num}
              </span>
              <span>{s.label}</span>
            </a>
          )
        })}
      </div>
    </div>
  )
}
