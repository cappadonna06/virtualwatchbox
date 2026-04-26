import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Virtual Watchbox',
    short_name: 'Watchbox',
    description: 'The definitive digital home for watch collectors.',
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
        src: '/favicon-16x16.png',
        sizes: '16x16',
        type: 'image/png',
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
        src: '/og-image.png',
        sizes: '1200x630',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
