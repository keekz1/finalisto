/** @type {import('next').NextConfig} */
const nextConfig = {
  // Core Features (auto-configured)
  reactStrictMode: true,
  swcMinify: true, // Enabled by default in Next.js 13+
  transpilePackages: [], // For monorepo support

  // Image Optimization
  images: {
    domains: [],
    formats: ['image/webp'],
    minimumCacheTTL: 60,
  },

  // Development Settings
  devIndicators: {
    buildActivity: true,
    buildActivityPosition: 'bottom-right',
  },

  // Production Optimization (auto-applied)
  compress: true,
  productionBrowserSourceMaps: false,

  // Webpack (default behavior)
  webpack: (config) => config,

  // Disable Turbopack
  experimental: {
    turboMode: false,
  },
};

module.exports = nextConfig;
