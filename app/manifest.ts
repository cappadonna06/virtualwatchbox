import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Virtual Watchbox',
    short_name: 'Watchbox',
    description:
      'Virtual Watchbox is the digital home for watch collectors. Showcase what you own, follow what you love, and discover what’s next.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FAF8F4',
    theme_color: '#C9A84C',
    orientation: 'portrait-primary',
    scope: '/',
    lang: 'en',
    categories: ['lifestyle', 'shopping', 'utilities'],
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/favicon-32x32.png',
        sizes: '32x32',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
