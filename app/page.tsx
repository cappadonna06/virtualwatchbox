import WatchBox from '@/components/watchbox/WatchBox'

const features = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect x="3" y="3" width="22" height="22" rx="3" stroke="#C9A84C" strokeWidth="1.5" />
        <rect x="7" y="7" width="6" height="8" rx="1" fill="#C9A84C" fillOpacity="0.3" stroke="#C9A84C" strokeWidth="1" />
        <rect x="15" y="7" width="6" height="8" rx="1" fill="#C9A84C" fillOpacity="0.3" stroke="#C9A84C" strokeWidth="1" />
        <rect x="7" y="17" width="6" height="4" rx="1" fill="#C9A84C" fillOpacity="0.15" stroke="#C9A84C" strokeWidth="1" />
        <rect x="15" y="17" width="6" height="4" rx="1" fill="#C9A84C" fillOpacity="0.15" stroke="#C9A84C" strokeWidth="1" />
      </svg>
    ),
    label: 'My Collection',
    description:
      'Display every watch you own in a high-fidelity virtual box, with full specs and market values.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <circle cx="14" cy="14" r="10" stroke="#C9A84C" strokeWidth="1.5" />
        <circle cx="14" cy="14" r="5" stroke="#C9A84C" strokeWidth="1" strokeDasharray="2 2" />
        <circle cx="14" cy="14" r="2" fill="#C9A84C" />
      </svg>
    ),
    label: 'Playground Mode',
    description:
      'Build dream boxes with any reference — no ownership required. Save and share your fantasy collection.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path d="M6 14 C6 14 10 8 14 14 C18 20 22 14 22 14" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="14" cy="14" r="2.5" fill="#C9A84C" fillOpacity="0.4" stroke="#C9A84C" strokeWidth="1" />
      </svg>
    ),
    label: 'Strap Matchmaker',
    description:
      'Virtually swap straps with compatibility filtering by lug width. Find the perfect combination.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <circle cx="14" cy="14" r="10" stroke="#C9A84C" strokeWidth="1.5" />
        <circle cx="14" cy="14" r="6" fill="#C9A84C" fillOpacity="0.15" />
        <circle cx="14" cy="14" r="2" fill="#C9A84C" />
        <line x1="14" y1="4" x2="14" y2="8" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="14" y1="20" x2="14" y2="24" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="4" y1="14" x2="8" y2="14" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="20" y1="14" x2="24" y2="14" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    label: 'Virtual Try-On',
    description:
      'Upload a wrist photo and see exactly how a watch looks on you before committing to a purchase.',
  },
]

const articles = [
  {
    source: 'Hodinkee',
    date: 'Apr 22, 2026',
    headline: 'The New Rolex Submariner: Every Change, Explained',
    excerpt:
      'Rolex\'s most iconic sports watch receives its most significant update in years. Here\'s what changed and why it matters to collectors.',
  },
  {
    source: 'Fratello',
    date: 'Apr 20, 2026',
    headline: 'Why the Royal Oak\'s Value Story Is Far From Over',
    excerpt:
      'Market corrections notwithstanding, the AP Royal Oak remains one of the most resilient references on the secondary market.',
  },
  {
    source: 'Monochrome',
    date: 'Apr 18, 2026',
    headline: 'Patek Philippe Nautilus: A Complete Reference Guide',
    excerpt:
      'From the original 3700 to the final 5711, every Nautilus reference carries its own story. The definitive collector\'s guide.',
  },
]

export default function HomePage() {
  return (
    <>
      {/* ── Section 1: Hero ── */}
      <section className="flex flex-col md:flex-row items-center gap-10 md:gap-16 px-6 md:px-12 py-16 md:py-24 max-w-7xl mx-auto">
        {/* Text column */}
        <div className="flex-1 min-w-0">
          <h1
            className="font-serif text-ink"
            style={{
              fontSize: 'clamp(3rem, 5.5vw, 4.75rem)',
              lineHeight: 1.06,
              fontWeight: 600,
              marginBottom: '20px',
            }}
          >
            Showcase Your
            <br />
            Timepieces.
          </h1>
          <p
            className="font-sans"
            style={{
              fontSize: '1.05rem',
              lineHeight: 1.7,
              color: '#A89880',
              maxWidth: '420px',
              marginBottom: '36px',
            }}
          >
            The digital home for every watch collector. Organize what you own,
            explore what you want, discover what&apos;s next.
          </p>
          <div className="flex gap-3 flex-wrap">
            <button
              className="font-sans"
              style={{
                backgroundColor: '#1A1410',
                color: '#FAF8F4',
                padding: '13px 30px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                letterSpacing: '0.07em',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Build Your Box
            </button>
            <button
              className="font-sans"
              style={{
                backgroundColor: 'transparent',
                color: '#1A1410',
                padding: '13px 30px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                letterSpacing: '0.07em',
                border: '1px solid #E8E2D8',
                cursor: 'pointer',
              }}
            >
              Explore Watches
            </button>
          </div>
        </div>

        {/* WatchBox column — ~55% on desktop */}
        <div className="w-full md:w-[55%] flex-shrink-0">
          <WatchBox />
        </div>
      </section>

      {/* ── Section 2: Feature strip ── */}
      <section
        className="px-6 md:px-12 py-14"
        style={{ borderTop: '1px solid #E8E2D8' }}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 max-w-7xl mx-auto">
          {features.map((f) => (
            <div key={f.label}>
              <div style={{ marginBottom: '12px' }}>{f.icon}</div>
              <h3
                className="font-sans text-ink"
                style={{
                  fontSize: '0.83rem',
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                  marginBottom: '7px',
                }}
              >
                {f.label}
              </h3>
              <p
                className="font-sans"
                style={{
                  fontSize: '0.77rem',
                  color: '#A89880',
                  lineHeight: 1.6,
                }}
              >
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Section 3: Newsfeed teaser ── */}
      <section
        className="px-6 md:px-12 py-14"
        style={{ borderTop: '1px solid #E8E2D8' }}
      >
        <div className="max-w-7xl mx-auto">
          <div
            className="flex items-baseline justify-between"
            style={{ marginBottom: '32px' }}
          >
            <h2
              className="font-serif text-ink"
              style={{ fontSize: '1.9rem', fontWeight: 500 }}
            >
              From the Watch World
            </h2>
            <a
              href="#"
              className="font-sans"
              style={{
                fontSize: '0.75rem',
                color: '#A89880',
                letterSpacing: '0.04em',
                textDecoration: 'none',
              }}
            >
              See All News →
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {articles.map((a) => (
              <article key={a.headline} style={{ cursor: 'pointer' }}>
                {/* Image placeholder */}
                <div
                  className="w-full rounded-lg"
                  style={{
                    aspectRatio: '16/9',
                    backgroundColor: '#EDE9E2',
                    marginBottom: '16px',
                  }}
                />
                <p
                  className="font-sans"
                  style={{
                    fontSize: '0.65rem',
                    color: '#A89880',
                    letterSpacing: '0.05em',
                    marginBottom: '7px',
                  }}
                >
                  {a.source} · {a.date}
                </p>
                <h3
                  className="font-serif text-ink"
                  style={{
                    fontSize: '1.1rem',
                    fontWeight: 500,
                    lineHeight: 1.3,
                    marginBottom: '8px',
                  }}
                >
                  {a.headline}
                </h3>
                <p
                  className="font-sans"
                  style={{
                    fontSize: '0.77rem',
                    color: '#A89880',
                    lineHeight: 1.6,
                  }}
                >
                  {a.excerpt}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Footer spacer */}
      <div style={{ height: '80px' }} />
    </>
  )
}
