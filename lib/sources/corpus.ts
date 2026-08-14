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

export function getBoats(): Boat[] {
  if (!boatsCache) {
    const raw = readJson<RawBoat[]>("bateaux.json");
    boatsCache = raw.map((b) => ({
      ...b,
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
    }));
  }
  return actusCache;
}

export function getActualiteBySlug(slug: string): Actualite | undefined {
  return getActualites().find((a) => a.slug === slug);
}
