import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: [],
  turbopack: {
    root: path.join(__dirname, "../.."),
  },
};

export default nextConfig;
