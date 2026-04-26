import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/_next/', '/admin/', '/auth/'],
      },
    ],
    sitemap: 'https://virtualwatchbox.com/sitemap.xml',
    host: 'https://virtualwatchbox.com',
  }
}
