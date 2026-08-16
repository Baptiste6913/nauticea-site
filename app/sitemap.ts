import type { MetadataRoute } from "next";
import { getBoats, getCategoriesAvecStock } from "@/lib/sources/corpus";
import { actualitesActives, lireActualitesContenu } from "@/lib/contenu";
import { SITE } from "@/lib/site";

// Sitemap aligné sur l'inventaire réel (directive finale W2) : les
// pages sans contenu (catégories sans stock, actualités vides) restent
// servies par leur URL mais sortent du sitemap et de la navigation.
export default function sitemap(): MetadataRoute.Sitemap {
  const categories = getCategoriesAvecStock();
  const statiques = [
    "",
    "/a-propos",
    "/marques",
    "/annonces",
    ...categories.map((c) => `/annonces/${c}`),
    "/stock-neuf",
    "/occasions",
    "/places-de-port",
    "/projet",
    "/contact",
    "/carte",
    "/mentions-legales",
  ];
  if (process.env.NEXT_PUBLIC_GAMME_NEUVE === "1") {
    statiques.push("/gamme-neuve");
  }

  const pages = statiques.map((p) => ({
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

  // Actualités : hors sitemap tant que la section n'est pas réactivée
  // (nettoyage du 15/08). Seules les actus éditoriales de 2026 et plus
  // y figurent : les anciennes du corpus (2022) restent servies par
  // leur URL, cibles de 301, mais hors liste et hors sitemap.
  const actus = actualitesActives()
    ? [
        {
          url: `${SITE.url}/actualites`,
          changeFrequency: "weekly" as const,
          priority: 0.6,
        },
        ...lireActualitesContenu()
          .filter((a) => Number(a.date.slice(0, 4)) >= 2026)
          .map((a) => ({
            url: `${SITE.url}/actualites/${a.slug}`,
            changeFrequency: "monthly" as const,
            priority: 0.6,
          })),
      ]
    : [];

  return [...pages, ...annonces, ...actus];
}
