import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  actualiteAContenu,
  getActualiteBySlug,
  getActualites,
} from "@/lib/sources/corpus";
import { dimensionsImagePublique, lireActualitesContenu } from "@/lib/contenu";
import { formatDateFr, typoFr } from "@/lib/format";
import { SITE } from "@/lib/site";

interface Props {
  params: Promise<{ slug: string }>;
}

// Bloc du corps commençant par ![alt](src) : figure avec, en légende,
// les lignes suivantes du même bloc.
function blocFigure(
  bloc: string
): { src: string; alt: string; legende: string } | null {
  const [premiere, ...suite] = bloc.split("\n");
  const m = premiere.match(/^!\[(.*)\]\((\S+)\)$/);
  if (!m) {
    return null;
  }
  return { alt: m[1], src: m[2], legende: suite.join(" ").trim() };
}

export function generateStaticParams() {
  // Dédoublonnage : une actu éditoriale peut porter le même slug
  // qu'une actu du corpus (elle la masque alors sur la page détail).
  const slugs = new Set([
    ...lireActualitesContenu().map((a) => a.slug),
    ...getActualites().map((a) => a.slug),
  ]);
  return [...slugs].map((slug) => ({ slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const editoriale = lireActualitesContenu().find((a) => a.slug === slug);
  if (editoriale) {
    const og = editoriale.og_image ?? editoriale.image;
    return {
      title: editoriale.titre,
      description: editoriale.paragraphes[0]?.slice(0, 150) ?? editoriale.titre,
      alternates: { canonical: `/actualites/${editoriale.slug}` },
      // La fusion des metadata est superficielle : openGraph du layout
      // serait écrasé en bloc, on rappelle donc type, locale et siteName.
      ...(og
        ? {
            openGraph: {
              type: "website",
              locale: "fr_FR",
              siteName: SITE.nom,
              images: [og],
            },
          }
        : {}),
    };
  }
  const actu = getActualiteBySlug(slug);
  if (!actu) {
    return {};
  }
  return {
    title: actu.titre,
    description: actu.corps.slice(0, 150) || actu.titre,
    alternates: { canonical: `/actualites/${actu.slug}` },
    // Les actualités sans contenu réel restent servies (cibles de 301)
    // mais hors sitemap et hors index.
    ...(actualiteAContenu(actu) ? {} : { robots: { index: false } }),
  };
}

export default async function DetailActualite({ params }: Props) {
  const { slug } = await params;
  const editoriale = lireActualitesContenu().find((a) => a.slug === slug);
  if (editoriale) {
    const [chapo, ...blocs] = editoriale.paragraphes;
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Accueil", item: SITE.url },
        {
          "@type": "ListItem",
          position: 2,
          name: "Actualités",
          item: `${SITE.url}/actualites`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: editoriale.titre,
          item: `${SITE.url}/actualites/${editoriale.slug}`,
        },
      ],
    };
    return (
      <article className="mx-auto max-w-3xl px-4 py-10">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <nav aria-label="Fil d'Ariane" className="text-sm text-encre/70">
          <ol className="flex list-none flex-wrap gap-1 p-0">
            <li><Link href="/" className="hover:text-azur-2 hover:underline">Accueil</Link> /</li>
            <li><Link href="/actualites" className="hover:text-azur-2 hover:underline">Actualités</Link> /</li>
            <li aria-current="page" className="text-encre">{typoFr(editoriale.titre)}</li>
          </ol>
        </nav>
        {editoriale.date && (
          <p className="sonde mt-4 text-xs uppercase tracking-widest text-encre/70">
            {formatDateFr(editoriale.date)}
          </p>
        )}
        <h1 className="mt-2 text-display-l font-bold text-marine md:text-display-xl">
          {typoFr(editoriale.titre)}
        </h1>
        {editoriale.image && (
          <Image
            src={editoriale.image}
            alt={editoriale.titre}
            width={860}
            height={645}
            className="mt-6 h-auto w-full rounded-lg"
          />
        )}
        {chapo && (
          <p className="mt-6 text-xl font-medium leading-snug text-marine">
            {typoFr(chapo)}
          </p>
        )}
        {blocs.map((bloc) => {
          const figure = blocFigure(bloc);
          if (figure) {
            const dims = dimensionsImagePublique(figure.src);
            return (
              <figure key={figure.src} className="mt-8">
                <Image
                  src={figure.src}
                  alt={figure.alt}
                  width={dims?.width ?? 860}
                  height={dims?.height ?? 645}
                  className="mx-auto h-auto w-full max-w-xl rounded-lg"
                />
                {figure.legende && (
                  <figcaption className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-encre/70">
                    {typoFr(figure.legende)}
                  </figcaption>
                )}
              </figure>
            );
          }
          return (
            <p
              key={bloc.slice(0, 40)}
              className="mt-5 whitespace-pre-line leading-relaxed text-encre/90"
            >
              {typoFr(bloc)}
            </p>
          );
        })}
        {editoriale.ctas.length > 0 && (
          <p className="mt-8 flex flex-wrap gap-3">
            {editoriale.ctas.map((cta) =>
              /* Lien externe : nouvel onglet + noopener (règle W4). */
              /^https?:\/\//.test(cta.lien) ? (
                <a
                  key={cta.lien}
                  href={cta.lien}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block rounded bg-azur-2 px-5 py-2.5 font-semibold text-white hover:bg-marine"
                >
                  {cta.texte}
                </a>
              ) : (
                <Link
                  key={cta.lien}
                  href={cta.lien}
                  className="inline-block rounded bg-azur-2 px-5 py-2.5 font-semibold text-white hover:bg-marine"
                >
                  {cta.texte}
                </Link>
              )
            )}
          </p>
        )}
      </article>
    );
  }
  const actu = getActualiteBySlug(slug);
  if (!actu) {
    notFound();
  }

  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <nav aria-label="Fil d'Ariane" className="text-sm text-encre/70">
        <ol className="flex list-none flex-wrap gap-1 p-0">
          <li><Link href="/" className="hover:text-azur-2 hover:underline">Accueil</Link> /</li>
          <li><Link href="/actualites" className="hover:text-azur-2 hover:underline">Actualités</Link> /</li>
          <li aria-current="page" className="text-encre">{typoFr(actu.titre)}</li>
        </ol>
      </nav>
      <h1 className="mt-4 text-display-l font-bold text-marine md:text-display-xl">
        {typoFr(actu.titre)}
      </h1>
      {actu.corps && (
        <p className="mt-6 whitespace-pre-line leading-relaxed text-encre/90">
          {typoFr(actu.corps)}
        </p>
      )}
      {!actualiteAContenu(actu) && (
        <div className="mt-6">
          <p className="leading-relaxed text-encre/80">
            {typoFr(
              "Le contenu vidéo de cette actualité n'est plus disponible."
            )}
          </p>
          <Link
            href="/actualites"
            className="mt-4 inline-block rounded bg-marine px-5 py-2.5 text-sm font-semibold text-white hover:bg-marine-2"
          >
            Toutes les actualités
          </Link>
        </div>
      )}
      {actu.images.map((img) => (
        <Image
          key={img}
          src={img}
          alt={actu.titre}
          width={860}
          height={645}
          className="mt-6 h-auto w-full rounded-lg"
        />
      ))}
    </article>
  );
}
