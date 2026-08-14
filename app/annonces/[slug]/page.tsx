import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Galerie from "@/components/Galerie";
import { getBoatBySlug, getBoats } from "@/lib/sources/corpus";
import { SITE } from "@/lib/site";
import { formatPrix, typoFr } from "@/lib/format";

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

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdProduct(boat)) }}
      />
      <nav aria-label="Fil d'Ariane" className="text-sm text-encre/60">
        <ol className="flex list-none flex-wrap gap-1 p-0">
          <li><Link href="/" className="hover:text-azur-2 hover:underline">Accueil</Link> /</li>
          <li><Link href="/annonces" className="hover:text-azur-2 hover:underline">Annonces</Link> /</li>
          <li aria-current="page" className="text-encre">{boat.titre}</li>
        </ol>
      </nav>
      <div className="mt-6 grid gap-10 lg:grid-cols-[3fr_2fr]">
        <div>
          <Galerie photos={boat.photos} titre={boat.titre} />
        </div>
        <div>
          <p className="inline-block rounded bg-marine px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-white">
            {etatLabel}
          </p>
          <h1 className="mt-2 text-display-l font-bold text-marine md:text-display-xl">
            {boat.titre}
          </h1>
          <p className="mt-2 text-2xl font-bold text-encre">
            {formatPrix(boat.prix, boat.devise)}
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
                  <td className="py-2 text-right">{typoFr(valeur)}</td>
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
          <div className="mt-8 rounded-lg bg-ecume p-5">
            <h2 className="text-display-s font-semibold text-marine">
              {typoFr(`Contact : ${SITE.responsable}`)}
            </h2>
            <p className="mt-2 text-sm">
              <a
                href={`tel:${SITE.telephoneMobileHref}`}
                className="font-semibold text-azur-2 hover:underline"
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
          </div>
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
    </div>
  );
}
