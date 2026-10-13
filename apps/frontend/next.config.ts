import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Prevent browser source map generation in production builds */
  productionBrowserSourceMaps: false,
};

export default nextConfig;
