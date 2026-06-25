import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://adscape.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/precos", "/privacidade", "/termos", "/auth"];
  return routes.map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.6,
  }));
}
