import Image from "next/image";
import Link from "next/link";
import BoatCardDA from "@/components/da/BoatCardDA";
import Isobathes from "@/components/da/Isobathes";
import ReliefRade from "@/components/da/ReliefRade";
import Reveal from "@/components/da/Reveal";
import Surface from "@/components/da/Surface";
import { getBoats, getPages } from "@/lib/sources/corpus";
import { SITE } from "@/lib/site";
import { typoFr } from "@/lib/format";

// Graine du champ bathymétrique du hero (partagée SVG poster / shader).
const GRAINE_RADE = 43;

// Les quatre photos du hero historique : la C390 devient l'image
// signature, les trois autres restent à la une (aucune photo perdue).
const PHOTO_PHARE = {
  src: "/site/slider/sealine-c390-3.jpg",
  alt: "Sealine C390 en navigation",
};
const A_LA_UNE = [
  {
    src: "/site/slider/new_Sealine_S390-exterior.jpg",
    alt: "Sealine S390, extérieur",
    href: "/actualites/nouveau-sealine-s390",
    legende: "Sealine S390",
  },
  {
    src: "/site/slider/rick-280.jpg",
    alt: "RYCK 280 en navigation",
    href: "/marques",
    legende: "RYCK 280",
  },
  {
    src: "/site/slider/sealine-c335-photo-exterieur-2021.jpg",
    alt: "Sealine C335, extérieur",
    href: "/actualites/sealine-c335",
    legende: "Sealine C335",
  },
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
      {/* Hero : la photo phare en surface, le fond de la rade en relief.
          Le poster SVG est la version complète ; le canvas ne fait que
          l'animer quand les conditions le permettent. */}
      <section className="relative overflow-hidden bg-abysse">
        <Isobathes
          graine={GRAINE_RADE}
          variante="fond"
          sondes
          opacite={0.3}
          className="absolute inset-0 h-full w-full"
        />
        <ReliefRade graine={GRAINE_RADE} />
        <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-4 py-14 md:py-20 lg:grid-cols-[5fr_7fr]">
          <div>
            <p className="sonde text-xs uppercase tracking-[0.25em] text-azur">
              Port-Fréjus · Côte d&apos;Azur
            </p>
            <h1 className="mt-3 text-display-l font-bold text-white md:text-display-xl">
              Yachts Sealine et RYCK chez Nauticea Yachting Fréjus
            </h1>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/annonces"
                className="rounded bg-azur-2 px-5 py-2.5 font-semibold text-white hover:bg-azur"
              >
                Voir les annonces
              </Link>
              <Link
                href="/contact"
                className="rounded border border-white/40 px-5 py-2.5 font-semibold text-white hover:border-azur hover:text-azur"
              >
                Nous contacter
              </Link>
            </div>
          </div>
          <Surface
            niveau="domine"
            className="relative aspect-[3/2] overflow-hidden rounded-lg"
          >
            <Image
              src={PHOTO_PHARE.src}
              alt={PHOTO_PHARE.alt}
              fill
              sizes="(max-width: 1024px) 100vw, 60vw"
              priority
              className="object-cover"
            />
          </Surface>
        </div>
      </section>

      {/* À la une : les trois autres photos du hero historique. */}
      <Reveal as="section" className="mx-auto max-w-6xl px-4 pt-10">
        <ul className="grid list-none grid-cols-3 gap-4 p-0 max-md:grid-cols-1">
          {A_LA_UNE.map((photo) => (
            <li key={photo.src}>
              <Link href={photo.href} className="group block">
                <Surface
                  niveau="affleure"
                  className="relative aspect-[16/9] overflow-hidden rounded-lg"
                >
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition-transform duration-300 motion-safe:group-hover:scale-[1.03]"
                  />
                </Surface>
                <p className="sonde mt-2 text-xs uppercase tracking-widest text-encre/70 group-hover:text-azur-2">
                  {photo.legende}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </Reveal>

      <Reveal as="section" className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="sr-only">Nos marques</h2>
        <div className="grid gap-10 md:grid-cols-2">
          <Surface as="article" niveau="affleure" className="rounded-lg bg-ecume p-6">
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
          <Surface as="article" niveau="affleure" className="rounded-lg bg-ecume p-6">
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

      {/* Un seul séparateur signature par viewport (règle DA.md). */}
      <Isobathes
        graine={7}
        variante="separateur"
        couleur="var(--color-azur-2)"
        opacite={0.4}
        className="mx-auto block h-16 w-full max-w-6xl px-4"
      />

      <section className="bg-ecume">
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
        </Reveal>
      </section>
    </>
  );
}
