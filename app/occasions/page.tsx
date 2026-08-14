import type { Metadata } from "next";
import PageAnnonces from "@/components/PageAnnonces";
import { getBoats } from "@/lib/sources/corpus";

export const metadata: Metadata = {
  title: "Bateaux d'occasion",
  description:
    "Bateaux d'occasion sélectionnés et suivis par Nauticea Yachting à Port Fréjus.",
  alternates: { canonical: "/occasions" },
};

export default function Occasions() {
  return (
    <PageAnnonces
      titre="Occasions"
      intro="Bateaux d'occasion visibles à Port Fréjus, sélectionnés et suivis par Nauticea Yachting."
      boats={getBoats().filter((b) => b.etat === "occasion")}
      filtreEtatInitial="occasion"
      masquerFiltreEtat
    />
  );
}
