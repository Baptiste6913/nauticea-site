import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  actualiteAContenu,
  getActualiteBySlug,
  getActualites,
} from "@/lib/sources/corpus";
import { typoFr } from "@/lib/format";

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getActualites().map((a) => ({ slug: a.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
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
          <li aria-current="page" className="text-encre">{actu.titre}</li>
        </ol>
      </nav>
      <h1 className="mt-4 text-display-l font-bold text-marine md:text-display-xl">
        {actu.titre}
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
