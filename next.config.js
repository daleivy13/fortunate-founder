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

module.exports = nextConfig;
