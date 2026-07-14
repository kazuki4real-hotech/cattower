import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/collections", destination: "/boards", permanent: true },
      { source: "/add", destination: "/record", permanent: true },
      { source: "/add/:path*", destination: "/record", permanent: true },
      { source: "/town", destination: "/walk", permanent: true },
      { source: "/onboarding/preferences", destination: "/onboarding/complete", permanent: true },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      }
    ],
  },
};

export default nextConfig;

if (process.env.NODE_ENV === "development") {
  initOpenNextCloudflareForDev();
}
