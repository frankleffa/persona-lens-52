import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://adscape.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // áreas autenticadas não precisam ser indexadas
        disallow: ["/dashboard", "/campanhas", "/clientes", "/crm", "/conexoes", "/relatorios", "/execucao", "/configuracoes", "/auth"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
