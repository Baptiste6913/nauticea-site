import type { Metadata } from "next";
import PageAnnonces from "@/components/PageAnnonces";
import { getBoats } from "@/lib/sources/corpus";

export const metadata: Metadata = {
  title: "Annonces bateaux neufs et occasions",
  description:
    "Toutes les annonces de bateaux moteur, voiliers et catamarans, neufs et occasions, chez Nauticea Yachting à Port Fréjus.",
  alternates: { canonical: "/annonces" },
};

export default function Annonces() {
  return (
    <PageAnnonces
      titre="Annonces bateaux"
      intro="Bateaux moteur, voiliers et catamarans, neufs et occasions, visibles à Port Fréjus."
      boats={getBoats()}
    />
  );
}
