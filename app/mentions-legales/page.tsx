import type { Metadata } from "next";
import { getPages } from "@/lib/sources/corpus";
import { typoFr } from "@/lib/format";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Mentions légales du site de Nauticea Yachting, Port Fréjus.",
  alternates: { canonical: "/mentions-legales" },
  robots: { index: false },
};

export default function MentionsLegales() {
  const texte = getPages()["mentions-legales"] ?? "";
  // Le corpus commence par le titre répété ; on l'écarte pour ne garder
  // que le corps, découpé en paragraphes.
  const corps = texte.replace(/^\s*Mentions légales\s*Mentions légales\s*/, "");
  const paragraphes = corps
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-display-l font-bold text-marine md:text-display-xl">
        Mentions légales
      </h1>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-encre/90">
        {paragraphes.map((p, i) => {
          const estTitre = /^\d+\.\s/.test(p) && p.length < 80;
          return estTitre ? (
            <h2 key={i} className="pt-4 text-display-s font-semibold text-marine">
              {typoFr(p)}
            </h2>
          ) : (
            <p key={i} className="whitespace-pre-line">
              {typoFr(p)}
            </p>
          );
        })}
      </div>
    </div>
  );
}
