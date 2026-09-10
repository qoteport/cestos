import { imageHosts } from './image-hosts.config.mjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  productionBrowserSourceMaps: false,
  async rewrites() {
    const rawUrl = process.env.CESTOS_API_URL || 'http://127.0.0.1:8000';
    // If the URL points to localhost/127.0.0.1, check for a remote override
    const isLocal = /127\.0\.0\.1|localhost/.test(rawUrl);
    const backend = (isLocal
      ? (process.env.CESTOS_API_URL_REMOTE || rawUrl)
      : rawUrl
    ).replace(/\/$/, '');
    return [{ source: '/api/:path*', destination: `${backend}/api/:path*` }];
  },
  distDir: process.env.DIST_DIR || '.next',
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: imageHosts,
    minimumCacheTTL: 60,
    qualities: [75, 85, 100],
  },
  webpack(
    config,
    {
      dev: dev
    }
  ) {
    if (dev) {
      config.module.rules.push({
        test: /\.(jsx|tsx)$/,
        exclude: [/node_modules/],
        use: [{
          loader: '@dhiwise/component-tagger/nextLoader',
        }],
      });
      const ignoredPaths = (process.env.WATCH_IGNORED_PATHS || '')
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);
      config.watchOptions = {
        ignored: ignoredPaths.length
          ? ignoredPaths.map((p) => `**/${p.replace(/^\/+|\/+$/g, '')}/**`)
          : undefined,
      };
    }
    return config;
  },
};
export default nextConfig;