import fs from "node:fs";
import path from "node:path";
import type { Actualite, Boat } from "../types";

// Source de données Phase A : corpus local extrait du site historique.
// Phase B : remplacer cet import par lib/sources/boatsgroup.ts (même signature).

const CORPUS_DIR = path.join(process.cwd(), "corpus-nauticea");
const CRAWL_DATE = "2026-08-14";

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

export function getBoats(): Boat[] {
  if (!boatsCache) {
    const raw = readJson<RawBoat[]>("bateaux.json");
    boatsCache = raw.map((b) => ({
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
