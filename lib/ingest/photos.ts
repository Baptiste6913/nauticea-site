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

// ---------- dimensions d'un JPEG déjà publié ----------

export interface Dimensions {
  largeur: number;
  hauteur: number;
}

/**
 * Dimensions d'un JPEG, lues à ses marqueurs de cadre (SOF). Écrit à la
 * main pour rester sans dépendance, comme le lecteur de PDF. Rend null si
 * le fichier n'est pas un JPEG lisible, jamais d'exception.
 */
export function dimensionsJpeg(octets: Uint8Array): Dimensions | null {
  if (octets.length < 4 || octets[0] !== 0xff || octets[1] !== 0xd8) {
    return null;
  }
  let i = 2;
  while (i + 9 < octets.length) {
    if (octets[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marqueur = octets[i + 1] as number;
    // Remplissage et marqueurs sans charge utile.
    if (marqueur === 0xff || marqueur === 0x01 || (marqueur >= 0xd0 && marqueur <= 0xd9)) {
      i += 2;
      continue;
    }
    const longueur = ((octets[i + 2] as number) << 8) | (octets[i + 3] as number);
    // SOF0 à SOF15, hors marqueurs de Huffman (C4), arithmétique (C8) et
    // de redémarrage (CC), qui partagent la plage.
    const estCadre =
      marqueur >= 0xc0 &&
      marqueur <= 0xcf &&
      marqueur !== 0xc4 &&
      marqueur !== 0xc8 &&
      marqueur !== 0xcc;
    if (estCadre) {
      const hauteur = ((octets[i + 5] as number) << 8) | (octets[i + 6] as number);
      const largeur = ((octets[i + 7] as number) << 8) | (octets[i + 8] as number);
      return largeur > 0 && hauteur > 0 ? { largeur, hauteur } : null;
    }
    if (longueur < 2) {
      return null;
    }
    i += 2 + longueur;
  }
  return null;
}

// ---------- arbitrage entre photos en ligne et photos de la fiche ----------

export type DecisionPhoto = "nouvelle" | "remplacee" | "conservee" | "gardee-hors-fiche";

export interface ArbitragePhoto {
  rang: number;
  nom: string;
  decision: DecisionPhoto;
  /** Photo de la fiche à écrire, absente si l'existante est conservée. */
  aEcrire?: PhotoRetenue;
  detail: string;
}

export interface PhotoEnLigne {
  rang: number;
  nom: string;
  dimensions: Dimensions | null;
}

/**
 * Arbitre photo par photo entre ce qui est en ligne et ce que la fiche
 * apporte.
 *
 * Règle de fond, posée après avoir mesuré les fiches réelles : une photo
 * en ligne n'est jamais remplacée par une version de résolution
 * inférieure. Les fiches PDF servent des visuels de 480 par 320, là où le
 * site en a parfois de bien plus grands ; un re-dépôt appauvrissait donc
 * la galerie. Les textes, eux, sont toujours mis à jour.
 *
 * Corollaire : une photo en ligne au-delà de ce que la fiche fournit est
 * conservée, jamais supprimée. Le re-dépôt d'une fiche devient sans
 * danger.
 */
export function arbitrerPhotos(
  enLigne: PhotoEnLigne[],
  nouvelles: PhotoRetenue[]
): ArbitragePhoto[] {
  const parRang = new Map(enLigne.map((p) => [p.rang, p]));
  const decisions: ArbitragePhoto[] = [];

  for (const photo of nouvelles) {
    const existante = parRang.get(photo.rang);
    const coteNouvelle = cote(photo.image);
    if (!existante) {
      decisions.push({
        rang: photo.rang,
        nom: nomPhoto(photo.rang),
        decision: "nouvelle",
        aEcrire: photo,
        detail: `${photo.image.largeur}x${photo.image.hauteur} pixels, aucune photo à ce rang auparavant`,
      });
      continue;
    }
    const coteExistante = existante.dimensions
      ? Math.max(existante.dimensions.largeur, existante.dimensions.hauteur)
      : 0;
    if (coteNouvelle > coteExistante) {
      decisions.push({
        rang: photo.rang,
        nom: existante.nom,
        decision: "remplacee",
        aEcrire: photo,
        detail: existante.dimensions
          ? `${existante.dimensions.largeur}x${existante.dimensions.hauteur} remplacée par ${photo.image.largeur}x${photo.image.hauteur} pixels, la fiche fait mieux`
          : `photo en ligne illisible, remplacée par ${photo.image.largeur}x${photo.image.hauteur} pixels`,
      });
      continue;
    }
    decisions.push({
      rang: photo.rang,
      nom: existante.nom,
      decision: "conservee",
      detail: existante.dimensions
        ? `${existante.dimensions.largeur}x${existante.dimensions.hauteur} conservée, la fiche n'offrait que ${photo.image.largeur}x${photo.image.hauteur} pixels`
        : `photo en ligne conservée, la fiche n'offrait que ${photo.image.largeur}x${photo.image.hauteur} pixels`,
    });
  }

  for (const existante of enLigne) {
    if (!nouvelles.some((p) => p.rang === existante.rang)) {
      decisions.push({
        rang: existante.rang,
        nom: existante.nom,
        decision: "gardee-hors-fiche",
        detail: existante.dimensions
          ? `${existante.dimensions.largeur}x${existante.dimensions.hauteur} conservée, la fiche ne va pas jusqu'à ce rang`
          : "conservée, la fiche ne va pas jusqu'à ce rang",
      });
    }
  }

  return decisions.sort((a, b) => a.rang - b.rang);
}
