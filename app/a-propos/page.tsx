import type { Metadata } from "next";
import Link from "next/link";
import { typoFr } from "@/lib/format";

export const metadata: Metadata = {
  title: "À propos",
  description:
    "Nauticea Yachting, concessionnaire exclusif Sealine et RYCK à Port Fréjus : vente de bateaux neufs et occasions, service après-vente, hivernage, places de port.",
  alternates: { canonical: "/a-propos" },
};

// Texte de la page « A propos » du site actuel (corpus).
const PARAGRAPHES = [
  "Concessionnaire exclusif des marques de yachts Sealine et Ryck, Nauticea Yachting vous accueille à Port Fréjus sur la Côte d'Azur.",
  "Concernant SEALINE, nous avons les modèles S 335 basé à Port-Fréjus et C 335 ainsi que tous les éléments concernant d'autres nouveaux modèles tel que le tout nouveau S390 présenté au salon de Cannes 2022 ou le F430 avec son fly.",
  "Vous pourrez également découvrir et essayer le nouveau Ryck 280.",
  "Nous offrons un service après-vente complet à nos clients, y compris, l'hivernage sur parc. Nos ateliers sont parfaitement équipés pour tous travaux de maintenance avec engins de manutention de levage ainsi qu'un personnel qualifié comprenant mécaniciens et techniciens.",
  "Pour vos bateaux à moteurs nous disposons d'un stock important de pièces de rechange des marques VOLVO et MERCURY. Nous pouvons également vous aider à obtenir le financement par L.O.A de votre bateau ainsi que des devis d'assurances.",
  "Nous avons à votre disposition un département achat / vente de places de port.",
  "N'hésitez pas à prendre contact avec nous pour de plus amples renseignements.",
];

export default function APropos() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-display-l font-bold text-marine md:text-display-xl">
        À propos de Nauticea Yachting
      </h1>
      <div className="mt-6 space-y-4 leading-relaxed text-encre/90">
        {PARAGRAPHES.map((p) => (
          <p key={p.slice(0, 32)}>{typoFr(p)}</p>
        ))}
      </div>
      <p className="mt-8">
        <Link
          href="/contact"
          className="inline-block rounded bg-marine px-5 py-2.5 font-semibold text-white hover:bg-marine-2"
        >
          Nous contacter
        </Link>
      </p>
    </div>
  );
}
