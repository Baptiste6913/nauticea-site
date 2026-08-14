import type { MetadataRoute } from "next";
import { getActualites, getBoats } from "@/lib/sources/corpus";
import { SITE } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const statiques = [
    "",
    "/a-propos",
    "/actualites",
    "/marques",
    "/annonces",
    "/annonces/bateaux-moteur",
    "/annonces/voiliers",
    "/annonces/catamaran",
    "/stock-neuf",
    "/occasions",
    "/places-de-port",
    "/contact",
    "/carte",
    "/mentions-legales",
  ].map((p) => ({
    url: `${SITE.url}${p}`,
    changeFrequency: "weekly" as const,
    priority: p === "" ? 1 : 0.7,
  }));

  const annonces = getBoats().map((b) => ({
    url: `${SITE.url}/annonces/${b.slug}`,
    lastModified: b.updated_at,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const actus = getActualites().map((a) => ({
    url: `${SITE.url}/actualites/${a.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  return [...statiques, ...annonces, ...actus];
}
