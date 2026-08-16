import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SITE } from "@/lib/site";

// Squelette de la future page gamme neuve (directive finale W2) :
// invisible tant que le kit média constructeur n'existe pas. Le flag
// NEXT_PUBLIC_GAMME_NEUVE=1 la rend servie ; elle reste hors navigation
// et hors sitemap tant que le contenu réel n'est pas fourni par Bruno.
// Aucun contenu constructeur n'est scrapé : kit média officiel
// uniquement.

export const metadata: Metadata = {
  title: "Gamme neuve Sealine et RYCK",
  description:
    "Les gammes neuves Sealine et RYCK Yachts distribuées par Nauticea Yachting à Port Fréjus.",
  alternates: { canonical: "/gamme-neuve" },
  robots: { index: false },
};

export default function GammeNeuve() {
  if (process.env.NEXT_PUBLIC_GAMME_NEUVE !== "1") {
    notFound();
  }
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-display-l font-bold text-marine md:text-display-xl">
        Gamme neuve Sealine et RYCK
      </h1>
      <p className="mt-3 max-w-2xl leading-relaxed text-encre/80">
        Cette page accueillera les gammes officielles Sealine et RYCK
        (kit média constructeur en attente). En attendant, le stock neuf
        disponible est en annonces.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/stock-neuf"
          className="rounded bg-azur-2 px-5 py-2.5 font-semibold text-white hover:bg-marine"
        >
          Voir le stock neuf
        </Link>
        <a
          href={SITE.marques.sealine}
          target="_blank"
            rel="noopener noreferrer"
          className="rounded border border-marine px-5 py-2.5 font-semibold text-marine hover:bg-ecume"
        >
          Site Sealine
        </a>
        <a
          href={SITE.marques.ryck}
          target="_blank"
            rel="noopener noreferrer"
          className="rounded border border-marine px-5 py-2.5 font-semibold text-marine hover:bg-ecume"
        >
          Site RYCK
        </a>
      </div>
    </div>
  );
}
