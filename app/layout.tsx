import type { Metadata, Viewport } from 'next'
import { Cormorant_Garamond, DM_Sans } from 'next/font/google'
import './globals.css'
import NavBar from '@/components/NavBar'
import { CollectionSessionProvider } from './collection/CollectionSessionProvider'

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

const BASE_URL = 'https://virtualwatchbox.com'

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAF8F4' },
    { media: '(prefers-color-scheme: dark)', color: '#1A1410' },
  ],
}

export const metadata: Metadata = {
  title: {
    default: 'Virtual Watchbox — Showcase Your Timepieces. Discover What\'s Next.',
    template: '%s | Virtual Watchbox',
  },
  description: 'The definitive digital home for watch collectors.',
  keywords: [
    'online watchbox',
    'online watch collection',
    'virtual watch collection',
    'watch collector app',
    'digital watch display',
    'watch portfolio tracker',
    'watch collection manager',
    'virtual watch box',
    'digital watchbox',
    'watch collection app',
    'luxury watch collector',
    'watch collection tracker',
    'watch showcase',
    'watch display app',
    'watch portfolio',
    'horology app',
    'watch enthusiast platform',
    'curate watch collection',
    'organize watch collection',
    'watch wishlist app',
  ],
  metadataBase: new URL(BASE_URL),
  alternates: {
    canonical: '/',
  },
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
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: BASE_URL,
    siteName: 'Virtual Watchbox',
    title: 'Showcase Your Timepieces. Discover What\'s Next.',
    description: 'The definitive digital home for watch collectors.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Virtual Watchbox — The digital home for watch collectors',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@virtualwatchbox',
    creator: '@virtualwatchbox',
    title: 'Showcase Your Timepieces. Discover What\'s Next.',
    description: 'The definitive digital home for watch collectors.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cormorant.variable} ${dmSans.variable}`}>
      <body>
        <CollectionSessionProvider>
          <NavBar />

          <main style={{ maxWidth: 1280, margin: '0 auto' }}>{children}</main>
        </CollectionSessionProvider>
      </body>
    </html>
  )
}
