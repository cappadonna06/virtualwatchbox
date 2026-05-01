'use client'

import { useRef, useState } from 'react'
import { brand } from '@/lib/brand'

const features = [
  ['01', 'Playground Mode',    'Build dream boxes with any reference. Save and share your fantasy collection.'],
  ['02', 'Strap Matchmaker',   'Virtually swap straps with compatibility filtering by lug width. Affiliate-linked.'],
  ['03', 'Virtual Try-On',     'Upload a wrist photo. See the watch on you before committing to a purchase.'],
  ['04', 'Smart Suggestions',  'Personalized picks based on your collection, search history, and taste.'],
  ['05', 'Buy & Sell',         'AI-assisted pricing, listing generator, one-click post to Chrono24 & eBay.'],
]

const articles = [
  {
    headline: 'The New Rolex Submariner: Every Change, Explained',
    source: 'Hodinkee', date: 'Apr 22, 2026',
    excerpt: "Every update to Rolex's most iconic sports watch — and what it means for collectors.",
  },
  {
    headline: "Why the Royal Oak's Value Story Is Far From Over",
    source: 'Fratello', date: 'Apr 20, 2026',
    excerpt: 'Market corrections notwithstanding, the AP Royal Oak remains one of the most resilient references.',
  },
  {
    headline: 'Patek Philippe Nautilus: A Complete Reference Guide',
    source: 'Monochrome', date: 'Apr 18, 2026',
    excerpt: 'From the original 3700 to the final 5711 — every Nautilus reference, its own story.',
  },
]

export default function FeaturesSection() {
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [toastVisible, setToastVisible] = useState(false)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function showComingSoon() {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    setToastMsg('Coming soon.')
    setToastVisible(true)
    hideTimer.current = setTimeout(() => {
      setToastVisible(false)
      hideTimer.current = setTimeout(() => setToastMsg(null), 300)
    }, 2400)
  }

  return (
    <section className="features-section" style={{ padding: '56px 56px 60px', borderTop: '1px solid #EAE5DC', position: 'relative' }}>
      <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56 }}>

        {/* Left: numbered feature list */}
        <div>
          <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A89880', marginBottom: 12 }}>
            Also in the Box
          </div>
          <h2 style={{ fontFamily: 'var(--font-cormorant)', fontSize: 38, fontWeight: 400, lineHeight: 1.15, color: '#1A1410', marginBottom: 40 }}>
            Everything a<br /><em>Collector Needs.</em>
          </h2>
          {features.map(([num, name, desc]) => (
            <div
              key={name}
              style={{
                display: 'flex', alignItems: 'baseline', gap: 16,
                padding: '14px 0',
                borderBottom: '1px solid #EAE5DC',
                cursor: 'pointer',
              }}
              className="feature-row"
            >
              <span style={{ fontFamily: 'var(--font-cormorant)', fontSize: 13, color: '#C9A84C', fontWeight: 500, minWidth: 24 }}>
                {num}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 11, fontWeight: 500, letterSpacing: '0.04em', color: '#1A1410', marginBottom: 3 }}>
                  {name}
                </div>
                <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 12, color: '#A89880', lineHeight: 1.6 }}>
                  {desc}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Right: news feed */}
        <div>
          <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A89880', marginBottom: 12 }}>
            From the Community
          </div>
          <h2 style={{ fontFamily: 'var(--font-cormorant)', fontSize: 38, fontWeight: 400, lineHeight: 1.15, color: '#1A1410', marginBottom: 40 }}>
            What Collectors<br /><em>Are Reading.</em>
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {articles.map(a => (
              <div
                key={a.headline}
                style={{
                  display: 'flex', gap: 14,
                  paddingBottom: 20,
                  borderBottom: '1px solid #EAE5DC',
                }}
              >
                <div style={{
                  width: 64, height: 64, flexShrink: 0,
                  background: '#F5F0E8', borderRadius: 6,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: 9, color: '#B0A898', fontFamily: 'var(--font-dm-sans)', letterSpacing: '0.04em' }}>photo</span>
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A89880', marginBottom: 5 }}>
                    {a.source} · {a.date}
                  </div>
                  <h4 style={{ fontFamily: 'var(--font-cormorant)', fontSize: 15, fontWeight: 400, lineHeight: 1.35, color: '#1A1410', marginBottom: 5 }}>
                    {a.headline}
                  </h4>
                  <p style={{ fontSize: 12, lineHeight: 1.7, color: '#A89880' }}>{a.excerpt}</p>
                </div>
              </div>
            ))}
            <button
              onClick={showComingSoon}
              style={{ fontSize: 12, color: '#A89880', letterSpacing: '0.06em', cursor: 'pointer', paddingTop: 4, background: 'none', border: 'none', padding: 0, fontFamily: 'var(--font-dm-sans)', textAlign: 'left' }}
            >
              {/* TODO(coming-soon): News / editorial articles page */}
              View all articles →
            </button>
          </div>
        </div>
      </div>

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
            zIndex: 400,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
          aria-live="polite"
        >
          {toastMsg}
        </div>
      )}
    </section>
  )
}
