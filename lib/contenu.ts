import fs from "node:fs";
import path from "node:path";

// Contenus rédactionnels éditables dans GitHub sans session
// (micro-session nettoyage du 15/08) : fichiers Markdown à front
// matter minimal dans content/. Parseur volontairement sans dépendance.

const DOSSIER = path.join(process.cwd(), "content");

export interface Contenu {
  meta: Record<string, string>;
  /** Clés répétées du front matter, collectées dans l'ordre. */
  listes: Record<string, string[]>;
  corps: string;
  /** Paragraphes du corps, séparés par lignes vides. */
  paragraphes: string[];
}

export function lireContenu(fichier: string): Contenu {
  const brut = fs.readFileSync(path.join(DOSSIER, fichier), "utf-8");
  const meta: Record<string, string> = {};
  const listes: Record<string, string[]> = {};
  let corps = brut;
  const m = brut.match(/^---\n([\s\S]*?)\n---\n?/);
  if (m) {
    corps = brut.slice(m[0].length);
    for (const ligne of m[1].split("\n")) {
      const deuxPoints = ligne.indexOf(":");
      if (deuxPoints < 0) {
        continue;
      }
      const cle = ligne.slice(0, deuxPoints).trim();
      const valeur = ligne.slice(deuxPoints + 1).trim();
      meta[cle] = valeur;
      (listes[cle] ??= []).push(valeur);
    }
  }
  const paragraphes = corps
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  return { meta, listes, corps: corps.trim(), paragraphes };
}

export interface ActualiteContenu {
  slug: string;
  titre: string;
  date: string;
  image?: string;
  /** Image Open Graph (et vignette de liste à défaut d'image). */
  og_image?: string;
  /** Boutons de fin d'article, paires cta_texte / cta_lien répétées. */
  ctas: { texte: string; lien: string }[];
  paragraphes: string[];
}

// Actualités publiées dans content/actualites/ (gabarit _* ignoré),
// triées par date décroissante. Rendues sur /actualites et
// /actualites/[slug] dès leur commit.
export function lireActualitesContenu(): ActualiteContenu[] {
  const dossier = path.join(DOSSIER, "actualites");
  if (!fs.existsSync(dossier)) {
    return [];
  }
  return fs
    .readdirSync(dossier)
    .filter((f) => f.endsWith(".md") && !f.startsWith("_"))
    .map((f) => {
      const c = lireContenu(path.join("actualites", f));
      const textes = c.listes.cta_texte ?? [];
      const liens = c.listes.cta_lien ?? [];
      return {
        slug: f.slice(0, -3),
        titre: c.meta.titre ?? f.slice(0, -3),
        date: c.meta.date ?? "",
        image: c.meta.image || undefined,
        og_image: c.meta.og_image || undefined,
        ctas: textes
          .map((texte, i) => ({ texte, lien: liens[i] ?? "" }))
          .filter((cta) => cta.texte && cta.lien),
        paragraphes: c.paragraphes,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

// Dimensions réelles d'une image de public/ (PNG et JPEG), pour donner
// à next/image le bon ratio des figures insérées dans le corps d'une
// actualité. Null si le fichier manque ou n'est pas lisible.
export function dimensionsImagePublique(
  src: string
): { width: number; height: number } | null {
  const fichier = path.join(process.cwd(), "public", src.replace(/^\//, ""));
  if (!fs.existsSync(fichier)) {
    return null;
  }
  const octets = fs.readFileSync(fichier);
  // PNG : signature puis IHDR (largeur et hauteur en big-endian).
  if (octets.length > 24 && octets.readUInt32BE(0) === 0x89504e47) {
    return { width: octets.readUInt32BE(16), height: octets.readUInt32BE(20) };
  }
  // JPEG : balayage des segments jusqu'au SOF.
  if (octets.length > 4 && octets.readUInt16BE(0) === 0xffd8) {
    let i = 2;
    while (i + 9 < octets.length) {
      if (octets[i] !== 0xff) {
        return null;
      }
      const marqueur = octets[i + 1];
      if (
        marqueur >= 0xc0 &&
        marqueur <= 0xcf &&
        marqueur !== 0xc4 &&
        marqueur !== 0xc8 &&
        marqueur !== 0xcc
      ) {
        return {
          height: octets.readUInt16BE(i + 5),
          width: octets.readUInt16BE(i + 7),
        };
      }
      i += 2 + octets.readUInt16BE(i + 2);
    }
  }
  return null;
}

// La section Actualités réapparaît d'elle-même dans la navigation et le
// sitemap dès qu'une actualité datée de 2026 ou plus existe dans
// content/actualites/ (le gabarit _gabarit.md est ignoré).
export function actualitesActives(): boolean {
  const dossier = path.join(DOSSIER, "actualites");
  if (!fs.existsSync(dossier)) {
    return false;
  }
  return fs
    .readdirSync(dossier)
    .filter((f) => f.endsWith(".md") && !f.startsWith("_"))
    .some((f) => {
      const annee = Number(
        lireContenu(path.join("actualites", f)).meta.date?.slice(0, 4)
      );
      return Number.isFinite(annee) && annee >= 2026;
    });
}
