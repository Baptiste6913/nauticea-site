import Image from "next/image";
import Link from "next/link";
import Slider from "@/components/Slider";
import BoatCard from "@/components/BoatCard";
import { getBoats, getPages } from "@/lib/sources/corpus";
import { SITE } from "@/lib/site";
import { typoFr } from "@/lib/format";

const DIAPOS = [
  { src: "/site/slider/sealine-c390-3.jpg", alt: "Sealine C390 en navigation" },
  { src: "/site/slider/new_Sealine_S390-exterior.jpg", alt: "Sealine S390, extérieur" },
  { src: "/site/slider/rick-280.jpg", alt: "RYCK 280 en navigation" },
  { src: "/site/slider/sealine-c335-photo-exterieur-2021.jpg", alt: "Sealine C335, extérieur" },
];

// Le texte d'accueil du corpus est un bloc unique : on en extrait les
// sections Sealine et RYCK telles quelles.
function sectionsAccueil(texte: string): { sealine: string; ryck: string } {
  const iSealine = texte.indexOf("SEALINE exploite");
  const iRyckTitre = texte.indexOf("RYCK YACHTS");
  const iRyck = texte.indexOf("RYCK,", iRyckTitre);
  // Le bloc du corpus se termine par les liens du pied de page : on coupe
  // à la fin de la phrase RYCK (« ...propriétaires. »).
  const finRyck = texte.indexOf("propriétaires.", iRyck);
  return {
    sealine: texte.slice(iSealine, iRyckTitre).trim(),
    ryck:
      finRyck > 0
        ? texte.slice(iRyck, finRyck + "propriétaires.".length).trim()
        : texte.slice(iRyck).trim(),
  };
}

// Données issues des mentions légales et de la page contact du corpus.
const JSON_LD_LOCAL_BUSINESS = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: SITE.nom,
  url: SITE.url,
  image: `${SITE.url}/site/logos/logo-1382603607.png`,
  telephone: SITE.telephoneFixe,
  address: {
    "@type": "PostalAddress",
    streetAddress: SITE.adresse.rue,
    postalCode: SITE.adresse.codePostal,
    addressLocality: SITE.adresse.ville,
    addressCountry: SITE.adresse.pays,
  },
  sameAs: [SITE.reseaux.facebook, SITE.reseaux.instagram],
};

export default function Accueil() {
  const pages = getPages();
  const { sealine, ryck } = sectionsAccueil(pages["accueil"] ?? "");
  const recentes = getBoats().slice(0, 3);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(JSON_LD_LOCAL_BUSINESS),
        }}
      />
      <Slider diapos={DIAPOS} />
      <section className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="text-center text-display-l font-bold text-marine md:text-display-xl">
          Yachts Sealine et RYCK chez Nauticea Yachting Fréjus
        </h1>
        <div className="mt-10 grid gap-10 md:grid-cols-2">
          <article className="rounded-lg bg-ecume p-6">
            <Image
              src="/site/logos/sealinelogo550.png"
              alt="Sealine"
              width={220}
              height={112}
              className="mx-auto"
            />
            <h2 className="mt-4 text-display-m font-semibold text-marine">Sealine</h2>
            <p className="mt-3 leading-relaxed text-encre/90">{typoFr(sealine)}</p>
            <a
              href={SITE.marques.sealine}
              rel="noopener"
              className="mt-4 inline-block font-semibold text-azur-2 hover:underline"
            >
              Découvrir la gamme Sealine
            </a>
          </article>
          <article className="rounded-lg bg-ecume p-6">
            <Image
              src="/site/logos/Logo-Ricknoir.jpg"
              alt="RYCK Yachts"
              width={180}
              height={96}
              className="mx-auto"
            />
            <h2 className="mt-4 text-display-m font-semibold text-marine">RYCK Yachts</h2>
            <p className="mt-3 leading-relaxed text-encre/90">{typoFr(ryck)}</p>
            <a
              href={SITE.marques.ryck}
              rel="noopener"
              className="mt-4 inline-block font-semibold text-azur-2 hover:underline"
            >
              Découvrir la gamme RYCK
            </a>
          </article>
        </div>
      </section>
      <section className="bg-ecume">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-display-l font-bold text-marine">Dernières annonces</h2>
            <Link href="/annonces" className="font-semibold text-azur-2 hover:underline">
              Toutes les annonces
            </Link>
          </div>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {recentes.map((b) => (
              <BoatCard key={b.slug} boat={b} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
