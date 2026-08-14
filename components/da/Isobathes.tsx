import { champIsobathes, mulberry32 } from "@/lib/da/champ";

// Motif signature de la DA : champ ou bande d'isobathes en SVG serveur,
// déterministe (graine fixe), toujours décoratif (aria-hidden).
// Règles DA.md : niveau 0 uniquement, jamais sous du texte courant,
// un champ visible par viewport au maximum.

interface Props {
  graine: number;
  variante?: "fond" | "separateur";
  /** Couleur des traits (token). */
  couleur?: string;
  /** Opacité maximale des traits : <= .35 sur sombre, <= .5 sur clair. */
  opacite?: number;
  /** Chiffres de sonde décoratifs (hero et pied de page seulement). */
  sondes?: boolean;
  className?: string;
}

export default function Isobathes({
  graine,
  variante = "fond",
  couleur = "var(--color-azur)",
  opacite = 0.3,
  sondes = false,
  className = "",
}: Props) {
  const hauteur = variante === "separateur" ? 120 : 600;
  const seuils =
    variante === "separateur" ? [0.42, 0.5, 0.58, 0.66] : undefined;
  // Échantillonnage plus grossier pour le champ plein : le coût de peinture
  // du SVG pèse sur le budget mobile, le caractère du motif est préservé.
  const champ = champIsobathes(
    graine,
    1440,
    hauteur,
    seuils,
    variante === "fond" ? 40 : 24
  );
  const alea = mulberry32(graine + 7);
  // Sondes décoratives (tracé stylisé, aucune mesure revendiquée).
  const chiffres = sondes
    ? [2, 5, 9, 14, 21, 31].map((valeur) => ({
        valeur,
        x: 120 + alea() * 1200,
        y: 80 + alea() * (hauteur - 160),
      }))
    : [];

  return (
    <svg
      viewBox={`0 0 1440 ${hauteur}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      className={`pointer-events-none select-none ${className}`}
    >
      {champ.courbes.map(({ seuil, chemins }, rang) =>
        chemins.map((d, i) => (
          <path
            key={`${seuil}-${i}`}
            d={d}
            fill="none"
            stroke={couleur}
            strokeWidth={rang % 3 === 0 ? 1.4 : 0.8}
            opacity={opacite * (0.55 + 0.45 * (rang / champ.courbes.length))}
          />
        ))
      )}
      {chiffres.map((s) => (
        <text
          key={`${s.x}-${s.y}`}
          x={s.x}
          y={s.y}
          fill={couleur}
          opacity={opacite * 1.4}
          fontSize="13"
          fontFamily="var(--font-mono)"
        >
          {s.valeur}
        </text>
      ))}
    </svg>
  );
}

/** Courbe unique qui se dessine sous les titres de cartes au hover. */
export function TraceIsobathe({
  graine = 3,
  couleur = "var(--color-azur-2)",
}: {
  graine?: number;
  couleur?: string;
}) {
  const alea = mulberry32(graine);
  const points: string[] = [`M0 ${8 + alea() * 2}`];
  for (let x = 24; x <= 240; x += 24) {
    points.push(`${x} ${(6 + alea() * 5).toFixed(1)}`);
  }
  const d = `${points[0]} L${points.slice(1).join(" L")}`;
  return (
    <svg
      viewBox="0 0 240 14"
      aria-hidden="true"
      className="pointer-events-none h-[10px] w-full"
      preserveAspectRatio="none"
    >
      <path
        d={d}
        fill="none"
        stroke={couleur}
        strokeWidth="1.6"
        className="trace-isobathe"
        pathLength={260}
      />
    </svg>
  );
}
