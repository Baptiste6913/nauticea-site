import type { Boat } from "../types";
import { deviseAutorisee } from "../format.ts";

// Phase B (stub, non branché) : source de données flux XML Boats Group,
// format Open Marine. Même signature que lib/sources/corpus.ts : pour
// basculer, remplacer l'import de corpus.ts par boatsgroup.ts dans les
// pages (une ligne), après avoir alimenté le JSON via le workflow
// .github/workflows/sync-feed.yml.
//
// Le parseur est volontairement sans dépendance : le format Open Marine
// est un XML régulier dont on extrait les balises utiles.

const A_CONFIRMER = "a_confirmer";

// Durcissement du flux (17/08, avant activation de la Phase B). Le flux
// est une source externe : rien de ce qu'il contient n'est supposé sain.

/** Plafond de photos retenues par annonce (corpus réel : 47 au maximum). */
export const MAX_IMAGES_PAR_ANNONCE = 48;

/** Schémas d'URL d'image acceptés : ni javascript:, ni data:, ni file:. */
const SCHEMAS_IMAGE = new Set(["http:", "https:"]);

/** Anomalie constatée à l'ingestion : signalée, jamais silencieuse. */
export interface Anomalie {
  annonce: string;
  type:
    | "devise-inconnue"
    | "image-hote-refuse"
    | "image-schema-refuse"
    | "image-url-illisible"
    | "images-tronquees"
    | "telechargement-echoue";
  detail: string;
}

/**
 * Hôtes d'images autorisés, lus depuis la variable FEED_IMAGE_HOSTS
 * (séparateur virgule). Vide ou absente : aucun hôte n'est autorisé, le
 * premier run refuse donc toutes les images et liste les hôtes rencontrés
 * pour que l'opérateur renseigne la variable en connaissance de cause.
 */
