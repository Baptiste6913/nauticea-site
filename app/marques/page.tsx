import type { Metadata } from "next";
import Image from "next/image";
import Reveal from "@/components/da/Reveal";
import Surface from "@/components/da/Surface";
import { lireContenu } from "@/lib/contenu";
import { SITE } from "@/lib/site";
import { typoFr } from "@/lib/format";

export const metadata: Metadata = {
  title: "Nos marques : Sealine et RYCK Yachts",
  description:
    "Nauticea Yachting est concessionnaire exclusif des marques Sealine et RYCK Yachts du groupe Hanse à Port Fréjus.",
  alternates: { canonical: "/marques" },
};

// Textes éditables dans content/marques.md (sections ## par marque).
function sectionsDepuis(corps: string): Record<string, string> {
  const sections: Record<string, string> = {};
  for (const bloc of corps.split(/^## /m).slice(1)) {
    const saut = bloc.indexOf("\n");
    sections[bloc.slice(0, saut).trim()] = bloc.slice(saut + 1).trim();
  }
  return sections;
}

export default function Marques() {
  const contenu = lireContenu("marques.md");
  const sections = sectionsDepuis(contenu.corps);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-display-l font-bold text-marine md:text-display-xl">
        {contenu.meta.titre}
      </h1>
      <p className="mt-3 max-w-2xl text-encre/80">{contenu.meta.intro}</p>
      <Reveal className="mt-8 grid gap-8 md:grid-cols-2">
        <Surface as="article" niveau="affleure" className="rounded-lg border border-encre/10 bg-white p-6">
          <Image
            src="/site/logos/sealinelogo550.png"
            alt="Sealine"
            width={260}
            height={132}
            className="mx-auto"
          />
          <h2 className="mt-4 text-display-m font-semibold text-marine">Sealine</h2>
          <p className="mt-3 leading-relaxed text-encre/90">
            {typoFr(sections["Sealine"] ?? "")}
          </p>
          <a
            href={SITE.marques.sealine}
            rel="noopener"
            className="mt-4 inline-block rounded bg-marine px-4 py-2 text-sm font-semibold text-white hover:bg-marine-2"
          >
            Site officiel Sealine
          </a>
        </Surface>
        <Surface as="article" niveau="affleure" className="rounded-lg border border-encre/10 bg-white p-6">
          <Image
            src="/site/logos/Logo-Ricknoir.jpg"
            alt="RYCK Yachts"
            width={200}
            height={107}
            className="mx-auto"
          />
          <h2 className="mt-4 text-display-m font-semibold text-marine">RYCK Yachts</h2>
          <p className="mt-3 leading-relaxed text-encre/90">
            {typoFr(sections["RYCK Yachts"] ?? "")}
          </p>
          <a
            href={SITE.marques.ryck}
            rel="noopener"
            className="mt-4 inline-block rounded bg-marine px-4 py-2 text-sm font-semibold text-white hover:bg-marine-2"
          >
            Site officiel RYCK
          </a>
        </Surface>
      </Reveal>
    </div>
  );
}
