import path from "node:path";
import type { NextConfig } from "next";

// `proxy.ts` imports ConvexHttpClient from `convex/browser`. On the Node.js
// runtime that Next.js 16 uses for proxy, that export resolves to the Node
// build, which calls createRequire(".") to load the `ws` client. Netlify
// bundles that proxy as an Edge Function and rejects that call. The HTTP
// client is the same fetch implementation in the browser build.
const convexBrowserHttpClient = path.join(
  process.cwd(),
  "node_modules/convex/dist/esm/browser/http_client.js",
);

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    globalNotFound: true,
    optimizeCss: true,
    // Pin packs used by nav/sidebar; react-icons/* is also optimized by default
    optimizePackageImports: [
      'react-icons/fc',
      'react-icons/md',
      'react-icons/io5',
      'react-icons/rx',
      'lucide-react',
    ],
  },
  turbopack: {
    resolveAlias: {
      "convex/browser": "./node_modules/convex/dist/esm/browser/http_client.js",
    },
  },
  webpack: (config) => {
    config.resolve ??= {};
    const alias = config.resolve.alias;
    if (Array.isArray(alias)) {
      alias.push({
        name: "convex/browser$",
        alias: convexBrowserHttpClient,
      });
    } else {
      config.resolve.alias = {
        ...(alias ?? {}),
        "convex/browser$": convexBrowserHttpClient,
      };
    }
    return config;
  },
  images: {
    formats: ['image/webp', 'image/avif'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
    ],
  },
  compress: true,
  poweredByHeader: false,
  async redirects() {
    return [
      { source: '/admin/userRole', destination: '/admin/user', permanent: false },
      { source: '/admin/userRole/edit', destination: '/admin/user', permanent: false },
    ];
  },
  async headers() {
    const contentSecurityPolicy = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://res.cloudinary.com https://img.clerk.com",
      "font-src 'self' data:",
      "connect-src 'self' https://*.convex.cloud https://*.convex.site wss://*.convex.cloud https://*.clerk.accounts.dev https://*.clerk.com https://clerk-telemetry.com https://api.cloudinary.com",
      "frame-src 'self' https://*.clerk.accounts.dev https://challenges.cloudflare.com",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
    ].join('; ');

    const headers = [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
      { key: 'Content-Security-Policy', value: contentSecurityPolicy },
    ];
    if (process.env.NODE_ENV === 'production') {
      headers.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains',
      });
    }

    return [{ source: '/(.*)', headers }];
  },
};

export default nextConfig;
