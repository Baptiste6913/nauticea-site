"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Boat } from "@/lib/types";
import { formatPrix, typoFr } from "@/lib/format";

// Tableau récapitulatif triable (consolidation W7), inspiré du tableau
// de l'ancien site (Marque, Modèle/Année, Dimensions, Prix TTC) : ici
// modèle, catégorie, année, longueur, prix, lien fiche. Tri par colonne
// sans dépendance ; valeurs en registre sonde ; mobile en défilement
// horizontal contenu ; cibles tactiles >= 24 px ; tri annoncé aux
// lecteurs d'écran (aria-sort + zone aria-live).

type CleTri = "annee" | "longueur" | "prix";
type Sens = "asc" | "desc";

const LIBELLES: Record<CleTri, string> = {
  annee: "année",
  longueur: "longueur",
  prix: "prix",
};

function valeurDe(boat: Boat, cle: CleTri): number | null {
  if (cle === "prix") {
    return boat.prix;
  }
  const brut =
    cle === "annee" ? boat.specs["Année"] : boat.specs["Longueur (m)"];
  const n = Number(brut);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export default function TableauRecapitulatif({ boats }: { boats: Boat[] }) {
  const [tri, setTri] = useState<{ cle: CleTri; sens: Sens } | null>(null);

  const lignes = useMemo(() => {
    if (!tri) {
      return boats;
    }
    const avec = boats.filter((b) => valeurDe(b, tri.cle) !== null);
    const sans = boats.filter((b) => valeurDe(b, tri.cle) === null);
    avec.sort((a, b) => {
      const va = valeurDe(a, tri.cle)!;
      const vb = valeurDe(b, tri.cle)!;
      return tri.sens === "asc" ? va - vb : vb - va;
    });
    return [...avec, ...sans];
  }, [boats, tri]);

  function basculer(cle: CleTri) {
    setTri((t) =>
      t?.cle === cle
        ? { cle, sens: t.sens === "asc" ? "desc" : "asc" }
        : { cle, sens: "asc" }
    );
  }

  function ariaSort(cle: CleTri): "ascending" | "descending" | "none" {
    if (tri?.cle !== cle) {
      return "none";
    }
    return tri.sens === "asc" ? "ascending" : "descending";
  }

  function fleche(cle: CleTri): string {
    if (tri?.cle !== cle) {
      return "↕";
    }
    return tri.sens === "asc" ? "↑" : "↓";
  }

  const enteteTriable =
    "flex min-h-6 w-full items-center gap-1 text-left font-semibold hover:text-azur";

  return (
    <div className="overflow-x-auto rounded-lg shadow-affleure">
      <p aria-live="polite" className="sr-only">
        {tri
          ? `Tableau trié par ${LIBELLES[tri.cle]}, ${tri.sens === "asc" ? "croissant" : "décroissant"}.`
          : "Tableau non trié."}
      </p>
      <table className="w-full min-w-[640px] border-collapse bg-white text-sm">
        <caption className="sr-only">
          {typoFr(
            "Récapitulatif des bateaux : modèle, catégorie, année, longueur, prix, lien vers la fiche. Colonnes année, longueur et prix triables."
          )}
        </caption>
        <thead>
          <tr className="bg-marine text-left text-white">
            <th scope="col" className="px-4 py-3">Modèle</th>
            <th scope="col" className="px-4 py-3">Catégorie</th>
            <th scope="col" className="px-3 py-2" aria-sort={ariaSort("annee")}>
              <button type="button" onClick={() => basculer("annee")} className={enteteTriable}>
                Année <span aria-hidden="true">{fleche("annee")}</span>
              </button>
            </th>
            <th scope="col" className="px-3 py-2" aria-sort={ariaSort("longueur")}>
              <button type="button" onClick={() => basculer("longueur")} className={enteteTriable}>
                Longueur <span aria-hidden="true">{fleche("longueur")}</span>
              </button>
            </th>
            <th scope="col" className="px-3 py-2" aria-sort={ariaSort("prix")}>
              <button type="button" onClick={() => basculer("prix")} className={enteteTriable}>
                Prix <span aria-hidden="true">{fleche("prix")}</span>
              </button>
            </th>
            <th scope="col" className="px-4 py-3">
              <span className="sr-only">Fiche</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((b, i) => (
            <tr key={b.slug} className={i % 2 ? "bg-ecume" : "bg-white"}>
              <th scope="row" className="px-4 py-2.5 text-left font-semibold text-marine">
                <Link
                  href={`/annonces/${b.slug}`}
                  className="-my-1 inline-block py-1 hover:text-azur-2 hover:underline"
                >
                  {b.titre}
                </Link>
              </th>
              <td className="px-4 py-2.5 capitalize">
                {b.sous_categorie.replace("-", " ")}
              </td>
              <td className="sonde px-3 py-2.5">{b.specs["Année"] ?? ""}</td>
              <td className="sonde px-3 py-2.5">
                {b.specs["Longueur (m)"]
                  ? `${b.specs["Longueur (m)"].replace(".", ",")} m`
                  : ""}
              </td>
              <td className="sonde px-3 py-2.5">{formatPrix(b.prix, b.devise)}</td>
              <td className="px-4 py-2.5">
                <Link
                  href={`/annonces/${b.slug}`}
                  className="inline-block rounded border border-marine px-3 py-1.5 text-xs font-semibold text-marine hover:bg-marine hover:text-white"
                >
                  Voir
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
