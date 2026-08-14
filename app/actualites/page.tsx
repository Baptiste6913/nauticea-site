import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getActualites } from "@/lib/sources/corpus";

export const metadata: Metadata = {
  title: "Actualités",
  description:
    "Toutes les actualités de Nauticea Yachting à Port Fréjus : nouveautés Sealine et RYCK, visites et disponibilités.",
  alternates: { canonical: "/actualites" },
};

export default function Actualites() {
  const actus = getActualites();
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-display-l font-bold text-marine md:text-display-xl">Actualités</h1>
      <ul className="mt-8 grid list-none gap-6 p-0 sm:grid-cols-2">
        {actus.map((a) => (
          <li key={a.slug}>
            <article className="group h-full overflow-hidden rounded-lg border border-encre/10 bg-white shadow-sm transition-shadow hover:shadow-md">
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
                <h2 className="p-4 text-display-s font-semibold text-marine group-hover:text-azur-2">
                  {a.titre}
                </h2>
              </Link>
            </article>
          </li>
        ))}
      </ul>
    </div>
  );
}
