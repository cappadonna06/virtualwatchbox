import type { Metadata, Viewport } from 'next'
import { Cormorant_Garamond, DM_Sans } from 'next/font/google'
import './globals.css'
import NavBar from '@/components/NavBar'
import Footer from '@/components/Footer'
import { AuthProvider } from '@/lib/auth/AuthProvider'
import { CollectionSessionProvider } from './collection/CollectionSessionProvider'
import { WatchImagesProvider } from '@/lib/watchImages/WatchImagesProvider'
import { CatalogProvider } from '@/lib/catalog/CatalogProvider'
import SiteAnalytics from '@/components/SiteAnalytics'
import { publicPages, SITE_URL } from '@/lib/siteMetadata'

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

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAF8F4' },
    { media: '(prefers-color-scheme: dark)', color: '#1A1410' },
  ],
}

export const metadata: Metadata = {
  title: {
    default: 'Virtual Watchbox',
    template: '%s | Virtual Watchbox',
  },
  metadataBase: new URL(SITE_URL),
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon-48.png', type: 'image/png', sizes: '48x48' },
      { url: '/favicon-32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-16.png', type: 'image/png', sizes: '16x16' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
  },
  manifest: '/manifest.webmanifest',
  applicationName: 'Virtual Watchbox',
  appleWebApp: {
    capable: true,
    title: 'Virtual Watchbox',
    statusBarStyle: 'default',
  },
  formatDetection: {
    telephone: false,
  },
}

const STRUCTURED_DATA = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Virtual Watchbox',
    url: SITE_URL,
    description: publicPages['/'].description,
    inLanguage: 'en-US',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Virtual Watchbox',
    url: SITE_URL,
    logo: `${SITE_URL}/icon.svg`,
  },
]

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cormorant.variable} ${dmSans.variable}`}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
        />
        <AuthProvider>
          <CatalogProvider>
            <CollectionSessionProvider>
              <WatchImagesProvider>
                <NavBar />

                <main className="site-main" style={{ maxWidth: 1280, margin: '0 auto' }}>{children}</main>
                <Footer />
              </WatchImagesProvider>
            </CollectionSessionProvider>
          </CatalogProvider>
        </AuthProvider>
        <SiteAnalytics />
      </body>
    </html>
  )
}
