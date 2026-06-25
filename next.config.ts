import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lint roda no build; o código antigo (legacy/) é ignorado em eslint.config.js.
  eslint: { dirs: ["src"] },
};

export default nextConfig;
