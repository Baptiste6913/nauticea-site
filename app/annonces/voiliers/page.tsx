import type { Metadata } from "next";
import PageAnnonces from "@/components/PageAnnonces";
import { getBoats } from "@/lib/sources/corpus";

export const metadata: Metadata = {
  title: "Voiliers neufs et occasions",
  description:
    "Annonces de voiliers neufs et occasions chez Nauticea Yachting à Port Fréjus.",
  alternates: { canonical: "/annonces/voiliers" },
};

// Décision client (retours du 16/08, V2) : la catégorie Voiliers reste
// visible en navigation et au sitemap même à stock vide, avec cet état
// vide dédié.
export default function Voiliers() {
  return (
    <PageAnnonces
      titre="Voiliers"
      boats={getBoats().filter((b) => b.categorie === "voiliers")}
      categorieActive="voiliers"
      messageVide="Aucun voilier disponible actuellement. Contactez-nous."
    />
  );
}
