import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['nitrostack'],
  // Avoid picking a parent lockfile (e.g. C:\Users\...\package-lock.json) as workspace root
  outputFileTracingRoot: path.join(__dirname),

  // Static export for production builds
  ...(process.env.NODE_ENV === 'production' && {
    output: 'export',
    distDir: 'out',
    images: {
      unoptimized: true,
    },
  }),

  // Development optimizations to prevent cache corruption
  ...(process.env.NODE_ENV === 'development' && {
    webpack: (config, { isServer }) => {
      if (config.cache && config.cache.type === 'filesystem') {
        config.cache = {
          type: 'memory',
        };
      }

      if (!isServer) {
        config.cache = false;
      }

      return config;
    },

    // Next 15: buildActivity flags removed; position still supported
    devIndicators: {
      position: 'bottom-right',
    },

    compress: false,
  }),
};

export default nextConfig;
