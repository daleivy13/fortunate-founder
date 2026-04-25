const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: false,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      // Cache API GET responses for offline reads (network-first, fallback to cache)
      {
        urlPattern: /^\/api\/(pools|routes|reports|work-orders|invoices|analytics|employees|inventory|mileage|weather)/,
        handler: "NetworkFirst",
        options: {
          cacheName: "api-cache",
          expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 }, // 24h
          networkTimeoutSeconds: 5,
        },
      },
      // Cache static pages shell
      {
        urlPattern: /^\/(dashboard|pools|routes|reports|work-orders|invoices|analytics)/,
        handler: "NetworkFirst",
        options: {
          cacheName: "pages-cache",
          expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 },
          networkTimeoutSeconds: 3,
        },
      },
    ],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { allowedOrigins: ["localhost:3000"] },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        {
          key: "Cross-Origin-Opener-Policy",
          value: "same-origin-allow-popups",
        },
      ],
    },
  ],
};

module.exports = withPWA(nextConfig);
