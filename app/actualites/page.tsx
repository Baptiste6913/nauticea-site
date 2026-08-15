import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Reveal from "@/components/da/Reveal";
import Surface from "@/components/da/Surface";
import { TraceIsobathe } from "@/components/da/Isobathes";
import { getActualitesPubliees } from "@/lib/sources/corpus";

export const metadata: Metadata = {
  title: "Actualités",
  description:
    "Toutes les actualités de Nauticea Yachting à Port Fréjus : nouveautés Sealine et RYCK, visites et disponibilités.",
  alternates: { canonical: "/actualites" },
};

export default function Actualites() {
  const actus = getActualitesPubliees();
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-display-l font-bold text-marine md:text-display-xl">Actualités</h1>
      <Reveal as="section"><ul className="mt-8 grid list-none gap-6 p-0 sm:grid-cols-2">
        {actus.map((a) => (
          <li key={a.slug}>
            <Surface as="article" niveau="affleure" className="group h-full overflow-hidden rounded-lg border border-encre/10 bg-white transition-[box-shadow,transform] duration-200 hover:shadow-flotte motion-safe:hover:-translate-y-0.5">
              <Link href={`/actualites/${a.slug}`} className="block">
                <div className="relative aspect-[4/3] bg-ecume">
                  {a.images[0] ? (
                    <Image
                      src={a.images[0]}
                      alt={a.titre}
                      fill
                      sizes="(max-width: 640px) 100vw, 50vw"
                      className="object-cover"
                    />
                  ) : (
                    <Image
                      src="/site/logos/sealinelogo550.png"
                      alt=""
                      fill
                      sizes="(max-width: 640px) 100vw, 50vw"
                      className="object-contain p-10"
                    />
                  )}
                </div>
                <div className="p-4"><h2 className="text-display-s font-semibold text-marine group-hover:text-azur-2">{a.titre}</h2><TraceIsobathe graine={5} /></div>
              </Link>
            </Surface>
          </li>
        ))}
      </ul></Reveal>
    </div>
  );
}
