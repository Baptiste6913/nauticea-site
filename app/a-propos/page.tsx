import type { Metadata } from "next";
import Link from "next/link";
import { lireContenu } from "@/lib/contenu";
import { typoFr } from "@/lib/format";

export const metadata: Metadata = {
  title: "À propos",
  description:
    "L'excellence nautique sur la Côte d'Azur : implantée à Fréjus, Nauticea Yachting accompagne les passionnés de plaisance dans leurs projets d'achat, de vente et de navigation.",
  alternates: { canonical: "/a-propos" },
};

// Texte éditable dans content/a-propos.md (GitHub, sans session).
// Premier paragraphe = chapeau ; une ligne « ## X » = intertitre h2.
export default function APropos() {
  const contenu = lireContenu("a-propos.md");
  const [chapeau, ...blocs] = contenu.paragraphes;
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-display-l font-bold text-marine md:text-display-xl">
        {contenu.meta.titre}
      </h1>
      {chapeau && (
        <p className="mt-6 text-xl font-medium leading-snug text-marine">
          {typoFr(chapeau)}
        </p>
      )}
      <div className="mt-6 space-y-4 leading-relaxed text-encre/90">
        {blocs.map((p) =>
          p.startsWith("## ") ? (
            <h2
              key={p}
              className="pt-4 text-display-s font-semibold text-marine"
            >
              {p.slice(3)}
            </h2>
          ) : (
            <p key={p.slice(0, 32)}>{typoFr(p)}</p>
          )
        )}
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
