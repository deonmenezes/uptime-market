import type { MetadataRoute } from "next";

const SITE_URL = "https://culumus.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["/", "/agents", "/oracle"];
  return pages.map((path, index) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "/" ? "hourly" : "daily",
    priority: index === 0 ? 1 : 0.7,
  }));
}
