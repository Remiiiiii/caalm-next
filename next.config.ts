import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false, // Remove X-Powered-By header for security

  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: true,
  },

  // ESLint configuration
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Compiler options
  compiler: {
    removeConsole:
      process.env.NODE_ENV === 'production'
        ? {
            exclude: ['error', 'warn'],
          }
        : false,
  },

  // Webpack configuration for bundle optimization
  webpack: (config, { isServer }) => {
    // Optimize chunk splitting
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
        runtimeChunk: 'single',
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Separate vendor chunk for large libraries
            framework: {
              name: 'framework',
              chunks: 'all',
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription)[\\/]/,
              priority: 40,
              enforce: true,
            },
            // UI components chunk
            ui: {
              name: 'ui',
              test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
              priority: 30,
              enforce: true,
            },
            // Utilities chunk
            utilities: {
              name: 'utilities',
              test: /[\\/]node_modules[\\/](date-fns|lodash)[\\/]/,
              priority: 20,
              enforce: true,
            },
            // Shared chunks
            common: {
              name: 'common',
              minChunks: 2,
              priority: 10,
              reuseExistingChunk: true,
              enforce: true,
            },
          },
        },
      };
    }

    return config;
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
