import type { Metadata } from "next";
import PageAnnonces from "@/components/PageAnnonces";
import { getBoats } from "@/lib/sources/corpus";

export const metadata: Metadata = {
  title: "Catamarans neufs et occasions",
  description:
    "Annonces de catamarans neufs et occasions chez Nauticea Yachting à Port Fréjus.",
  alternates: { canonical: "/annonces/catamaran" },
};

export default function Catamaran() {
  return (
    <PageAnnonces
      titre="Catamaran"
      boats={getBoats().filter((b) => b.categorie === "catamaran")}
      categorieActive="catamaran"
    />
  );
}
