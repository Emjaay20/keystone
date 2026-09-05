import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@keystone/shared", "@keystone/domain"],
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js", ".jsx"],
      ".mjs": [".mts", ".mjs"],
      ".cjs": [".cts", ".cjs"],
    };
    return config;
  },
};

export default nextConfig;
