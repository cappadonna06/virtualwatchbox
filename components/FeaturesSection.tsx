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
  return (
    <section style={{ padding: '80px 56px', borderTop: '1px solid #EAE5DC' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80 }}>

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
                <div style={{ fontFamily: 'var(--font-cormorant)', fontSize: 20, fontWeight: 400, color: '#1A1410' }}>{name}</div>
                <div style={{ fontSize: 12, color: '#A89880', marginTop: 2 }}>{desc}</div>
              </div>
              <span style={{ color: '#D4CBBF', fontSize: 14 }}>→</span>
            </div>
          ))}
          <style>{`
            .feature-row:first-of-type { border-top: 1px solid #EAE5DC; }
            .feature-row:hover > span:last-child { color: #C9A84C; }
          `}</style>
        </div>

        {/* Right: news */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 36 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A89880', marginBottom: 12 }}>
                From the Watch World
              </div>
              <h2 style={{ fontFamily: 'var(--font-cormorant)', fontSize: 38, fontWeight: 400, lineHeight: 1.15, color: '#1A1410' }}>
                Horological<br /><em>Intelligence.</em>
              </h2>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {articles.map((a, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 16, cursor: 'pointer' }}>
                <div style={{
                  aspectRatio: '1/1', borderRadius: 6,
                  background: 'linear-gradient(135deg, #EDE9E2 0%, #E0DAD0 100%)',
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
            <a style={{ fontSize: 12, color: '#A89880', letterSpacing: '0.06em', cursor: 'pointer', paddingTop: 4 }}>
              View all articles →
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
