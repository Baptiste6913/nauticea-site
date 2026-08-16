import type { Metadata } from "next";
import PageAnnonces from "@/components/PageAnnonces";
import { getBoats } from "@/lib/sources/corpus";

export const metadata: Metadata = {
  title: "Stock neuf Sealine et RYCK",
  description:
    "Bateaux neufs Sealine et RYCK disponibles chez Nauticea Yachting à Port Fréjus.",
  alternates: { canonical: "/stock-neuf" },
};

export default function StockNeuf() {
  return (
    <PageAnnonces
      titre="Stock neuf"
      intro="Bateaux neufs Sealine et RYCK disponibles ou en commande chez Nauticea Yachting."
      boats={getBoats().filter((b) => b.etat === "neuf")}
      filtreEtatInitial="neuf"
      masquerFiltreEtat
      avecTableau
    />
  );
}
