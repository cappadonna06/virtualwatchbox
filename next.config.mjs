/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // Supabase Storage public objects (catalog images + user-uploaded watch photos).
      // Pathname is constrained to public objects so signed/private URLs aren't accidentally proxied.
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

export default nextConfig
