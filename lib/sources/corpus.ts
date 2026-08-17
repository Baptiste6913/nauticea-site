import fs from "node:fs";
import path from "node:path";
import type { Actualite, Boat } from "../types";

// Source de données Phase A : corpus local extrait du site historique.
// Phase B : remplacer cet import par lib/sources/boatsgroup.ts (même signature).

const CORPUS_DIR = path.join(process.cwd(), "corpus-nauticea");
const CRAWL_DATE = "2026-08-14";

// Canal officiel depuis le 17/08 : annonces ingérées depuis les fiches PDF
// BoatWizard, un fichier JSON par annonce. Elles complètent le corpus
// historique et le remplacent au même slug, sans jamais le modifier.
const DIR_INGEREES = path.join(process.cwd(), "content", "annonces");

// Cycle de vie des annonces, tenu par .github/workflows/gerer-annonce.yml :
// « vendus » garde l'annonce en ligne et indexée avec son bandeau,
// « retirees » la sort du site, sa redirection 301 étant ajoutée à
// corpus-nauticea/redirects.csv par le même workflow.
const FICHIER_ETATS = path.join(process.cwd(), "content", "annonces-etats.json");

interface EtatsAnnonces {
  vendus: string[];
  retirees: string[];
}

export function lireEtatsAnnonces(): EtatsAnnonces {
  if (!fs.existsSync(FICHIER_ETATS)) {
    return { vendus: [], retirees: [] };
  }
  const brut = JSON.parse(fs.readFileSync(FICHIER_ETATS, "utf-8")) as Partial<EtatsAnnonces>;
  return {
    vendus: Array.isArray(brut.vendus) ? brut.vendus : [],
    retirees: Array.isArray(brut.retirees) ? brut.retirees : [],
  };
}

interface RawBoat extends Omit<Boat, "photos" | "updated_at" | "source"> {
  photos: string[];
  source: string;
}

let boatsCache: Boat[] | null = null;
let pagesCache: Record<string, string> | null = null;
let actusCache: Actualite[] | null = null;

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(path.join(CORPUS_DIR, file), "utf-8")) as T;
}

// Nettoyage d'artefacts techniques AdsManager par motifs connus (bruit
// d'export, pas du contenu) : lignes « Catégorie -1 » et assimilées.
function nettoyerDescription(texte: string): string {
  return texte
    .split("\n")
    .filter((ligne) => !/^Cat[ée]gorie\s+-?\d+\s*$/.test(ligne.trim()))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Annonces du canal fiche PDF. Leurs photos sont déjà des chemins locaux,
 * écrits par l'ingestion, donc reprises telles quelles.
 */
export function getAnnoncesIngerees(): Boat[] {
  if (!fs.existsSync(DIR_INGEREES)) {
    return [];
  }
  return fs
    .readdirSync(DIR_INGEREES)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map(
      (f) =>
        JSON.parse(fs.readFileSync(path.join(DIR_INGEREES, f), "utf-8")) as Boat
    );
}

export function getBoats(): Boat[] {
  if (!boatsCache) {
    const raw = readJson<RawBoat[]>("bateaux.json");
    const corpus: Boat[] = raw.map((b) => ({
      ...b,
      description: nettoyerDescription(b.description),
      // Les photos sont versionnées dans public/annonces/<slug>/ par
      // scripts/sync-images.mjs ; on référence les copies locales.
      photos: b.photos.map(
        (_, i) => `/annonces/${b.slug}/${String(i + 1).padStart(2, "0")}.jpg`
      ),
      updated_at: CRAWL_DATE,
      source: "corpus" as const,
    }));
    // Une annonce ingérée remplace celle du corpus au même slug, à sa
    // place dans la liste ; un bateau nouveau arrive en tête.
    const ingerees = getAnnoncesIngerees();
    const parSlug = new Map(ingerees.map((b) => [b.slug, b]));
    const slugsCorpus = new Set(corpus.map((b) => b.slug));
    const etats = lireEtatsAnnonces();
    const vendus = new Set(etats.vendus);
    const retirees = new Set(etats.retirees);
    boatsCache = [
      ...ingerees.filter((b) => !slugsCorpus.has(b.slug)),
      ...corpus.map((b) => parSlug.get(b.slug) ?? b),
    ]
      .filter((b) => !retirees.has(b.slug))
      .map((b) => (vendus.has(b.slug) ? { ...b, vendu: true } : b));
  }
  return boatsCache;
}

export function getBoatBySlug(slug: string): Boat | undefined {
  return getBoats().find((b) => b.slug === slug);
}

export function getPages(): Record<string, string> {
  if (!pagesCache) {
    pagesCache = readJson<Record<string, string>>("pages.json");
  }
  return pagesCache;
}

export function getActualites(): Actualite[] {
  if (!actusCache) {
    actusCache = readJson<Actualite[]>("actualites.json").map((a) => ({
      ...a,
      images: a.images.map((u) => {
        const nom = u.split("/").pop() ?? "";
        return `/actualites/images/${nom}`;
      }),
      // Vidéos exclues de la v1 : hébergées uniquement sur l'ancien site,
      // qu'on ne référence jamais (site en fin de vie). Texte conservé.
      videos: [],
    }));
  }
  return actusCache;
}

export function getActualiteBySlug(slug: string): Actualite | undefined {
  return getActualites().find((a) => a.slug === slug);
}

// Actualités du corpus avec contenu réel (texte ou image) : les seules
// indexables. Depuis l'actu Cannes 2026, toutes les actus du corpus
// restent servies par leur URL (cibles de redirections 301) mais hors
// liste et hors sitemap ; celles sans contenu ont un état vide propre.
export function actualiteAContenu(a: Actualite): boolean {
  return a.corps.trim().length > 0 || a.images.length > 0;
}

export function getActualitesPubliees(): Actualite[] {
  return getActualites().filter(actualiteAContenu);
}

// Catégories d'annonces avec stock : les seules listées au sitemap.
export function getCategoriesAvecStock(): string[] {
  return [...new Set(getBoats().map((b) => b.categorie))];
}
