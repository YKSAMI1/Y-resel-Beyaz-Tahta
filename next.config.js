/** @type {import('next').NextConfig} */
const nextConfig = {
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