export function hotesAutorises(valeur: string | undefined): string[] {
  return (valeur ?? "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter((h) => h.length > 0);
}

/**
 * Verdict sur une URL d'image du flux : schéma admis, URL analysable, et
 * hôte présent dans la liste blanche (comparaison exacte, insensible à la
 * casse).
 */
export function verdictImage(
  brut: string,
  hotes: string[]
): { retenue: true; url: string } | { retenue: false; type: Anomalie["type"]; detail: string } {
  let url: URL;
  try {
    url = new URL(brut.trim());
  } catch {
    return {
      retenue: false,
      type: "image-url-illisible",
      detail: brut.slice(0, 120),
    };
  }
  if (!SCHEMAS_IMAGE.has(url.protocol)) {
    return {
      retenue: false,
      type: "image-schema-refuse",
      detail: `${url.protocol} sur ${brut.slice(0, 80)}`,
    };
  }
  if (!hotes.includes(url.hostname.toLowerCase())) {
    return {
      retenue: false,
      type: "image-hote-refuse",
      detail: url.hostname.toLowerCase(),
    };
  }
  return { retenue: true, url: url.toString() };
}

/**
 * Filtre les photos d'une annonce : ne garde que les URLs autorisées, dans
 * la limite du plafond. Les refus et la troncature sont rendus à
 * l'appelant pour figurer au rapport de synchronisation.
 */
export function filtrerImages(
  photos: string[],
  hotes: string[]
): { retenues: string[]; refus: Array<{ type: Anomalie["type"]; detail: string }> } {
  const retenues: string[] = [];
  const refus: Array<{ type: Anomalie["type"]; detail: string }> = [];
  for (const brut of photos) {
    const v = verdictImage(brut, hotes);
    if (!v.retenue) {
      refus.push({ type: v.type, detail: v.detail });
      continue;
    }
    if (retenues.length >= MAX_IMAGES_PAR_ANNONCE) {
      refus.push({
        type: "images-tronquees",
        detail: `plafond de ${MAX_IMAGES_PAR_ANNONCE} atteint`,
      });
      break;
    }
    retenues.push(v.url);
  }
  return { retenues, refus };
}

function texteBalise(source: string, balise: string): string | null {
  const m = source.match(
    new RegExp(`<${balise}[^>]*>([\\s\\S]*?)</${balise}>`, "i")
  );
  if (!m) {
    return null;
  }
  return decoderEntites(m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim());
}

function decoderEntites(texte: string): string {
  return texte
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function slugifier(texte: string): string {
  return texte
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const CATEGORIES_OPEN_MARINE: Record<string, Boat["categorie"]> = {
  power: "bateaux-moteur",
  sail: "voiliers",
};

export function parseOpenMarine(
  xml: string,
  options: { signaler?: (a: Anomalie) => void } = {}
): Boat[] {
  const signaler = options.signaler ?? (() => {});
  const boats: Boat[] = [];
  const annonces = xml.match(/<Vehicle[\s\S]*?<\/Vehicle>/gi) ?? [];

  for (const bloc of annonces) {
    const id = texteBalise(bloc, "VehicleID") ?? A_CONFIRMER;
    const marque = texteBalise(bloc, "MakeString") ?? A_CONFIRMER;
    const modele = texteBalise(bloc, "Model") ?? A_CONFIRMER;
    const annee = texteBalise(bloc, "ModelYear");
    const prixBrut = texteBalise(bloc, "Price");
    const devise = texteBalise(bloc, "Currency") ?? "EUR";
    const etatBrut = (texteBalise(bloc, "Condition") ?? "").toLowerCase();
    const categorieBrut = (texteBalise(bloc, "BoatCategory") ?? "").toLowerCase();
    const description = texteBalise(bloc, "Description") ?? "";
    const longueur = texteBalise(bloc, "NominalLength");

    const photos = (bloc.match(/<ImageURL[^>]*>([\s\S]*?)<\/ImageURL>/gi) ?? [])
      .map((b) => texteBalise(b, "ImageURL"))
      .filter((u): u is string => Boolean(u));

    const specs: Record<string, string> = {};
    if (longueur) {
      specs["Longueur (m)"] = longueur;
    }
    if (annee) {
      specs["Année"] = annee;
    }

    const titre = `${marque} ${modele}`.trim();
    let prix = prixBrut ? Number(prixBrut.replace(/[^\d.]/g, "")) : null;

    // Devise hors liste blanche : le montant n'est pas affichable de façon
    // fiable, le prix passe donc en « Prix sur demande » et l'anomalie est
    // signalée. Le champ devise retombe sur EUR, inerte puisque le prix
    // est nul, plutôt que de propager une valeur douteuse au JSON-LD.
    const deviseRetenue = deviseAutorisee(devise) ? devise : "EUR";
    if (!deviseAutorisee(devise)) {
      signaler({
        annonce: id,
        type: "devise-inconnue",
        detail: String(devise).slice(0, 40),
      });
      prix = null;
    }

    boats.push({
      id,
      slug: slugifier(`${titre}-${id}`),
      titre,
      marque,
      modele,
      categorie: CATEGORIES_OPEN_MARINE[categorieBrut] ?? "bateaux-moteur",
      sous_categorie: A_CONFIRMER,
      etat:
        etatBrut === "new" ? "neuf" : etatBrut === "used" ? "occasion" : "a_confirmer",
      prix: prix !== null && Number.isFinite(prix) && prix > 0 ? prix : null,
      devise: deviseRetenue,
      specs,
      equipements: [],
      photos,
      description,
      contact: A_CONFIRMER,
      ancienne_url: A_CONFIRMER,
      updated_at: texteBalise(bloc, "LastModificationDate") ?? A_CONFIRMER,
      source: "boatsgroup",
    });
  }

  return boats;
}

// Même signature que corpus.ts. Lit le JSON normalisé produit par le
// workflow de synchronisation (non fourni tant que la Phase B n'est pas
// activée), sinon liste vide.
export function getBoats(): Boat[] {
  throw new Error(
    "Source Boats Group non branchée : activer le workflow sync-feed et remplacer l'import corpus.ts (Phase B)."
  );
}
