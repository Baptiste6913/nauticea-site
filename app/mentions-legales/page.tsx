import type { Metadata } from "next";
import { getPages } from "@/lib/sources/corpus";
import { typoFr } from "@/lib/format";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Mentions légales du site de Nauticea Yachting, Port Fréjus.",
  alternates: { canonical: "/mentions-legales" },
  robots: { index: false },
};

// Sections mises à jour à la directive finale W3 : hébergeur réel
// (coordonnées officielles publiées par Vercel) et données personnelles
// couvrant les formulaires. Coordonnées de l'éditeur inchangées, elles
// viennent du corpus uniquement.
const SECTION_HEBERGEUR = {
  titre: "Hébergeur",
  corps:
    "Le site est hébergé par Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis (vercel.com).",
};

const SECTION_DONNEES = {
  titre: "Données personnelles et formulaires",
  corps:
    "Les informations transmises via les formulaires du site (contact, projet) servent uniquement à répondre à votre demande. Destinataire : Nauticea Yachting exclusivement ; aucune cession à des tiers ; conservation limitée au traitement de la demande. Conformément au règlement général sur la protection des données (RGPD) et à la loi « Informatique et Libertés », vous disposez d'un droit d'accès, de rectification et de suppression des données vous concernant : il suffit de nous contacter (coordonnées ci-dessus).",
};

export default function MentionsLegales() {
  const texte = getPages()["mentions-legales"] ?? "";
  // Le corpus commence par le titre répété ; on l'écarte pour ne garder
  // que le corps, découpé en paragraphes. Le paragraphe de l'ancien
  // hébergeur (1&1, obsolète) est remplacé par la section Vercel.
  const corps = texte.replace(/^\s*Mentions légales\s*Mentions légales\s*/, "");
  const paragraphes = corps
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((p) => !p.includes("1&1 Internet"));

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-display-l font-bold text-marine md:text-display-xl">
        Mentions légales
      </h1>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-encre/90">
        <h2 className="pt-4 text-display-s font-semibold text-marine">
          {SECTION_HEBERGEUR.titre}
        </h2>
        <p>{typoFr(SECTION_HEBERGEUR.corps)}</p>
        <h2 className="pt-4 text-display-s font-semibold text-marine">
          {SECTION_DONNEES.titre}
        </h2>
        <p>{typoFr(SECTION_DONNEES.corps)}</p>
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
