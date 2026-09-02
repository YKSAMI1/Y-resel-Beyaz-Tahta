/** @type {import('next').NextConfig} */
const nextConfig = {
  // Neon veritabani - Vercel free tier'da env var yoksa bu kullanilir
  env: {
    POSTGRES_URL: process.env.POSTGRES_URL || 'postgresql://whiteboard:8%26oqO%25YsB4oJPC%24Rhn9gP@yikimdara.com.tr:5432/whiteboard_db',
  },
  // Allow images from any source for whiteboard image uploads
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Increase body size limit for large whiteboard data
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
}

module.exports = nextConfig
