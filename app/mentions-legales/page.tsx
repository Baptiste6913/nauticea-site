import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site";
import { typoFr } from "@/lib/format";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Mentions légales du site de Nauticea Yachting, Port Fréjus.",
  alternates: { canonical: "/mentions-legales" },
  robots: { index: false },
};

// Restructuration LCEN (micro-session du 15/08) : uniquement des faits
// du corpus (identité de l'éditeur) et des constats vérifiés (hébergeur
// depuis la page légale officielle de Vercel, cookies depuis un audit
// runtime). Ce qui manque au corpus est listé en questions au rapport,
// jamais inventé.

interface Section {
  titre: string;
  lignes: string[];
}

const SECTIONS: Section[] = [
  {
    titre: "Éditeur du site",
    lignes: [
      "Société Nauticea Yachting",
      `${SITE.adresse.rue}, ${SITE.adresse.codePostal} ${SITE.adresse.ville}`,
      "Siret : 429 523 285 00030",
      `Téléphone : ${SITE.telephoneFixe}`,
      `Email : ${SITE.email}`,
    ],
  },
  {
    titre: "Directeur de la publication",
    lignes: ["Bruno Bouault"],
  },
  {
    titre: "Hébergement",
    lignes: [
      "Le site est hébergé par Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis (vercel.com).",
    ],
  },
  {
    titre: "Propriété intellectuelle",
    lignes: [
      "Les contenus de ce site (textes, photographies des annonces, mise en page) sont la propriété de Nauticea Yachting, sauf mention contraire. Les marques, logos et visuels Sealine et RYCK Yachts sont la propriété de leurs détenteurs respectifs. Toute reproduction sans autorisation est interdite.",
    ],
  },
  {
    titre: "Données personnelles et formulaires",
    lignes: [
      "Les informations transmises via les formulaires du site (contact, projet) servent uniquement à répondre à votre demande. Destinataire : Nauticea Yachting exclusivement ; aucune cession à des tiers ; conservation limitée au traitement de la demande. Conformément au règlement général sur la protection des données (RGPD) et à la loi « Informatique et Libertés », vous disposez d'un droit d'accès, de rectification et de suppression des données vous concernant : il suffit de nous contacter (coordonnées ci-dessus).",
    ],
  },
  {
    titre: "Cookies",
    lignes: [
      "Le site ne dépose aucun cookie de lui-même : ni cookie de suivi, ni mesure d'audience, ni traceur publicitaire.",
      "Sur la page Contact, la carte Google Maps ne se charge qu'après un clic sur « Afficher la carte ». Ce clic charge un contenu de Google (Google Ireland Limited), qui peut alors déposer ses propres cookies, nécessaires au fonctionnement de la carte. Aucun cookie Google n'est déposé avant ce clic.",
    ],
  },
];

export default function MentionsLegales() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-display-l font-bold text-marine md:text-display-xl">
        Mentions légales
      </h1>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-encre/90">
        {SECTIONS.map((section) => (
          <section key={section.titre}>
            <h2 className="pt-4 text-display-s font-semibold text-marine">
              {section.titre}
            </h2>
            {section.lignes.map((ligne) => (
              <p key={ligne.slice(0, 40)} className="mt-2">
                {typoFr(ligne)}
              </p>
            ))}
          </section>
        ))}
        <p className="pt-6">
          <Link href="/contact" className="font-semibold text-azur-2 hover:underline">
            Nous contacter
          </Link>
        </p>
      </div>
    </div>
  );
}
