import type { Metadata } from "next";
import Link from "next/link";
import { lireContenu } from "@/lib/contenu";
import { typoFr } from "@/lib/format";

export const metadata: Metadata = {
  title: "À propos",
  description:
    "Nauticea Yachting, concessionnaire exclusif Sealine et RYCK à Port Fréjus : vente de bateaux neufs et occasions, service après-vente, hivernage, places de port.",
  alternates: { canonical: "/a-propos" },
};

// Texte éditable dans content/a-propos.md (GitHub, sans session).
export default function APropos() {
  const contenu = lireContenu("a-propos.md");
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-display-l font-bold text-marine md:text-display-xl">
        {contenu.meta.titre}
      </h1>
      <div className="mt-6 space-y-4 leading-relaxed text-encre/90">
        {contenu.paragraphes.map((p) => (
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
