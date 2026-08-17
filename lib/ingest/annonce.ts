// Conversion d'une fiche PDF en annonce du site.
//
// Deux règles de fond, prises ici et documentées dans
// docs/PUBLIER-BATEAU.md :
//
// 1. Le slug d'un bateau nouveau est marque-modele-annee. Mais si le
//    bateau existe déjà sur le site, son slug est conservé, car il porte
//    des URL indexées et sert de cible aux redirections 301 du site
//    historique. Créer un second slug pour le même bateau produirait un
//    doublon et diluerait le référencement.
// 2. Un champ que la fiche ne donne pas ne remplace jamais un champ déjà
//    renseigné sur le site. L'ingestion complète, elle n'appauvrit pas.
import type { Boat } from "../types.ts";
import { A_CONFIRMER, type FichePdf } from "./fiche-pdf.ts";

export function slugifier(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Slug d'un bateau nouveau : marque, modèle, année. */
export function slugDeFiche(fiche: FichePdf): string {
  const morceaux = [fiche.marque, fiche.modele, fiche.annee].filter(
    (m) => m !== "" && m !== A_CONFIRMER
  );
  return slugifier(morceaux.join(" "));
}

/** Annonces existantes de même marque et même modèle, une fois normalisés. */
export function annoncesCorrespondantes(
  fiche: FichePdf,
  existantes: Boat[]
): Boat[] {
  const cle = slugifier(`${fiche.marque} ${fiche.modele}`);
  if (cle === "") {
    return [];
  }
  return existantes.filter((b) => slugifier(`${b.marque} ${b.modele}`) === cle);
}

export interface Rapprochement {
  /** Annonce à mettre à jour, absente s'il s'agit d'un bateau nouveau. */
  annonce?: Boat;
  /** Candidates indiscernables : il faut alors une décision humaine. */
  ambigues?: Boat[];
  note?: string;
}

/**
 * Rapproche la fiche d'une annonce déjà en ligne.
 *
 * Le piège est réel dans ce catalogue : deux Sealine C335 y coexistent, un
 * neuf de 2026 et une occasion de 2021. Se contenter de la marque et du
 * modèle écraserait l'une avec l'autre. L'année tranche quand elle est
 * connue ; sinon on refuse de choisir et on rend la main.
 */
export function rapprocher(fiche: FichePdf, existantes: Boat[]): Rapprochement {
  const candidates = annoncesCorrespondantes(fiche, existantes);
  if (candidates.length === 0) {
    return {};
  }
  if (candidates.length === 1) {
    return { annonce: candidates[0] };
  }
  const memeAnnee = candidates.filter(
    (b) => fiche.annee !== A_CONFIRMER && b.specs["Année"] === fiche.annee
  );
  if (memeAnnee.length === 1) {
    return {
      annonce: memeAnnee[0],
      note: `${candidates.length} annonces portent cette marque et ce modèle, l'année ${fiche.annee} a tranché`,
    };
  }
  return { ambigues: candidates };
}

/**
 * Annonces qui pourraient être le même bateau alors que le rapprochement
 * a échoué. Le cas est réel : la fiche du Fountaine Pajot dit « Motor
 * Yacht 40 » là où le site dit « MY40 », si bien que le modèle ne
 * concorde pas et qu'une seconde annonce serait créée pour le même
 * bateau. On ne décide rien, on signale, avec de quoi trancher : même
 * marque, et même année ou longueur très proche.
 */
export function doublonsPossibles(fiche: FichePdf, existantes: Boat[]): Boat[] {
  const marque = slugifier(fiche.marque);
  if (marque === "" || marque === slugifier(A_CONFIRMER)) {
    return [];
  }
  const modele = slugifier(`${fiche.marque} ${fiche.modele}`);
  return existantes.filter((b) => {
    if (slugifier(b.marque) !== marque) {
      return false;
    }
    if (slugifier(`${b.marque} ${b.modele}`) === modele) {
      // Rapprochement déjà traité ailleurs, ce n'est pas un doublon.
      return false;
    }
    const memeAnnee =
      fiche.annee !== A_CONFIRMER && b.specs["Année"] === fiche.annee;
    const longueurExistante = Number(b.specs["Longueur (m)"]);
    const memeLongueur =
      fiche.longueur !== null &&
      Number.isFinite(longueurExistante) &&
      Math.abs(longueurExistante - fiche.longueur) <= 0.15;
    return memeAnnee || memeLongueur;
  });
}

const CATEGORIES: Array<[RegExp, Boat["categorie"]]> = [
  [/catamaran/i, "catamaran"],
  [/voilier|sail/i, "voiliers"],
];

const SOUS_CATEGORIES: Record<string, string> = {
  "Vedettes de croisière": "vedette",
  "Bateaux de plaisance": "vedette",
  "Cuddy Cabin": "cuddy-cabin",
};

export interface Correspondance {
  categorie: Boat["categorie"];
  sous_categorie: string;
  /** Renseigné quand le classement n'est pas certain. */
  reserve?: string;
}

/**
 * Classement d'une annonce. La fiche ne porte pas la catégorie du site :
 * elle porte un type de bateau, dont seuls quelques termes sont
 * concluants. Hors de ces termes, on retient la catégorie majoritaire du
 * site et on le signale, plutôt que de trancher en silence.
 */
export function classer(fiche: FichePdf): Correspondance {
  const type = fiche.type_bateau;
  for (const [motif, categorie] of CATEGORIES) {
    if (motif.test(type)) {
      return { categorie, sous_categorie: SOUS_CATEGORIES[type] ?? slugifier(type) };
    }
  }
  const sous = SOUS_CATEGORIES[type];
  return {
    categorie: "bateaux-moteur",
    sous_categorie: sous ?? slugifier(type),
    reserve:
      type === A_CONFIRMER
        ? "catégorie retenue par défaut, la fiche ne donne pas de type de bateau"
        : `catégorie retenue par défaut pour le type « ${type} », à vérifier` +
          (sous === undefined ? ", et sous-catégorie déduite du même type" : ""),
  };
}

/** Spécifications affichées, dans l'ordre attendu sur la fiche du site. */
export function specsDeFiche(fiche: FichePdf): Record<string, string> {
  const specs: Record<string, string> = {};
  const poser = (cle: string, valeur: string | number | null): void => {
    if (valeur === null || valeur === "" || valeur === A_CONFIRMER) {
      return;
    }
    specs[cle] = String(valeur);
  };

  poser("Année", fiche.annee);
  poser("Longueur (m)", fiche.longueur === null ? null : fiche.longueur.toFixed(2));
  poser("Largeur (m)", fiche.largeur === null ? null : fiche.largeur.toFixed(2));
  const premier = fiche.moteurs[0];
  if (premier) {
    poser("Marque moteur", premier.marque);
    poser("Modèle moteur", premier.modele);
    poser("Puissance", premier.puissance);
    poser("Heures Moteur(s)", premier.heures);
    poser(
      "Nombre de moteurs",
      fiche.moteurs.length > 1 ? String(fiche.moteurs.length) : null
    );
  }
  poser("Carburant", fiche.carburant);
  poser("Type d'entraînement", fiche.entrainement);
  poser("Matériau de coque", fiche.materiau_coque);
  poser("Cabines", fiche.cabines);
  poser("Toilettes", fiche.toilettes);
  poser("Statut fiscal", fiche.statut_fiscal);
  poser("Emplacement", fiche.emplacement);

  // Caractéristiques complémentaires de la fiche, reprises telles quelles
  // sans les libellés déjà couverts au-dessus.
  const dejaVues = new Set([
    "Marque",
    "Modèle",
    "Année",
    "Longueur",
    "Prix",
    "Condition",
    "Type de bateau",
    "Type de carburant",
    "Emplacement du bateau",
    "Matériau de la coque",
    "Type d'entraînement",
    "Maître beau",
    "Cabines d'invités",
    "Toilettes Invités",
    "Nom",
    "Longueur hors-tout",
  ]);
  for (const [cle, valeur] of Object.entries(fiche.caracteristiques)) {
    if (!dejaVues.has(cle) && valeur !== "" && !(cle in specs)) {
      specs[cle] = valeur;
    }
  }
  return specs;
}

/** Description publiée : texte du vendeur, puis celui du constructeur. */
export function descriptionDeFiche(fiche: FichePdf): string {
  const blocs = [fiche.description.trim()];
  if (fiche.description_constructeur.trim() !== "") {
    blocs.push(
      `Description fournie par le constructeur\n${fiche.description_constructeur.trim()}`
    );
  }
  return blocs.filter((b) => b !== "").join("\n\n");
}

export interface OptionsAnnonce {
  /** Chemins des photos déjà écrites, dans l'ordre de publication. */
  photos: string[];
  photosBasseDef: number;
  /** Date d'ingestion, au format AAAA-MM-JJ. */
  date: string;
  /** Annonce déjà en ligne pour ce bateau, s'il y en a une. */
  existante?: Boat;
}

export interface Ingestion {
  annonce: Boat;
  /** Réserves de classement et champs conservés de l'annonce existante. */
  notes: string[];
}

export function annonceDepuisFiche(
  fiche: FichePdf,
  options: OptionsAnnonce
): Ingestion {
  const notes: string[] = [];
  const existante = options.existante;
  const classement = classer(fiche);
  if (classement.reserve && !existante) {
    notes.push(classement.reserve);
  }

  const titre = [fiche.marque, fiche.modele]
    .filter((m) => m !== A_CONFIRMER)
    .join(" ")
    .toUpperCase()
    .trim();

  // Sur mise à jour, le classement et l'URL héritée de l'annonce en ligne
  // sont conservés : la fiche ne les porte pas, et ils sont référencés.
  if (existante) {
    if (existante.categorie !== classement.categorie) {
      notes.push(
        `catégorie « ${existante.categorie} » conservée depuis l'annonce en ligne, la fiche suggérait « ${classement.categorie} »`
      );
    }
    if (existante.sous_categorie !== classement.sous_categorie) {
      notes.push(
        `sous-catégorie « ${existante.sous_categorie} » conservée depuis l'annonce en ligne`
      );
    }
  }

  // Règle 2 : les spécifications de l'annonce en ligne que la fiche ne
  // reprend pas sont conservées. La puissance moteur, par exemple, figure
  // sur le site sous « Puissance CV » et manque à certaines fiches : la
  // perdre à l'ingestion appauvrirait l'annonce.
  const specs = specsDeFiche(fiche);
  if (existante) {
    for (const [cle, valeurExistante] of Object.entries(existante.specs)) {
      if (!(cle in specs) && valeurExistante !== "" && valeurExistante !== A_CONFIRMER) {
        specs[cle] = valeurExistante;
        notes.push(
          `spécification « ${cle} » (${valeurExistante}) conservée depuis l'annonce en ligne, la fiche ne la donne pas`
        );
      }
    }
  }

  const annonce: Boat = {
    id: existante?.id ?? slugDeFiche(fiche),
    slug: existante?.slug ?? slugDeFiche(fiche),
    titre: titre === "" ? A_CONFIRMER : titre,
    marque: fiche.marque.toUpperCase(),
    modele: fiche.modele,
    categorie: existante?.categorie ?? classement.categorie,
    sous_categorie: existante?.sous_categorie ?? classement.sous_categorie,
    etat: fiche.condition,
    prix: fiche.prix,
    devise: fiche.devise,
    specs,
    equipements: fiche.equipements.flatMap((s) => s.items),
    photos: options.photos,
    description: descriptionDeFiche(fiche),
    contact: existante?.contact ?? A_CONFIRMER,
    ancienne_url: existante?.ancienne_url ?? A_CONFIRMER,
    updated_at: options.date,
    source: "fiche-pdf",
  };

  if (options.photosBasseDef > 0) {
    annonce.photos_basse_def = options.photosBasseDef;
  }
  if (existante?.vendu) {
    annonce.vendu = true;
    notes.push("marquage « vendu » conservé depuis l'annonce en ligne");
  }
  if (options.photos.length === 0) {
    notes.push(
      existante && existante.photos.length > 0
        ? `aucune photo retenue dans la fiche, les ${existante.photos.length} photos en ligne sont conservées`
        : "aucune photo retenue dans la fiche"
    );
    if (existante && existante.photos.length > 0) {
      annonce.photos = existante.photos;
    }
  }

  return { annonce, notes };
}

/** Différences entre deux annonces, champ par champ, pour le rapport. */
export function diffAnnonces(avant: Boat | undefined, apres: Boat): string[] {
  if (!avant) {
    return [`annonce nouvelle, slug « ${apres.slug} »`];
  }
  const lignes: string[] = [];
  const comparer = (nom: string, a: unknown, b: unknown): void => {
    const ta = JSON.stringify(a) ?? "";
    const tb = JSON.stringify(b) ?? "";
    if (ta !== tb) {
      lignes.push(`${nom} : ${abreger(ta)} devient ${abreger(tb)}`);
    }
  };
  comparer("titre", avant.titre, apres.titre);
  comparer("marque", avant.marque, apres.marque);
  comparer("modele", avant.modele, apres.modele);
  comparer("etat", avant.etat, apres.etat);
  comparer("prix", avant.prix, apres.prix);
  comparer("devise", avant.devise, apres.devise);
  comparer("categorie", avant.categorie, apres.categorie);
  comparer("sous_categorie", avant.sous_categorie, apres.sous_categorie);
  comparer("nombre de photos", avant.photos.length, apres.photos.length);
  comparer("nombre d'équipements", avant.equipements.length, apres.equipements.length);
  comparer("longueur de la description", avant.description.length, apres.description.length);
  const clesSpecs = new Set([
    ...Object.keys(avant.specs),
    ...Object.keys(apres.specs),
  ]);
  for (const cle of [...clesSpecs].sort()) {
    comparer(`spec « ${cle} »`, avant.specs[cle], apres.specs[cle]);
  }
  return lignes.length === 0 ? ["aucune différence"] : lignes;
}

function abreger(texte: string): string {
  const propre = texte.replace(/^"|"$/g, "");
  return propre.length > 70 ? `${propre.slice(0, 70)}...` : propre || "vide";
}
