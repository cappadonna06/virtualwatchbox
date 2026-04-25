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
    "The digital home for every watch collector. Display and organize your collection, discover what's next, and connect with the market — all in one place.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cormorant.variable} ${dmSans.variable}`}>
      <body>
        <nav
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '20px 56px',
            borderBottom: '1px solid #EAE5DC',
            background: '#FAF8F4',
            position: 'sticky', top: 0, zIndex: 100,
          }}
        >
          <span style={{ fontFamily: 'var(--font-cormorant)', fontSize: 20, fontWeight: 500, letterSpacing: '0.03em', color: '#1A1410' }}>
            Virtual Watchbox
          </span>

          <div style={{ display: 'flex', gap: 32 }}>
            {['My Collection', 'Playground', 'Discover', 'News'].map(link => (
              <a
                key={link}
                href="#"
                style={{
                  fontFamily: 'var(--font-dm-sans)', fontSize: 12, fontWeight: 400,
                  letterSpacing: '0.04em', color: '#A89880',
                  textDecoration: 'none', cursor: 'pointer',
                }}
              >
                {link}
              </a>
            ))}
          </div>

          <button
            style={{
              fontFamily: 'var(--font-dm-sans)', fontSize: 11, fontWeight: 500,
              letterSpacing: '0.08em', padding: '9px 22px',
              background: '#1A1410', color: '#FAF8F4',
              border: 'none', borderRadius: 4, cursor: 'pointer',
            }}
          >
            Sign In
          </button>
        </nav>

        <main>{children}</main>
      </body>
    </html>
  )
}
