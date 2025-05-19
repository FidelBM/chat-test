import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "signlink.s3.amazonaws.com",
      },
    ],
  },
};

export default nextConfig;
