import Image from "next/image";
import Link from "next/link";
import BoatCardDA from "@/components/da/BoatCardDA";
import CarrouselHero from "@/components/da/CarrouselHero";
import Reveal from "@/components/da/Reveal";
import Surface from "@/components/da/Surface";
import { getBoats, getPages } from "@/lib/sources/corpus";
import { SITE } from "@/lib/site";
import { typoFr } from "@/lib/format";

// Les quatre photos à la une du corpus, photo phare en tête (LCP).
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
      {/* Hero clair : titre centré, carrousel. Le filigrane est porté
          par le layout (fond unique du site, design/DA.md). */}
      <section className="relative">
        <div className="relative mx-auto max-w-6xl px-4 py-10 md:py-14">
          <div className="text-center">
            <p className="sonde text-xs uppercase tracking-[0.25em] text-azur-2">
              Port-Fréjus · Côte d&apos;Azur
            </p>
            <h1 className="mx-auto mt-3 max-w-3xl text-display-l font-bold text-marine md:text-display-xl">
              Yachts Sealine et RYCK chez Nauticea Yachting Fréjus
            </h1>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/annonces"
                className="rounded bg-azur-2 px-5 py-2.5 font-semibold text-white hover:bg-marine"
              >
                Voir les annonces
              </Link>
              <Link
                href="/projet"
                className="rounded border border-marine px-5 py-2.5 font-semibold text-marine hover:bg-white"
              >
                Parler de votre projet
              </Link>
            </div>
          </div>
          <div className="mt-8">
            <CarrouselHero diapos={DIAPOS} />
          </div>
        </div>
      </section>

      <Reveal as="section" className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="sr-only">Nos marques</h2>
        <div className="grid gap-10 md:grid-cols-2">
          <Surface as="article" niveau="affleure" className="rounded-lg bg-white p-6 ring-1 ring-encre/5">
            <Image
              src="/site/logos/sealinelogo550.png"
              alt="Sealine"
              width={220}
              height={112}
              className="mx-auto"
            />
            <h3 className="mt-4 text-display-m font-semibold text-marine">Sealine</h3>
            <p className="mt-3 leading-relaxed text-encre/90">{typoFr(sealine)}</p>
            <a
              href={SITE.marques.sealine}
              rel="noopener"
              className="mt-4 inline-block font-semibold text-azur-2 hover:underline"
            >
              Découvrir la gamme Sealine
            </a>
          </Surface>
          <Surface as="article" niveau="affleure" className="rounded-lg bg-white p-6 ring-1 ring-encre/5">
            <Image
              src="/site/logos/Logo-Ricknoir.jpg"
              alt="RYCK Yachts"
              width={180}
              height={96}
              className="mx-auto"
            />
            <h3 className="mt-4 text-display-m font-semibold text-marine">RYCK Yachts</h3>
            <p className="mt-3 leading-relaxed text-encre/90">{typoFr(ryck)}</p>
            <a
              href={SITE.marques.ryck}
              rel="noopener"
              className="mt-4 inline-block font-semibold text-azur-2 hover:underline"
            >
              Découvrir la gamme RYCK
            </a>
          </Surface>
        </div>
      </Reveal>

      <section className="bg-ecume/70">
        <Reveal className="mx-auto max-w-6xl px-4 py-12">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-display-l font-bold text-marine">Dernières annonces</h2>
            <Link href="/annonces" className="font-semibold text-azur-2 hover:underline">
              Toutes les annonces
            </Link>
          </div>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {recentes.map((b) => (
              <BoatCardDA key={b.slug} boat={b} />
            ))}
          </div>
          {/* Maillage interne : catégories avec stock uniquement. */}
          <nav aria-label="Parcourir par catégorie" className="mt-8">
            <ul className="flex flex-wrap gap-2">
              {[
                { href: "/annonces/bateaux-moteur", label: "Bateaux moteur" },
                { href: "/annonces/catamaran", label: "Catamaran" },
                { href: "/stock-neuf", label: "Stock neuf" },
                { href: "/occasions", label: "Occasions" },
              ].map((c) => (
                <li key={c.href}>
                  <Link
                    href={c.href}
                    className="inline-block rounded border border-encre/20 bg-white px-4 py-2 text-sm font-medium text-encre hover:border-marine hover:text-marine"
                  >
                    {c.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </Reveal>
      </section>

      {/* Appel au formulaire de conversion (directive finale W3). */}
      <Reveal as="section" className="mx-auto max-w-6xl px-4 py-12">
        <Surface
          niveau="flotte"
          className="rounded-lg bg-white p-8 text-center ring-1 ring-encre/5"
        >
          <h2 className="text-display-m font-semibold text-marine">
            Un projet d&apos;achat ou de vente ?
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-encre/80">
            {typoFr(
              "Dites-nous ce que vous cherchez en une minute : nous revenons vers vous avec des propositions concrètes."
            )}
          </p>
          <Link
            href="/projet"
            className="mt-5 inline-block rounded bg-azur-2 px-6 py-3 font-semibold text-white hover:bg-marine"
          >
            Décrire votre projet
          </Link>
        </Surface>
      </Reveal>
    </>
  );
}
