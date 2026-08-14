import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Galerie from "@/components/Galerie";
import BoatCardDA from "@/components/da/BoatCardDA";
import Reveal from "@/components/da/Reveal";
import Surface from "@/components/da/Surface";
import { getBoatBySlug, getBoats } from "@/lib/sources/corpus";
import { SITE } from "@/lib/site";
import { formatPrix, formatValeurSpec, typoFr } from "@/lib/format";

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getBoats().map((b) => ({ slug: b.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const boat = getBoatBySlug(slug);
  if (!boat) {
    return {};
  }
  const etat = boat.etat === "neuf" ? "neuf" : "occasion";
  return {
    title: `${boat.titre} ${etat}`,
    description: `${boat.titre} ${etat} chez Nauticea Yachting à Port Fréjus. ${formatPrix(boat.prix, boat.devise)}.`,
    alternates: { canonical: `/annonces/${boat.slug}` },
    openGraph: {
      title: `${boat.titre} (${etat})`,
      images: boat.photos[0] ? [boat.photos[0]] : [],
    },
  };
}

function jsonLdProduct(boat: NonNullable<ReturnType<typeof getBoatBySlug>>) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        name: boat.titre,
        category: boat.sous_categorie,
        image: boat.photos.map((p) => `${SITE.url}${p}`),
        description: boat.description,
        brand: { "@type": "Brand", name: boat.marque },
        offers: {
          "@type": "Offer",
          priceCurrency: boat.devise,
          ...(boat.prix !== null ? { price: boat.prix } : {}),
          itemCondition:
            boat.etat === "neuf"
              ? "https://schema.org/NewCondition"
              : "https://schema.org/UsedCondition",
          availability: "https://schema.org/InStock",
          seller: { "@type": "Organization", name: SITE.nom },
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Accueil", item: SITE.url },
          { "@type": "ListItem", position: 2, name: "Annonces", item: `${SITE.url}/annonces` },
          { "@type": "ListItem", position: 3, name: boat.titre, item: `${SITE.url}/annonces/${boat.slug}` },
        ],
      },
    ],
  };
}

export default async function DetailAnnonce({ params }: Props) {
  const { slug } = await params;
  const boat = getBoatBySlug(slug);
  if (!boat) {
    notFound();
  }

  const etatLabel =
    boat.etat === "neuf" ? "Neuf" : boat.etat === "occasion" ? "Occasion" : "État sur demande";

  // Cartes liées : même sous-catégorie d'abord, puis même catégorie.
  const autres = getBoats().filter((b) => b.slug !== boat.slug);
  const liees = [
    ...autres.filter((b) => b.sous_categorie === boat.sous_categorie),
    ...autres.filter(
      (b) =>
        b.sous_categorie !== boat.sous_categorie &&
        b.categorie === boat.categorie
    ),
  ].slice(0, 3);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdProduct(boat)) }}
      />
      <nav aria-label="Fil d'Ariane" className="text-sm text-encre/70">
        <ol className="flex list-none flex-wrap gap-1 p-0">
          <li><Link href="/" className="hover:text-azur-2 hover:underline">Accueil</Link> /</li>
          <li><Link href="/annonces" className="hover:text-azur-2 hover:underline">Annonces</Link> /</li>
          <li aria-current="page" className="text-encre">{boat.titre}</li>
        </ol>
      </nav>
      <div className="mt-6 grid gap-10 lg:grid-cols-[3fr_2fr]">
        <div>
          <Surface niveau="flotte" className="rounded-lg bg-white p-2 md:p-3">
            <Galerie photos={boat.photos} titre={boat.titre} />
          </Surface>
        </div>
        <div>
          <p className="inline-block rounded-none border-l-2 border-azur bg-marine px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-white">
            {etatLabel}
          </p>
          <h1 className="mt-2 text-display-l font-bold text-marine md:text-display-xl">
            {boat.titre}
          </h1>
          <p className="sonde mt-3 inline-block text-2xl font-semibold text-encre">
            {formatPrix(boat.prix, boat.devise)}
            {/* Ligne de flottaison du prix (greffe DA, token sable). */}
            <svg
              viewBox="0 0 96 8"
              aria-hidden="true"
              preserveAspectRatio="none"
              className="mt-1 block h-[6px] w-full"
            >
              <path
                d="M0 5 Q12 2.5 24 4.5 T48 4 T72 5 T96 3.5"
                fill="none"
                stroke="var(--color-sable)"
                strokeWidth="2"
              />
            </svg>
          </p>
          <h2 className="mt-8 text-display-s font-semibold text-marine">
            Caractéristiques
          </h2>
          <table className="mt-3 w-full border-collapse text-sm">
            <tbody>
              {Object.entries(boat.specs).map(([cle, valeur]) => (
                <tr key={cle} className="border-b border-encre/10">
                  <th scope="row" className="py-2 pr-4 text-left font-medium text-encre/70">
                    {typoFr(cle)}
                  </th>
                  <td className="sonde py-2 text-right font-medium text-azur-2">
                    {typoFr(formatValeurSpec(valeur))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {boat.equipements.length > 0 && (
            <>
              <h2 className="mt-8 text-display-s font-semibold text-marine">
                Équipements
              </h2>
              <ul className="mt-3 grid list-none grid-cols-2 gap-x-4 gap-y-1 p-0 text-sm">
                {boat.equipements.map((e) => (
                  <li key={e} className="before:mr-2 before:text-azur before:content-['•']">
                    {typoFr(e)}
                  </li>
                ))}
              </ul>
            </>
          )}
          <Surface niveau="flotte" className="mt-8 rounded-lg bg-ecume p-5">
            <h2 className="text-display-s font-semibold text-marine">
              {typoFr(`Contact : ${SITE.responsable}`)}
            </h2>
            <p className="mt-2 text-sm">
              <a
                href={`tel:${SITE.telephoneMobileHref}`}
                className="sonde font-semibold text-azur-2 hover:underline"
              >
                {SITE.telephoneMobile}
              </a>
            </p>
            <Link
              href={`/contact?annonce=${boat.slug}`}
              className="mt-3 inline-block rounded bg-marine px-4 py-2 text-sm font-semibold text-white hover:bg-marine-2"
            >
              Demander plus d&apos;informations
            </Link>
          </Surface>
        </div>
      </div>
      {boat.description && (
        <section className="mt-10 max-w-3xl">
          <h2 className="text-display-m font-semibold text-marine">Description</h2>
          <p className="mt-3 whitespace-pre-line leading-relaxed text-encre/90">
            {typoFr(boat.description)}
          </p>
        </section>
      )}
      {liees.length > 0 && (
        <Reveal as="section" className="mt-14">
          <h2 className="text-display-m font-semibold text-marine">
            Voir aussi
          </h2>
          <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {liees.map((b) => (
              <BoatCardDA key={b.slug} boat={b} />
            ))}
          </div>
        </Reveal>
      )}
    </div>
  );
}
