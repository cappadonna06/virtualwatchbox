import type { Metadata } from 'next'
import { Cormorant_Garamond, DM_Sans } from 'next/font/google'
import './globals.css'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-dm-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Virtual Watchbox — Showcase Your Timepieces',
  description:
    'The digital home for every watch collector. Display and organize your collection, discover what\'s next, and connect with the market — all in one place.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${cormorant.variable} ${dmSans.variable}`}>
      <body>
        <header
          className="sticky top-0 z-50 flex items-center justify-between px-6 md:px-12 h-14"
          style={{
            backgroundColor: '#FAF8F4',
            borderBottom: '1px solid #E8E2D8',
          }}
        >
          <span
            className="font-serif text-ink"
            style={{
              fontSize: '1rem',
              letterSpacing: '0.18em',
              fontWeight: 500,
            }}
          >
            VIRTUAL WATCHBOX
          </span>

          <nav className="hidden md:flex items-center gap-7">
            {['My Collection', 'Playground', 'Newsfeed'].map((link) => (
              <a
                key={link}
                href="#"
                className="font-sans text-ink transition-colors"
                style={{
                  fontSize: '0.72rem',
                  letterSpacing: '0.08em',
                  textDecoration: 'none',
                  color: '#1A1410',
                }}
              >
                {link}
              </a>
            ))}
          </nav>

          {/* Mobile hamburger */}
          <button
            className="md:hidden"
            aria-label="Open menu"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1A1410' }}
          >
            <svg width="20" height="16" viewBox="0 0 20 16" fill="currentColor">
              <rect y="0" width="20" height="1.8" rx="0.9" />
              <rect y="7" width="20" height="1.8" rx="0.9" />
              <rect y="14" width="20" height="1.8" rx="0.9" />
            </svg>
          </button>
        </header>

        <main>{children}</main>
      </body>
    </html>
  )
}
