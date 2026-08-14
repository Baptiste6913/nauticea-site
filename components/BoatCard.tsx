import Image from "next/image";
import Link from "next/link";
import type { Boat } from "@/lib/types";
import { formatPrix, typoFr } from "@/lib/format";

const ETIQUETTES: Record<string, string> = {
  neuf: "Neuf",
  occasion: "Occasion",
};

export default function BoatCard({ boat }: { boat: Boat }) {
  const photo = boat.photos[0];
  return (
    <article className="group overflow-hidden rounded-lg border border-encre/10 bg-white shadow-sm transition-shadow hover:shadow-md">
      <Link href={`/annonces/${boat.slug}`} className="block">
        <div className="relative aspect-[4/3] bg-ecume">
          {photo ? (
            <Image
              src={photo}
              alt={`${boat.titre}, ${boat.sous_categorie}`}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <p className="flex h-full items-center justify-center text-sm text-encre/50">
              Photos sur demande
            </p>
          )}
          <p className="absolute left-3 top-3 rounded bg-marine px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-white">
            {ETIQUETTES[boat.etat] ?? "État sur demande"}
          </p>
        </div>
        <div className="p-4">
          <h3 className="text-display-s font-semibold text-marine group-hover:text-azur-2">
            {boat.titre}
          </h3>
          <p className="mt-1 text-xs uppercase tracking-wide text-encre/60">
            {typoFr(boat.sous_categorie.replace("-", " "))}
            {boat.specs["Année"] ? ` · ${boat.specs["Année"]}` : ""}
            {boat.specs["Longueur (m)"]
              ? ` · ${boat.specs["Longueur (m)"].replace(".", ",")} m`
              : ""}
          </p>
          <p className="mt-2 text-lg font-bold text-encre">
            {formatPrix(boat.prix, boat.devise)}
          </p>
        </div>
      </Link>
    </article>
  );
}
