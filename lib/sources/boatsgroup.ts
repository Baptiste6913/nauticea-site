import type { Boat } from "../types";

// Phase B (stub, non branché) : source de données flux XML Boats Group,
// format Open Marine. Même signature que lib/sources/corpus.ts : pour
// basculer, remplacer l'import de corpus.ts par boatsgroup.ts dans les
// pages (une ligne), après avoir alimenté le JSON via le workflow
// .github/workflows/sync-feed.yml.
//
// Le parseur est volontairement sans dépendance : le format Open Marine
// est un XML régulier dont on extrait les balises utiles.

const A_CONFIRMER = "a_confirmer";

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

export function parseOpenMarine(xml: string): Boat[] {
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
    const prix = prixBrut ? Number(prixBrut.replace(/[^\d.]/g, "")) : null;

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
      devise,
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
