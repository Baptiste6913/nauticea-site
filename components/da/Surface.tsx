import type { ElementType, ReactNode } from "react";

// Primitive de relief de la DA : quatre niveaux nommés (design/DA.md),
// ombres teintées marine définies dans les tokens.

const NIVEAUX = {
  fond: "",
  affleure: "shadow-affleure",
  flotte: "shadow-flotte",
  domine: "shadow-domine",
} as const;

export type NiveauSurface = keyof typeof NIVEAUX;

export default function Surface({
  niveau = "affleure",
  as: Balise = "div",
  className = "",
  children,
}: {
  niveau?: NiveauSurface;
  as?: ElementType;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Balise className={`${NIVEAUX[niveau]} ${className}`}>{children}</Balise>
  );
}
