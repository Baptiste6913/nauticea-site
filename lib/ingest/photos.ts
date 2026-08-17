// Sélection des photos d'une fiche PDF.
//
// Une fiche mêle trois natures d'images : le logo du vendeur, une grande
// photo de tête, et la galerie. Le critère de tri n'est pas la seule
// résolution du fichier : un logo est petit à l'impression tout en étant
// lourd en pixels. C'est ce rapport qui le trahit.
import type { ImagePdf } from "./pdf.ts";

/**
 * Taille d'impression, en points, en dessous de laquelle une image est un
 * logo ou un pictogramme, jamais une photo de bateau. Le critère porte sur
 * le plus grand côté posé : un logo est petit dans les deux dimensions,
 * alors qu'une vignette de galerie est basse mais large. Les logos des
 * fiches sont posés en 39 points, les vignettes en 112 sur 75.
 */
export const DESSIN_MIN_POINTS = 90;

/** Résolution en dessous de laquelle une photo est écartée. */
export const PIXELS_MIN = 400;

/** Résolution en dessous de laquelle une photo est signalée basse définition. */
export const PIXELS_BASSE_DEF = 800;

export type MotifRejet = "logo-ou-pictogramme" | "resolution-insuffisante";

export interface PhotoRetenue {
  image: ImagePdf;
  /** Rang de publication, à partir de 1. */
  rang: number;
  basseDef: boolean;
}

export interface PhotoRejetee {
  image: ImagePdf;
  motif: MotifRejet;
  detail: string;
}

export interface TriPhotos {
  retenues: PhotoRetenue[];
  rejetees: PhotoRejetee[];
}

function cote(image: ImagePdf): number {
  return Math.max(image.largeur, image.hauteur);
}

/**
 * Trie les images d'une fiche. L'ordre de publication est l'ordre de
 * dessin : c'est celui que le vendeur a voulu sur la fiche.
 */
export function trierPhotos(images: ImagePdf[]): TriPhotos {
  const retenues: PhotoRetenue[] = [];
  const rejetees: PhotoRejetee[] = [];

  for (const image of [...images].sort((a, b) => a.rang - b.rang)) {
    if (Math.max(image.largeurDessin, image.hauteurDessin) < DESSIN_MIN_POINTS) {
      rejetees.push({
        image,
        motif: "logo-ou-pictogramme",
        detail: `posée en ${Math.round(image.largeurDessin)}x${Math.round(
          image.hauteurDessin
        )} points, sous le seuil de ${DESSIN_MIN_POINTS}`,
      });
      continue;
    }
    if (cote(image) < PIXELS_MIN) {
      rejetees.push({
        image,
        motif: "resolution-insuffisante",
        detail: `${image.largeur}x${image.hauteur} pixels, sous le seuil de ${PIXELS_MIN}`,
      });
      continue;
    }
    retenues.push({
      image,
      rang: retenues.length + 1,
      basseDef: cote(image) < PIXELS_BASSE_DEF,
    });
  }

  return { retenues, rejetees };
}

/** Nom de fichier d'une photo publiée, sur le modèle du corpus. */
export function nomPhoto(rang: number): string {
  return `${String(rang).padStart(2, "0")}.jpg`;
}
