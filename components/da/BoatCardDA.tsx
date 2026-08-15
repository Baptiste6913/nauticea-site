import Image from "next/image";
import Link from "next/link";
import type { Boat } from "@/lib/types";
import { formatPrix, typoFr } from "@/lib/format";
import Tilt from "@/components/da/Tilt";
import Surface from "@/components/da/Surface";
import { TraceIsobathe } from "@/components/da/Isobathes";

// Carte bateau mise au niveau DA (tranche verticale, design/DA.md) :
// relief affleure/flotte, tilt desktop, trace isobathe au hover,
// prix en registre sonde. Utilisée sur l'accueil et les cartes liées
// du détail ; les pages liste gardent BoatCard jusqu'à la session B.

const ETIQUETTES: Record<string, string> = {
  neuf: "Neuf",
  occasion: "Occasion",
};

export default function BoatCardDA({
  boat,
  prioritaire = false,
}: {
  boat: Boat;
  /** Cartes au-dessus de la ligne de flottaison : image chargée en priorité. */
  prioritaire?: boolean;
}) {
  const photo = boat.photos[0];
  return (
    <Tilt className="h-full">
      <Surface
        as="article"
        niveau="affleure"
        className="group h-full overflow-hidden rounded-lg border border-encre/10 bg-white transition-[box-shadow,transform] duration-200 hover:shadow-flotte motion-safe:hover:-translate-y-0.5"
      >
        <Link href={`/annonces/${boat.slug}`} className="block h-full">
          <div className="relative aspect-[4/3] bg-ecume">
            {photo ? (
              <Image
                src={photo}
                alt={`${boat.titre}, ${boat.sous_categorie}`}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                priority={prioritaire}
                className="object-cover"
              />
            ) : (
              <p className="flex h-full items-center justify-center text-sm text-encre/70">
                Photos sur demande
              </p>
            )}
            <p className="absolute left-3 top-3 rounded-none border-l-2 border-azur bg-marine px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-white">
              {ETIQUETTES[boat.etat] ?? "État sur demande"}
            </p>
          </div>
          <div className="p-4">
            <h2 className="text-display-s font-semibold text-marine group-hover:text-azur-2">
              {boat.titre}
            </h2>
            <TraceIsobathe graine={Number(boat.id) || 3} />
            <p className="mt-1 text-xs uppercase tracking-wide text-encre/70">
              {typoFr(boat.sous_categorie.replace("-", " "))}
              {boat.specs["Année"] ? ` · ${boat.specs["Année"]}` : ""}
              {boat.specs["Longueur (m)"] ? (
                <span className="normal-case">
                  {` · ${boat.specs["Longueur (m)"].replace(".", ",")} m`}
                </span>
              ) : (
                ""
              )}
            </p>
            <p className="sonde mt-2 text-lg font-semibold text-encre">
              {formatPrix(boat.prix, boat.devise)}
            </p>
          </div>
        </Link>
      </Surface>
    </Tilt>
  );
}
