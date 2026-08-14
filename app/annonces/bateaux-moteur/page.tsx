import type { Metadata } from "next";
import PageAnnonces from "@/components/PageAnnonces";
import { getBoats } from "@/lib/sources/corpus";

export const metadata: Metadata = {
  title: "Bateaux moteur neufs et occasions",
  description:
    "Annonces de bateaux moteur neufs et occasions chez Nauticea Yachting à Port Fréjus : vedettes, flybridges, coupés, trawlers.",
  alternates: { canonical: "/annonces/bateaux-moteur" },
};

export default function BateauxMoteur() {
  return (
    <PageAnnonces
      titre="Bateaux moteur"
      boats={getBoats().filter((b) => b.categorie === "bateaux-moteur")}
      categorieActive="bateaux-moteur"
    />
  );
}
