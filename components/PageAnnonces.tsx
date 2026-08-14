import Link from "next/link";
import type { Boat } from "@/lib/types";
import BoatList from "@/components/BoatList";

const CATEGORIES = [
  { slug: "", label: "Toutes" },
  { slug: "bateaux-moteur", label: "Bateaux moteur" },
  { slug: "voiliers", label: "Voiliers" },
  { slug: "catamaran", label: "Catamaran" },
] as const;

export default function PageAnnonces({
  titre,
  intro,
  boats,
  categorieActive = "",
  filtreEtatInitial,
  masquerFiltreEtat,
}: {
  titre: string;
  intro?: string;
  boats: Boat[];
  categorieActive?: string;
  filtreEtatInitial?: "tous" | "neuf" | "occasion";
  masquerFiltreEtat?: boolean;
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-display-l font-bold text-marine md:text-display-xl">{titre}</h1>
      {intro && <p className="mt-3 max-w-3xl leading-relaxed text-encre/80">{intro}</p>}
      <nav aria-label="Catégories de bateaux" className="mt-6">
        <ul className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => {
            const href = c.slug ? `/annonces/${c.slug}` : "/annonces";
            const actif = c.slug === categorieActive;
            return (
              <li key={c.slug}>
                <Link
                  href={href}
                  aria-current={actif ? "page" : undefined}
                  className={`inline-block rounded border px-4 py-2 text-sm font-medium transition-colors ${
                    actif
                      ? "border-marine bg-marine text-white"
                      : "border-encre/20 bg-white text-encre hover:border-marine hover:text-marine"
                  }`}
                >
                  {c.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="mt-8">
        <BoatList
          boats={boats}
          filtreEtatInitial={filtreEtatInitial}
          masquerFiltreEtat={masquerFiltreEtat}
        />
      </div>
    </div>
  );
}
