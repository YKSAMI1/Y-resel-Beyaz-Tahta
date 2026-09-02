/** @type {import('next').NextConfig} */
const nextConfig = {
  // Neon veritabani - Vercel free tier'da env var yoksa bu kullanilir
  env: {
    POSTGRES_URL: process.env.POSTGRES_URL || 'postgresql://neondb_owner:npg_EplT5vBmrPJ0@ep-holy-bread-b1pcur1x-pooler.c-5.eu-central-1.aws.neon.tech/neondb?sslmode=require',
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
