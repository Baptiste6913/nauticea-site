export type EtatBateau = "neuf" | "occasion" | "a_confirmer";

export interface Boat {
  id: string;
  slug: string;
  titre: string;
  marque: string;
  modele: string;
  categorie: "bateaux-moteur" | "voiliers" | "catamaran";
  sous_categorie: string;
  etat: EtatBateau;
  prix: number | null;
  devise: string;
  specs: Record<string, string>;
  equipements: string[];
  photos: string[];
  description: string;
  contact: string;
  ancienne_url: string;
  updated_at: string;
  source: "corpus" | "boatsgroup";
}

export interface PageStatique {
  cle: string;
  texte: string;
}

export interface Actualite {
  slug: string;
  ancienne_url: string;
  titre: string;
  date: string;
  corps: string;
  images: string[];
  videos: string[];
}
