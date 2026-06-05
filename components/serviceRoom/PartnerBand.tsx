'use client'

// components/serviceRoom/PartnerBand.tsx — "Service Centers" band. Curated, real third-party
// service companies (not yet sponsored/affiliate). Links are verified working service pages.

import { brand } from '@/lib/brand'
import { Meta } from '@/components/serviceRoom/primitives'

const sans = brand.font.sans
const serif = brand.font.serif

type Partner = { name: string; tag: string; detail: string; cta: string; href: string }

const PARTNERS: Partner[] = [
  { name: 'Watchfinder & Co.', tag: 'Multi-brand overhauls', detail: 'Manufacturer-certified service centre · 24-month warranty', cta: 'Service your watch', href: 'https://www.watchfinder.com/watch-servicing' },
  { name: 'The 1916 Company', tag: 'Authorized Rolex servicing', detail: 'Official Rolex jeweler · factory-trained watchmakers', cta: 'Book service', href: 'https://www.the1916company.com/rolex/servicing/' },
  { name: 'RGM Watch Co.', tag: 'Complications & restoration', detail: 'American independent · vintage, complications & restoration', cta: 'Enquire', href: 'https://www.rgmwatches.com/repair' },
]

export function PartnerBand() {
  return (
    <section style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <Meta style={{ color: brand.colors.gold, display: 'block', marginBottom: 5 }}>Service centers</Meta>
          <h2 style={{ fontFamily: serif, fontSize: 26, fontWeight: 400, color: brand.colors.ink, margin: 0, lineHeight: 1 }}>Where collectors send their pieces</h2>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
        {PARTNERS.map(p => (
          <a
            key={p.name}
            href={p.href}
            target="_blank"
            rel="noopener noreferrer nofollow"
            style={{
              display: 'flex', flexDirection: 'column', gap: 10, padding: 20, background: brand.colors.white,
              border: `1px solid ${brand.colors.border}`, borderRadius: brand.radius.xl, textDecoration: 'none',
              transition: `border-color ${brand.transition.fast}, box-shadow ${brand.transition.fast}`,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = brand.colors.gold; e.currentTarget.style.boxShadow = brand.shadow.md }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = brand.colors.border; e.currentTarget.style.boxShadow = 'none' }}
          >
            <Meta style={{ color: brand.colors.gold }}>{p.tag}</Meta>
            <div style={{ fontFamily: serif, fontSize: 20, fontWeight: 500, color: brand.colors.ink, lineHeight: 1.1 }}>{p.name}</div>
            <p style={{ fontFamily: sans, fontSize: 12, color: brand.colors.muted, lineHeight: 1.55, margin: 0, flex: 1 }}>{p.detail}</p>
            <span style={{ fontFamily: sans, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', color: brand.colors.ink, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              {p.cta} <span style={{ color: brand.colors.gold }}>↗</span>
            </span>
          </a>
        ))}
      </div>
    </section>
  )
}
