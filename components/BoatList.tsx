"use client";

import { useMemo, useState } from "react";
import type { Boat } from "@/lib/types";
import BoatCard from "@/components/BoatCard";

type Tri = "recentes" | "prix-asc" | "prix-desc";
type FiltreEtat = "tous" | "neuf" | "occasion";

export default function BoatList({
  boats,
  filtreEtatInitial = "tous",
  masquerFiltreEtat = false,
}: {
  boats: Boat[];
  filtreEtatInitial?: FiltreEtat;
  masquerFiltreEtat?: boolean;
}) {
  const [tri, setTri] = useState<Tri>("recentes");
  const [etat, setEtat] = useState<FiltreEtat>(filtreEtatInitial);

  const visibles = useMemo(() => {
    let liste = boats;
    if (etat !== "tous") {
      liste = liste.filter((b) => b.etat === etat);
    }
    if (tri === "recentes") {
      return liste;
    }
    const sansPrix = liste.filter((b) => b.prix === null);
    const avecPrix = liste
      .filter((b) => b.prix !== null)
      .sort((a, b) =>
        tri === "prix-asc" ? a.prix! - b.prix! : b.prix! - a.prix!
      );
    return [...avecPrix, ...sansPrix];
  }, [boats, tri, etat]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <span className="font-medium">Trier</span>
          <select
            value={tri}
            onChange={(e) => setTri(e.target.value as Tri)}
            className="rounded border border-encre/20 bg-white px-2 py-1.5"
          >
            <option value="recentes">Plus récentes</option>
            <option value="prix-asc">Prix croissant</option>
            <option value="prix-desc">Prix décroissant</option>
          </select>
        </label>
        {!masquerFiltreEtat && (
          <label className="flex items-center gap-2 text-sm">
            <span className="font-medium">État</span>
            <select
              value={etat}
              onChange={(e) => setEtat(e.target.value as FiltreEtat)}
              className="rounded border border-encre/20 bg-white px-2 py-1.5"
            >
              <option value="tous">Tous</option>
              <option value="neuf">Neuf</option>
              <option value="occasion">Occasion</option>
            </select>
          </label>
        )}
        <p className="ml-auto text-sm text-encre/70">
          {visibles.length} annonce{visibles.length > 1 ? "s" : ""}
        </p>
      </div>
      {visibles.length === 0 ? (
        <p className="mt-10 text-center text-encre/70">
          Aucune annonce dans cette sélection pour le moment.
        </p>
      ) : (
        <ul className="mt-6 grid list-none gap-6 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {visibles.map((b) => (
            <li key={b.slug}>
              <BoatCard boat={b} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
