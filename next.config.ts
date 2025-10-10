import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  compress: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Hide error details in production
  ...(process.env.NODE_ENV === 'production' && {
    experimental: {
      serverComponentsExternalPackages: [],
    },
  }),
  experimental: {
    serverActions: {
      bodySizeLimit: '100MB',
    },
  },
  // Disable caching in development
  ...(process.env.NODE_ENV === 'development' && {
    onDemandEntries: {
      maxInactiveAge: 25 * 1000,
      pagesBufferLength: 2,
    },
  }),
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.pixabay.com',
      },
      {
        protocol: 'https',
        hostname: 'img.freepik.com',
      },
      {
        protocol: 'https',
        hostname: 'cloud.appwrite.io',
      },
      {
        protocol: 'https',
        hostname: 'api.qrserver.com',
      },
    ],
  },
  async headers() {
    return [
      // Static assets - cache aggressively in production, disable in dev
      {
        source: '/:all*(js|css|svg|png|jpg|jpeg|gif|webp|avif)',
        headers: [
          {
            key: 'Cache-Control',
            value:
              process.env.NODE_ENV === 'development'
                ? 'no-cache, no-store, must-revalidate'
                : 'public, max-age=31536000, immutable',
          },
        ],
      },
      // HTML/page routes - disable caching in development
      {
        source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
        headers: [
          {
            key: 'Cache-Control',
            value:
              process.env.NODE_ENV === 'development'
                ? 'no-cache, no-store, must-revalidate, max-age=0'
                : 'public, max-age=0, must-revalidate',
          },
        ],
      },
      // Analytics routes
      {
        source: '/analytics/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate, max-age=0',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
          {
            key: 'Last-Modified',
            value: new Date().toUTCString(),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
