/** @type {import('next').NextConfig} */
const nextConfig = {
  // PWA headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
  // Imágenes de uploads
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'app.aurosolar.es',
      },
    ],
  },
};

module.exports = nextConfig;
