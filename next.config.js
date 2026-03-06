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
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
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
