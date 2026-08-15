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
