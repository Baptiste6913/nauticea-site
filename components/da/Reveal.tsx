"use client";

import { useEffect, useRef, type ReactNode } from "react";

// Reveal orchestré par section (design/DA.md) : la section déclenche une
// fois à l'entrée du viewport, les enfants directs se décalent en CSS
// (globals.css). Sans JS ou sous prefers-reduced-motion, rien n'est
// masqué : la classe reveal-arme n'est posée qu'ici, au montage.

export default function Reveal({
  as = "div",
  className = "",
  children,
}: {
  as?: "div" | "section";
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const noeud = ref.current;
    if (!noeud) {
      return;
    }
    const reduit = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduit.matches) {
      return;
    }
    document.documentElement.classList.add("reveal-arme");
    if (noeud.getBoundingClientRect().top < window.innerHeight * 0.85) {
      // Déjà dans le viewport : visible sans transition d'entrée.
      noeud.classList.add("est-visible");
      return;
    }
    const observateur = new IntersectionObserver(
      (entrees) => {
        for (const entree of entrees) {
          if (entree.isIntersecting) {
            noeud.classList.add("est-visible");
            observateur.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px" }
    );
    observateur.observe(noeud);
    return () => observateur.disconnect();
  }, []);

  const Balise = as;
  return (
    <Balise ref={ref} data-reveal className={className}>
      {children}
    </Balise>
  );
}
