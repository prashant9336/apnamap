import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  experimental: {
    // Allows server actions
    serverActions: {
      allowedOrigins: ["localhost:3000", "apnamap.com", "*.apnamap.com"],
    },
  },
};

export default nextConfig;
