// Champ bathymétrique déterministe de la DA (design/DA.md).
// Un seul générateur alimente le SVG serveur (poster, séparateurs,
// fonds) et le shader du hero : même grille de bruit, mêmes seuils,
// donc mêmes courbes au repos. Tracé stylisé, pas un relevé réel.

export const TAILLE_GRILLE_X = 24;
export const TAILLE_GRILLE_Y = 12;

// PRNG mulberry32 : déterministe, identique au build et à l'hydratation.
export function mulberry32(graine: number): () => number {
  let a = graine >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function grilleDepuisGraine(graine: number): Float32Array {
  const alea = mulberry32(graine);
  const grille = new Float32Array(TAILLE_GRILLE_X * TAILLE_GRILLE_Y);
  for (let i = 0; i < grille.length; i += 1) {
    grille[i] = alea();
  }
  return grille;
}

function lisse(t: number): number {
  return t * t * (3 - 2 * t);
}

// Bruit de valeur bilinéaire lissé sur la grille, coordonnées en cases.
export function bruit(grille: Float32Array, x: number, y: number): number {
  const gx = Math.max(0, Math.min(TAILLE_GRILLE_X - 1.001, x));
  const gy = Math.max(0, Math.min(TAILLE_GRILLE_Y - 1.001, y));
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const fx = lisse(gx - x0);
  const fy = lisse(gy - y0);
  const v = (ix: number, iy: number) => grille[iy * TAILLE_GRILLE_X + ix];
  const x1 = Math.min(x0 + 1, TAILLE_GRILLE_X - 1);
  const y1 = Math.min(y0 + 1, TAILLE_GRILLE_Y - 1);
  const haut = v(x0, y0) * (1 - fx) + v(x1, y0) * fx;
  const bas = v(x0, y1) * (1 - fx) + v(x1, y1) * fx;
  return haut * (1 - fy) + bas * fy;
}

// Profondeur du champ en un point normalisé (0..1, 0..1) : deux octaves
// et une pente douce vers le bas du cadre (la côte en haut, le large en
// bas). Le shader GLSL réplique exactement cette formule.
export function profondeur(
  grille: Float32Array,
  u: number,
  v: number
): number {
  const o1 = bruit(grille, u * (TAILLE_GRILLE_X - 1), v * (TAILLE_GRILLE_Y - 1));
  const o2 =
    bruit(
      grille,
      (u * 2 * (TAILLE_GRILLE_X - 1)) % (TAILLE_GRILLE_X - 1),
      (v * 2 * (TAILLE_GRILLE_Y - 1)) % (TAILLE_GRILLE_Y - 1)
    ) * 0.35;
  return (o1 + o2) / 1.35 * 0.72 + v * 0.28;
}

export const SEUILS_ISOBATHES = [0.3, 0.4, 0.5, 0.6, 0.7, 0.8];

interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

// Marching squares : segments de la courbe de niveau `seuil` sur un
// échantillonnage pas x pas du champ, en coordonnées 0..largeur/hauteur.
function segmentsNiveau(
  grille: Float32Array,
  seuil: number,
  largeur: number,
  hauteur: number,
  pas: number
): Segment[] {
  const nx = Math.ceil(largeur / pas);
  const ny = Math.ceil(hauteur / pas);
  const ech: number[][] = [];
  for (let j = 0; j <= ny; j += 1) {
    ech[j] = [];
    for (let i = 0; i <= nx; i += 1) {
      ech[j][i] = profondeur(grille, i / nx, j / ny);
    }
  }
  const segments: Segment[] = [];
  const interp = (a: number, b: number) => (seuil - a) / (b - a || 1e-6);
  for (let j = 0; j < ny; j += 1) {
    for (let i = 0; i < nx; i += 1) {
      const hg = ech[j][i];
      const hd = ech[j][i + 1];
      const bg = ech[j + 1][i];
      const bd = ech[j + 1][i + 1];
      const x = i * pas;
      const y = j * pas;
      const points: Array<[number, number]> = [];
      if (hg >= seuil !== hd >= seuil) {
        points.push([x + interp(hg, hd) * pas, y]);
      }
      if (bg >= seuil !== bd >= seuil) {
        points.push([x + interp(bg, bd) * pas, y + pas]);
      }
      if (hg >= seuil !== bg >= seuil) {
        points.push([x, y + interp(hg, bg) * pas]);
      }
      if (hd >= seuil !== bd >= seuil) {
        points.push([x + pas, y + interp(hd, bd) * pas]);
      }
      if (points.length === 2) {
        segments.push({
          x1: points[0][0],
          y1: points[0][1],
          x2: points[1][0],
          y2: points[1][1],
        });
      }
    }
  }
  return segments;
}

// Chaîne les segments en polylignes puis les adoucit en chemin SVG.
function chainesVersChemins(segments: Segment[]): string[] {
  const restants = [...segments];
  const chemins: string[] = [];
  const cle = (x: number, y: number) => `${x.toFixed(1)},${y.toFixed(1)}`;
  while (restants.length > 0) {
    const points: Array<[number, number]> = [];
    const premier = restants.pop()!;
    points.push([premier.x1, premier.y1], [premier.x2, premier.y2]);
    let etendu = true;
    while (etendu) {
      etendu = false;
      const fin = points[points.length - 1];
      const debut = points[0];
      for (let i = 0; i < restants.length; i += 1) {
        const s = restants[i];
        if (cle(s.x1, s.y1) === cle(fin[0], fin[1])) {
          points.push([s.x2, s.y2]);
          restants.splice(i, 1);
          etendu = true;
          break;
        }
        if (cle(s.x2, s.y2) === cle(fin[0], fin[1])) {
          points.push([s.x1, s.y1]);
          restants.splice(i, 1);
          etendu = true;
          break;
        }
        if (cle(s.x2, s.y2) === cle(debut[0], debut[1])) {
          points.unshift([s.x1, s.y1]);
          restants.splice(i, 1);
          etendu = true;
          break;
        }
        if (cle(s.x1, s.y1) === cle(debut[0], debut[1])) {
          points.unshift([s.x2, s.y2]);
          restants.splice(i, 1);
          etendu = true;
          break;
        }
      }
    }
    if (points.length < 4) {
      continue;
    }
    // Adoucissement par points médians (quadratiques).
    let d = `M${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;
    for (let i = 1; i < points.length - 1; i += 1) {
      const mx = (points[i][0] + points[i + 1][0]) / 2;
      const my = (points[i][1] + points[i + 1][1]) / 2;
      d += ` Q${points[i][0].toFixed(1)} ${points[i][1].toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
    }
    chemins.push(d);
  }
  return chemins;
}

export interface ChampIsobathes {
  largeur: number;
  hauteur: number;
  courbes: Array<{ seuil: number; chemins: string[] }>;
}

export function champIsobathes(
  graine: number,
  largeur: number,
  hauteur: number,
  seuils: number[] = SEUILS_ISOBATHES,
  pas = 24
): ChampIsobathes {
  const grille = grilleDepuisGraine(graine);
  return {
    largeur,
    hauteur,
    courbes: seuils.map((seuil) => ({
      seuil,
      chemins: chainesVersChemins(
        segmentsNiveau(grille, seuil, largeur, hauteur, pas)
      ),
    })),
  };
}
