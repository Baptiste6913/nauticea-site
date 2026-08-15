"use client";

import { useEffect, useRef, type ReactNode } from "react";

// Tilt 3D des cartes bateau (design/DA.md) : desktop pointeur fin
// uniquement, 6 degrés maximum, lissage rAF, désactivé au tactile et
// sous prefers-reduced-motion.

const MAX_DEGRES = 6;

export default function Tilt({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const noeud = ref.current;
    if (!noeud) {
      return;
    }
    const actif = window.matchMedia(
      "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)"
    );
    if (!actif.matches) {
      return;
    }

    let cibleX = 0;
    let cibleY = 0;
    let courantX = 0;
    let courantY = 0;
    let rafId = 0;
    let anime = false;

    const pas = () => {
      courantX += (cibleX - courantX) * 0.18;
      courantY += (cibleY - courantY) * 0.18;
      noeud.style.transform = `perspective(700px) rotateX(${courantX.toFixed(2)}deg) rotateY(${courantY.toFixed(2)}deg)`;
      if (
        Math.abs(cibleX - courantX) > 0.05 ||
        Math.abs(cibleY - courantY) > 0.05
      ) {
        rafId = requestAnimationFrame(pas);
      } else {
        anime = false;
        if (cibleX === 0 && cibleY === 0) {
          noeud.style.transform = "";
        }
      }
    };
    const lance = () => {
      if (!anime) {
        anime = true;
        rafId = requestAnimationFrame(pas);
      }
    };
    const surMouvement = (e: PointerEvent) => {
      const zone = noeud.getBoundingClientRect();
      const px = (e.clientX - zone.left) / zone.width - 0.5;
      const py = (e.clientY - zone.top) / zone.height - 0.5;
      cibleX = -py * MAX_DEGRES;
      cibleY = px * MAX_DEGRES;
      lance();
    };
    const surSortie = () => {
      cibleX = 0;
      cibleY = 0;
      lance();
    };

    noeud.addEventListener("pointermove", surMouvement);
    noeud.addEventListener("pointerleave", surSortie);
    return () => {
      noeud.removeEventListener("pointermove", surMouvement);
      noeud.removeEventListener("pointerleave", surSortie);
      cancelAnimationFrame(rafId);
      noeud.style.transform = "";
    };
  }, []);

  return (
    <div ref={ref} className={`will-change-transform ${className}`}>
      {children}
    </div>
  );
}
