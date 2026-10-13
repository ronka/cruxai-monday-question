const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [],
  },
  webpack: (config, { isServer }) => {
    // sql.js ships Node branches that are never used in the browser.
    if (!isServer)
      config.resolve.fallback = { ...config.resolve.fallback, fs: false, path: false, crypto: false };
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, './src'),
    };
    return config;
  },
};

module.exports = nextConfig;

