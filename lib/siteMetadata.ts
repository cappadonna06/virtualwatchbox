import type { Metadata } from 'next'

export const SITE_URL = 'https://virtualwatchbox.com'

export const privatePageMetadata: Metadata = {
  alternates: null,
  openGraph: null,
  twitter: null,
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
}

export const publicPages = {
  '/': {
    title: 'Virtual Watchbox | Watch Collection Tracker & Dream Box Builder',
    description: 'Build a digital watch box for your collection, track service records, and plan your next watch. Try the Playground to create a dream collection for free.',
  },
  '/collection': {
    title: 'Watch Collection Tracker',
    description: 'Organize the watches you own in a virtual watch box. Keep photos and ownership details together and see your collection at a glance.',
  },
  '/playground': {
    title: 'Build a Dream Watch Collection',
    description: 'Build a dream watch box with real watch references, try different lineups, and plan what to buy next. Free to start without an account.',
  },
  '/discover': {
    title: 'Discover Your Next Watch',
    description: 'Explore what could round out your watch collection, find upgrade ideas, and keep a shortlist of watches you want to buy.',
  },
  '/service-room': {
    title: 'Watch Service History & Maintenance',
    description: 'Keep watch service dates, receipts, and warranty documents together. See when each watch in your collection may be due for service.',
  },
  '/collection/straps/studio': {
    title: 'Watch Strap Studio',
    description: 'Preview different colors and materials on supported watch references, or compare a watch and strap side by side.',
  },
  '/news': {
    title: 'Watch News',
    description: 'Browse headlines from watch publications and keep up with the brands and watches you follow.',
  },
  '/guides/three-watch-collection': {
    title: 'How to Build a Three-Watch Collection Under $5,000',
    description: 'See a $4,625 three-watch lineup with a Hamilton Murph, a NOMOS Tangente, and a Seiko diver. Use the Playground to build your own.',
  },
  '/privacy': {
    title: 'Privacy Policy',
    description: 'How Virtual Watchbox handles account and collection data.',
  },
  '/terms': {
    title: 'Terms of Use',
    description: 'The terms for using Virtual Watchbox.',
  },
} satisfies Record<string, { title: string; description: string }>

export function publicPageMetadata(path: keyof typeof publicPages): Metadata {
  const { title, description } = publicPages[path]
  const socialTitle = path === '/' ? title : `${title} | Virtual Watchbox`
  return {
    title: path === '/' ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      locale: 'en_US',
      url: path,
      siteName: 'Virtual Watchbox',
      title: socialTitle,
      description,
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Virtual Watchbox' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: socialTitle,
      description,
      images: ['/og-image.png'],
    },
  }
}
