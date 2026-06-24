import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Transitório durante a recriação: o código antigo vive em legacy/ (fora do build).
  // Reabilitar quando a migração das telas estiver concluída.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
