"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// Monte la scène WebGL du hero (relief bathymétrique) uniquement quand
// toutes les conditions de design/DA.md sont réunies : après l'évènement
// load et un temps d'inactivité (donc après le LCP), hors
// prefers-reduced-motion et Save-Data, et si WebGL2 répond. Sinon, rien
// n'est téléchargé : le poster SVG serveur situé sous ce composant est
// la version complète.

const ReliefRadeScene = dynamic(() => import("./ReliefRadeScene"), {
  ssr: false,
});

interface NavigatorConnexion extends Navigator {
  connection?: { saveData?: boolean };
}

export default function ReliefRade({ graine }: { graine: number }) {
  const [pret, setPret] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    // Budget mobile (design/DA.md) : la derive du relief est reservee aux
    // pointeurs fins ; au tactile, le poster SVG est la version complete.
    if (!window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 768px)").matches) {
      return;
    }
    if ((navigator as NavigatorConnexion).connection?.saveData === true) {
      return;
    }
    const essai = document.createElement("canvas").getContext("webgl2");
    if (!essai) {
      return;
    }

    let annule = false;
    const armer = () => {
      const idle =
        "requestIdleCallback" in window
          ? window.requestIdleCallback
          : (fn: () => void) => window.setTimeout(fn, 350);
      idle(() => {
        if (!annule) {
          setPret(true);
        }
      });
    };
    if (document.readyState === "complete") {
      armer();
    } else {
      window.addEventListener("load", armer, { once: true });
    }
    return () => {
      annule = true;
      window.removeEventListener("load", armer);
    };
  }, []);

  if (!pret) {
    return null;
  }
  return <ReliefRadeScene graine={graine} />;
}
