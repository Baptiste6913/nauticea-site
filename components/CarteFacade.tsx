"use client";

import { useState } from "react";
import { typoFr } from "@/lib/format";

// Façade de carte Google Maps (retours client du 16/08, V2) : aucun
// iframe au chargement, un aperçu statique avec l'adresse et un bouton
// qui charge la carte au clic. Motifs : budgets Lighthouse intacts et
// zéro cookie Google avant le clic (section Cookies des mentions
// légales alignée sur ce comportement, CSP frame-src en face).
const REQUETE = "Nauticea Yachting, 23 Quai de la Foudre, 83600 Fréjus";
const URL_EMBED = `https://www.google.com/maps?q=${encodeURIComponent(REQUETE)}&z=16&output=embed`;

export default function CarteFacade({ adresse }: { adresse: string }) {
  const [ouverte, setOuverte] = useState(false);

  if (ouverte) {
    return (
      <figure className="mt-5">
        <iframe
          src={URL_EMBED}
          title="Carte Google Maps : Nauticea Yachting à Port Fréjus"
          className="h-96 w-full rounded-lg border border-encre/10"
          loading="lazy"
          allowFullScreen
        />
        <figcaption className="mt-3 text-sm leading-relaxed text-encre/70">
          {typoFr(adresse)}
        </figcaption>
      </figure>
    );
  }

  return (
    <div className="mt-5 rounded-lg border border-encre/10 bg-ecume p-6">
      <p className="leading-relaxed text-encre/80">{typoFr(adresse)}</p>
      <p className="mt-4">
        <button
          type="button"
          onClick={() => setOuverte(true)}
          className="inline-block rounded bg-marine px-5 py-2.5 font-semibold text-white hover:bg-marine-2"
        >
          Afficher la carte
        </button>
      </p>
      <p className="mt-3 text-sm text-encre/70">
        {typoFr(
          "La carte Google Maps se charge au clic ; aucun cookie Google n'est déposé avant."
        )}
      </p>
    </div>
  );
}
