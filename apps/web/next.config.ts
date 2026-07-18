import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/share/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store, max-age=0" },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: "/collections", destination: "/boards", permanent: true },
      { source: "/add", destination: "/record", permanent: true },
      { source: "/add/:path*", destination: "/record", permanent: true },
      { source: "/town", destination: "/walk", permanent: true },
      {
        source: "/onboarding/welcome",
        destination: "/onboarding/profile",
        permanent: false,
      },
      {
        source: "/onboarding/preferences",
        destination: "/onboarding/complete",
        permanent: true,
      },
      {
        source: "/onboarding/theme",
        destination: "/onboarding/complete",
        permanent: true,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;

if (process.env.NODE_ENV === "development") {
  initOpenNextCloudflareForDev();
}
