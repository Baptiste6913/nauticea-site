// Parseur de fiche PDF BoatWizard, canal officiel d'alimentation du site.
//
// Principe directeur : rien n'est deviné. Un champ absent, illisible ou
// hors des valeurs attendues devient « a_confirmer » et figure au rapport,
// pour être tranché par un humain. Le pied de page vendeur et l'avis de
// non-responsabilité ne sont jamais importés : ils appartiennent à la
// fiche, pas au bateau.
import type { DocumentPdf, Glyphe, Ligne } from "./pdf.ts";
import { ECART_COLONNE, ECART_ESPACE, lirePdf, normaliserTexte } from "./pdf.ts";
import { DEVISES_AUTORISEES, deviseAutorisee } from "../format.ts";

export const A_CONFIRMER = "a_confirmer";

export interface Moteur {
  /** Rang du moteur sur la fiche, « (Moteur 2) » vaut 2. */
  numero: number;
  /** Intitulé du bloc, tel qu'écrit sur la fiche. */
  intitule: string;
  annee: string;
  marque: string;
  modele: string;
  type: string;
  carburant: string;
  entrainement: string;
  puissance: string;
  heures: string;
}

export interface SectionEquipements {
  titre: string;
  items: string[];
}

export interface FichePdf {
  /** Titre de la fiche, tel qu'imprimé en tête. */
  titre: string;
  marque: string;
  modele: string;
  annee: string;
  longueur: number | null;
  largeur: number | null;
  prix: number | null;
  devise: string;
  statut_fiscal: string;
  condition: "neuf" | "occasion" | typeof A_CONFIRMER;
  type_bateau: string;
  carburant: string;
  emplacement: string;
  materiau_coque: string;
  entrainement: string;
  cabines: string;
  toilettes: string;
  nom: string;
  moteurs: Moteur[];
  /** Toutes les paires libellé/valeur relevées, libellés tels quels. */
  caracteristiques: Record<string, string>;
  equipements: SectionEquipements[];
  /** Texte du vendeur, mot pour mot. */
  description: string;
  /** Texte du constructeur, mot pour mot, séparé du précédent. */
  description_constructeur: string;
  /** Champs à trancher par un humain, avec la raison. */
  a_confirmer: string[];
  /** Anomalies de lecture, non bloquantes. */
  avertissements: string[];
  pages: number;
}

export type LectureFiche =
  | { ok: true; fiche: FichePdf; document: DocumentPdf }
  | { ok: false; erreur: string };

// ---------- conversions ----------

/**
 * « 12 m 82 cm » vers 12.82, « 19 m 3 cm » vers 19.03, « 12 m » vers 12.
 * Une forme inattendue rend null : jamais d'approximation.
 */
export function longueurEnMetres(brut: string): number | null {
  const texte = brut.trim();
  const avecCm = /^(\d+)\s*m(?:\s+(\d+)\s*cm)?$/i.exec(texte);
  if (avecCm) {
    const metres = Number(avecCm[1]);
    const centimetres = avecCm[2] === undefined ? 0 : Number(avecCm[2]);
    if (!Number.isFinite(metres) || centimetres >= 100) {
      return null;
    }
    return Math.round((metres + centimetres / 100) * 100) / 100;
  }
  // Forme décimale rencontrée en tête de fiche : « 12.8 m ».
  const decimal = /^(\d+(?:[.,]\d+)?)\s*m$/i.exec(texte);
  if (decimal) {
    const v = Number((decimal[1] as string).replace(",", "."));
    return Number.isFinite(v) ? v : null;
  }
  return null;
}

const SYMBOLES_DEVISE: Record<string, string> = {
  "€": "EUR",
  "£": "GBP",
  $: "USD",
  "CHF": "CHF",
};

export interface Montant {
  prix: number | null;
  devise: string;
  /** Renseigné quand la valeur n'a pas pu être retenue telle quelle. */
  raison?: string;
}

/**
 * « €160,000 » vers 160000 EUR. Le séparateur de milliers anglo-saxon est
 * celui du générateur, jamais un séparateur décimal. Une devise hors liste
 * blanche neutralise le prix plutôt que de risquer un affichage faux.
 */
export function montantDepuisFiche(brut: string): Montant {
  const texte = normaliserTexte(brut).trim();
  if (texte === "") {
    return { prix: null, devise: "EUR", raison: "prix absent de la fiche" };
  }
  const m = /^(CHF|[€£$])\s*([\d.,\s]+)$/.exec(texte);
  if (!m) {
    const inverse = /^([\d.,\s]+)\s*(CHF|[€£$])$/.exec(texte);
    if (!inverse) {
      return {
        prix: null,
        devise: "EUR",
        raison: `prix illisible « ${texte.slice(0, 40)} »`,
      };
    }
    return montantDepuisFiche(`${inverse[2]}${inverse[1]}`);
  }
  const devise = SYMBOLES_DEVISE[m[1] as string];
  const chiffres = (m[2] as string).replace(/[.,\s]/g, "");
  const valeur = Number(chiffres);
  if (devise === undefined || !deviseAutorisee(devise)) {
    return {
      prix: null,
      devise: "EUR",
      raison: `devise « ${m[1]} » hors liste ${DEVISES_AUTORISEES.join(", ")}`,
    };
  }
  if (!Number.isFinite(valeur) || valeur <= 0) {
    return { prix: null, devise, raison: `prix illisible « ${texte}` };
  }
  return { prix: valeur, devise };
}

/** « Occasion » vers occasion, « Neufs » vers neuf, le reste à confirmer. */
export function conditionDepuisFiche(
  brut: string
): "neuf" | "occasion" | typeof A_CONFIRMER {
  const texte = brut.trim().toLowerCase();
  if (/^neufs?$/.test(texte)) {
    return "neuf";
  }
  if (/^occasions?$/.test(texte)) {
    return "occasion";
  }
  return A_CONFIRMER;
}

// ---------- découpage du document ----------

const SECTIONS_MAJEURES = [
  "Détails sur le bateau",
  "Description",
  "Informations et caractéristiques",
  "Description fournie par le constructeur",
];

/** Sections jamais importées : elles n'appartiennent pas au bateau. */
const SECTIONS_EXCLUES = ["Avertissement", "Avis de non-responsabilité"];

const CORPS_SECTION_MAJEURE = 11.8;
const CORPS_SOUS_SECTION = 10.9;
const CORPS_PIED = 9.6;

/**
 * Retire le pied de page de chaque page : bloc de fin, en petit corps,
 * qui porte les coordonnées du vendeur et le numéro de page. On travaille
 * par le bas plutôt que par un seuil d'ordonnée, car les libellés de la
 * grille se prolongent eux aussi en petit corps.
 */
export function sansPiedDePage(lignes: Ligne[]): Ligne[] {
  const parPage = new Map<number, Ligne[]>();
  for (const l of lignes) {
    const liste = parPage.get(l.page);
    if (liste) {
      liste.push(l);
    } else {
      parPage.set(l.page, [l]);
    }
  }
  const gardees: Ligne[] = [];
  for (const page of [...parPage.keys()].sort((a, b) => a - b)) {
    const lignesPage = parPage.get(page) as Ligne[];
    let fin = lignesPage.length;
    while (fin > 0 && (lignesPage[fin - 1] as Ligne).corps < CORPS_PIED) {
      fin -= 1;
    }
    gardees.push(...lignesPage.slice(0, fin));
  }
  return gardees;
}

interface Section {
  titre: string;
  lignes: Ligne[];
}

/** Découpe en sections majeures, en écartant les sections exclues. */
export function decouperSections(lignes: Ligne[]): Section[] {
  const sections: Section[] = [];
  let courante: Section | null = { titre: "En-tête", lignes: [] };
  let exclue = false;
  for (const l of lignes) {
    const estTitre =
      l.corps >= CORPS_SECTION_MAJEURE &&
      l.cellules.length === 1 &&
      (SECTIONS_MAJEURES.includes(l.texte) || SECTIONS_EXCLUES.includes(l.texte));
    if (estTitre) {
      if (courante && courante.lignes.length > 0) {
        sections.push(courante);
      }
      exclue = SECTIONS_EXCLUES.includes(l.texte);
      courante = exclue ? null : { titre: l.texte, lignes: [] };
      continue;
    }
    if (exclue || !courante) {
      continue;
    }
    courante.lignes.push(l);
  }
  if (courante && courante.lignes.length > 0) {
    sections.push(courante);
  }
  return sections;
}

/** Sous-sections d'une section, repérées au corps intermédiaire. */
function decouperSousSections(lignes: Ligne[]): Section[] {
  const sortie: Section[] = [];
  let courante: Section = { titre: "", lignes: [] };
  for (const l of lignes) {
    if (l.corps >= CORPS_SOUS_SECTION && l.cellules.length === 1) {
      if (courante.lignes.length > 0 || courante.titre !== "") {
        sortie.push(courante);
      }
      courante = { titre: l.texte, lignes: [] };
      continue;
    }
    courante.lignes.push(l);
  }
  if (courante.lignes.length > 0 || courante.titre !== "") {
    sortie.push(courante);
  }
  return sortie;
}

// ---------- grille à colonnes ----------

interface Rangee {
  cellules: string[];
  page: number;
  y: number;
}

function glyphesDeLigne(ligne: Ligne, glyphes: Glyphe[]): Glyphe[] {
  const tolerance = Math.max(ligne.corps, 1) * 0.5;
  return glyphes
    .filter((g) => g.page === ligne.page && Math.abs(g.y - ligne.y) <= tolerance)
    .sort((a, b) => a.x - b.x);
}

/**
 * Positions des colonnes d'une région. Les libellés de la fiche touchent
 * parfois la colonne de valeur sans espace visible : on ne peut pas se
 * fier aux seuls écarts. En revanche, une colonne qui revient d'une
 * rangée à l'autre est une vraie colonne, et sert alors de coupe franche.
 */
function colonnesDeRegion(rangees: Glyphe[][], seuil: number): number[] {
  const comptes = new Map<number, number>();
  for (const glyphes of rangees) {
    let precedent: Glyphe | null = null;
    for (const g of glyphes) {
      const debut =
        precedent === null ||
        g.x - precedent.x > Math.max(precedent.corps, g.corps, 1) * ECART_COLONNE;
      if (debut) {
        const cle = Math.round(g.x);
        comptes.set(cle, (comptes.get(cle) ?? 0) + 1);
      }
      precedent = g;
    }
  }
  const retenues = [...comptes.entries()]
    .filter(([, n]) => n >= seuil)
    .map(([x]) => x)
    .sort((a, b) => a - b);
  // Fusion des colonnes quasi confondues, dues aux arrondis de rendu.
  const fusionnees: number[] = [];
  for (const x of retenues) {
    const derniere = fusionnees[fusionnees.length - 1];
    if (derniere === undefined || x - derniere > 3) {
      fusionnees.push(x);
    }
  }
  return fusionnees;
}

function texteDeGlyphes(glyphes: Glyphe[]): string {
  let texte = "";
  let precedent: Glyphe | null = null;
  for (const g of glyphes) {
    if (
      precedent &&
      g.x - precedent.x > Math.max(precedent.corps, g.corps, 1) * ECART_ESPACE &&
      !texte.endsWith(" ") &&
      g.texte !== " "
    ) {
      texte += " ";
    }
    texte += g.texte;
    precedent = g;
  }
  return normaliserTexte(texte).replace(/\s+/g, " ").trim();
}

/**
 * Colonnes d'un ensemble de lignes, servant de coupes franches.
 *
 * La détection est faite région par région, et une région est toujours une
 * seule grille : une sous-section, ou la grille de tête. Étendue à
 * plusieurs grilles, elle mélangerait des colonnes d'origines différentes,
 * par exemple 252 pour les moteurs et 262 pour les dimensions, et une
 * coupe à 262 casserait alors le libellé qui commence à 252.
 *
 * À l'intérieur d'une même grille, une coupe ne peut pas casser un
 * libellé : les abscisses candidates sont les débuts de blocs séparés par
 * un vrai blanc, or un libellé est un texte continu dont le plus grand
 * écart interne est une espace. Une seule occurrence suffit donc, et elle
 * est nécessaire : la troisième colonne n'apparaît parfois qu'une fois.
 */
export function colonnesDeLignes(lignes: Ligne[], glyphes: Glyphe[]): number[] {
  return colonnesDeRegion(
    lignes.map((l) => glyphesDeLigne(l, glyphes)),
    1
  );
}

function construireGrille(lignes: Ligne[], glyphes: Glyphe[]): Rangee[] {
  const parRangee = lignes.map((l) => glyphesDeLigne(l, glyphes));
  const colonnes = colonnesDeRegion(parRangee, 1);
  if (colonnes.length === 0) {
    return lignes.map((l) => ({ cellules: [l.texte], page: l.page, y: l.y }));
  }
  return parRangee.map((glyphesRangee, index) => {
    const seaux: Glyphe[][] = colonnes.map(() => []);
    for (const g of glyphesRangee) {
      let colonne = 0;
      for (let i = 0; i < colonnes.length; i += 1) {
        if (g.x + 1.5 >= (colonnes[i] as number)) {
          colonne = i;
        }
      }
      (seaux[colonne] as Glyphe[]).push(g);
    }
    const ligne = lignes[index] as Ligne;
    return {
      cellules: seaux.map((s) => texteDeGlyphes(s)),
      page: ligne.page,
      y: ligne.y,
    };
  });
}

// ---------- paires libellé / valeur ----------

interface Paire {
  libelle: string;
  valeur: string;
}

/**
 * Reconstitue les paires d'une grille. Deux difficultés propres au
 * générateur : un libellé peut se poursuivre sur la rangée suivante
 * (« Matériau de la » puis « coque: »), et une valeur peut se poursuivre
 * de même (« Vedettes de » puis « croisière »).
 */
export function pairesDeGrille(rangees: Rangee[]): Paire[] {
  const nbColonnes = Math.max(0, ...rangees.map((r) => r.cellules.length));
  const aDeuxPoints = (colonne: number): boolean =>
    rangees.some((r) => (r.cellules[colonne] ?? "").includes(":"));

  const paires: Paire[] = [];
  const traitees = new Set<number>();
  for (let c = 0; c < nbColonnes; c += 1) {
    if (traitees.has(c) || !aDeuxPoints(c)) {
      continue;
    }
    const colonneValeur = c + 1 < nbColonnes ? c + 1 : -1;
    if (colonneValeur >= 0) {
      traitees.add(colonneValeur);
    }
    let libelleEnAttente = "";
    let valeurEnAttente = "";
    let derniere: Paire | null = null;
    for (const rangee of rangees) {
      const cellule = (rangee.cellules[c] ?? "").trim();
      const celluleValeur =
        colonneValeur >= 0 ? (rangee.cellules[colonneValeur] ?? "").trim() : "";
      if (cellule === "") {
        // Rangée sans libellé : la valeur qui s'y trouve prolonge la
        // précédente, comme « croisière » sous « Vedettes de ».
        if (celluleValeur !== "" && derniere) {
          derniere.valeur = `${derniere.valeur} ${celluleValeur}`.trim();
        } else if (celluleValeur !== "" && valeurEnAttente === "") {
          valeurEnAttente = celluleValeur;
        }
        continue;
      }
      const deuxPoints = cellule.indexOf(":");
      if (deuxPoints < 0) {
        libelleEnAttente = joindreLibelle(libelleEnAttente, cellule);
        if (celluleValeur !== "" && valeurEnAttente === "") {
          valeurEnAttente = celluleValeur;
        }
        continue;
      }
      const libelle = joindreLibelle(
        libelleEnAttente,
        cellule.slice(0, deuxPoints)
      ).trim();
      const inline = cellule.slice(deuxPoints + 1).trim();
      const valeur = inline !== "" ? inline : celluleValeur || valeurEnAttente;
      libelleEnAttente = "";
      valeurEnAttente = "";
      derniere = { libelle, valeur: valeur.trim() };
      paires.push(derniere);
    }
  }
  return paires;
}

/** Un libellé coupé sur un trait d'union se recolle sans espace. */
function joindreLibelle(debut: string, suite: string): string {
  if (debut === "") {
    return suite;
  }
  return debut.endsWith("-") ? `${debut}${suite}` : `${debut} ${suite}`;
}

// ---------- équipements ----------

function itemsDeSection(rangees: Rangee[]): string[] {
  const items: string[] = [];
  for (const rangee of rangees) {
    for (const cellule of rangee.cellules) {
      const texte = cellule.trim();
      if (texte === "") {
        continue;
      }
      if (texte.startsWith("-")) {
        items.push(texte.replace(/^-\s*/, "").trim());
      } else if (items.length > 0) {
        // Item trop long pour une seule rangée : on le recolle.
        items[items.length - 1] = `${items[items.length - 1]} ${texte}`.trim();
      } else {
        items.push(texte);
      }
    }
  }
  return items.filter((i) => i !== "");
}

function estSectionDItems(lignes: Ligne[]): boolean {
  const utiles = lignes.filter((l) => l.texte !== "");
  if (utiles.length === 0) {
    return false;
  }
  const avecTiret = utiles.filter((l) => l.texte.startsWith("-")).length;
  return avecTiret * 2 >= utiles.length;
}

// ---------- descriptions ----------

/**
 * Recolle les lignes d'un texte en paragraphes. Une ligne qui atteint la
 * marge droite se poursuit sur la suivante ; une ligne courte termine son
 * paragraphe. Les mots ne sont jamais modifiés.
 */
export function paragraphes(lignes: Ligne[], glyphes: Glyphe[]): string {
  if (lignes.length === 0) {
    return "";
  }
  const bornes = lignes.map((l) => {
    const g = glyphesDeLigne(l, glyphes);
    const dernier = g[g.length - 1];
    return dernier ? dernier.x + Math.max(dernier.corps, 1) * 0.5 : l.x;
  });
  const margeDroite = Math.max(...bornes);
  const sortie: string[] = [];
  let paragraphe = "";
  for (const [index, ligne] of lignes.entries()) {
    paragraphe = paragraphe === "" ? ligne.texte : `${paragraphe} ${ligne.texte}`;
    const atteintLaMarge = (bornes[index] as number) >= margeDroite - 12;
    const suivante = lignes[index + 1];
    const memeBloc = suivante !== undefined && Math.abs(suivante.x - ligne.x) < 2;
    if (!atteintLaMarge || !memeBloc) {
      sortie.push(paragraphe);
      paragraphe = "";
    }
  }
  if (paragraphe !== "") {
    sortie.push(paragraphe);
  }
  return sortie.join("\n");
}

// ---------- correspondance des libellés ----------

const LIBELLES: Record<string, keyof FichePdf> = {
  Marque: "marque",
  "Modèle": "modele",
  "Année": "annee",
  Longueur: "longueur",
  Prix: "prix",
  Condition: "condition",
  "Type de bateau": "type_bateau",
  "Type de carburant": "carburant",
  "Emplacement du bateau": "emplacement",
  "Matériau de la coque": "materiau_coque",
  "Type d'entraînement": "entrainement",
  "Maître beau": "largeur",
  "Cabines d'invités": "cabines",
  "Toilettes Invités": "toilettes",
  Nom: "nom",
};

/** Champs de moteur alimentés par un libellé, tous textuels. */
type ChampMoteurTexte = Exclude<keyof Moteur, "numero">;

const LIBELLES_MOTEUR: Record<string, ChampMoteurTexte> = {
  "Type de moteur": "type",
  "Type de carburant": "carburant",
  "Type d'entraînement": "entrainement",
  Moteur: "puissance",
  "Heures de fonctionnement du moteur": "heures",
};

// ---------- point d'entrée ----------

export function lireFichePdf(octets: Uint8Array): LectureFiche {
  const lecture = lirePdf(octets);
  if (!lecture.ok) {
    return { ok: false, erreur: lecture.erreur };
  }
  const doc = lecture.document;
  const aConfirmer: string[] = [];
  const avertissements = [...doc.avertissements];

  const lignes = sansPiedDePage(doc.lignes);
  if (lignes.length === 0) {
    return { ok: false, erreur: "aucun texte exploitable dans le PDF" };
  }
  const sections = decouperSections(lignes);
  const section = (titre: string): Ligne[] =>
    sections.find((s) => s.titre === titre)?.lignes ?? [];

  // En-tête : titre imprimé, prix et statut fiscal, emplacement.
  const entete = section("En-tête");
  const titre = entete[0]?.texte ?? "";
  const ligneStatut = entete.find((l) => l.texte.includes("Statut fiscal:"));
  let statutFiscal = "";
  if (ligneStatut) {
    statutFiscal = (ligneStatut.texte.split("Statut fiscal:")[1] ?? "").trim();
  }

  // Grille « Détails sur le bateau ».
  const grille = construireGrille(section("Détails sur le bateau"), doc.glyphes);
  const paires = pairesDeGrille(grille);
  const caracteristiques: Record<string, string> = {};
  for (const p of paires) {
    if (p.libelle !== "" && !(p.libelle in caracteristiques)) {
      caracteristiques[p.libelle] = p.valeur;
    }
  }

  // Sections « Informations et caractéristiques » : moteurs, dimensions,
  // équipements. Les colonnes se détectent par nature de sous-section :
  // une grille de valeurs et une liste à puces n'ont pas les mêmes.
  const sousSections = decouperSousSections(section("Informations et caractéristiques"));
  const moteurs: Moteur[] = [];
  const equipements: SectionEquipements[] = [];
  for (const sous of sousSections) {
    if (estSectionDItems(sous.lignes)) {
      const items = itemsDeSection(construireGrille(sous.lignes, doc.glyphes));
      if (items.length > 0) {
        equipements.push({ titre: sous.titre, items });
      }
      continue;
    }
    const moteur = /^(.*)\s*\(Moteur\s+(\d+)\)$/.exec(sous.titre);
    const grilleSous = construireGrille(sous.lignes, doc.glyphes);
    const pairesSous = pairesDeGrille(grilleSous);
    if (moteur) {
      const intitule = (moteur[1] as string).trim();
      const entete = /^(\d{4})\s+(\S+)\s*(.*)$/.exec(intitule);
      const bloc: Moteur = {
        numero: Number(moteur[2]),
        intitule,
        annee: entete ? (entete[1] as string) : A_CONFIRMER,
        marque: entete ? (entete[2] as string) : A_CONFIRMER,
        modele: entete && entete[3] !== "" ? (entete[3] as string) : A_CONFIRMER,
        type: A_CONFIRMER,
        carburant: A_CONFIRMER,
        entrainement: A_CONFIRMER,
        puissance: A_CONFIRMER,
        heures: A_CONFIRMER,
      };
      for (const p of pairesSous) {
        const champ = LIBELLES_MOTEUR[p.libelle];
        if (champ && p.valeur !== "") {
          bloc[champ] = p.valeur;
        } else if (!champ && p.libelle !== "") {
          avertissements.push(
            `libellé moteur non reconnu « ${p.libelle} » (valeur « ${p.valeur} »)`
          );
        }
      }
      moteurs.push(bloc);
      continue;
    }
    // Sous-section de caractéristiques : les valeurs sont préfixées par
    // le titre de la sous-section quand le libellé existe déjà ailleurs
    // avec un autre sens, comme « Carburant » sous « Réservoirs ».
    for (const p of pairesSous) {
      if (p.libelle === "") {
        continue;
      }
      const cle =
        p.libelle in caracteristiques && caracteristiques[p.libelle] !== p.valeur
          ? `${sous.titre} : ${p.libelle}`
          : p.libelle;
      if (!(cle in caracteristiques)) {
        caracteristiques[cle] = p.valeur;
      }
    }
  }

  const valeur = (libelle: string): string => caracteristiques[libelle] ?? "";
  /**
   * Valeur d'un libellé, ou a_confirmer avec sa raison au rapport. Tout
   * champ rendu a_confirmer passe par ici : un champ manquant qui ne
   * figurerait pas au rapport serait pire qu'un champ manquant.
   */
  const attendu = (libelle: string, nom: string): string => {
    const v = valeur(libelle);
    if (v === "") {
      aConfirmer.push(`${nom} absent de la fiche (libellé « ${libelle} »)`);
      return A_CONFIRMER;
    }
    return v;
  };

  const montant = montantDepuisFiche(valeur("Prix"));
  if (montant.raison) {
    aConfirmer.push(`prix : ${montant.raison}`);
  }
  const longueurBrute = valeur("Longueur");
  const longueur = longueurEnMetres(longueurBrute);
  if (longueur === null) {
    aConfirmer.push(
      longueurBrute === ""
        ? "longueur absente de la fiche"
        : `longueur illisible « ${longueurBrute} »`
    );
  }
  const largeurBrute = valeur("Maître beau");
  const largeur = longueurEnMetres(largeurBrute);
  if (largeur === null && largeurBrute !== "") {
    aConfirmer.push(`largeur illisible « ${largeurBrute} »`);
  } else if (largeurBrute === "") {
    aConfirmer.push("largeur absente de la fiche");
  }
  const condition = conditionDepuisFiche(valeur("Condition"));
  if (condition === A_CONFIRMER) {
    aConfirmer.push(
      valeur("Condition") === ""
        ? "état absent de la fiche"
        : `état non reconnu « ${valeur("Condition")} »`
    );
  }
  const annee = valeur("Année");
  if (!/^\d{4}$/.test(annee)) {
    aConfirmer.push(
      annee === "" ? "année absente de la fiche" : `année illisible « ${annee} »`
    );
  }
  if (statutFiscal === "") {
    aConfirmer.push("statut fiscal absent de la fiche");
  } else {
    // « Payé, France » : le pavillon est accolé au statut en tête de
    // fiche. On ne le retire que s'il est confirmé par la grille.
    const pavillon = valeur("Pavillon d'immatriculation");
    if (pavillon !== "" && statutFiscal.endsWith(`, ${pavillon}`)) {
      statutFiscal = statutFiscal.slice(0, -pavillon.length - 2).trim();
    }
  }
  if (moteurs.length === 0) {
    aConfirmer.push("aucun bloc moteur trouvé dans la fiche");
  }
  for (const m of moteurs) {
    if (m.heures === A_CONFIRMER) {
      aConfirmer.push(`heures absentes pour le moteur ${m.numero} « ${m.intitule} »`);
    }
    if (m.puissance === A_CONFIRMER) {
      aConfirmer.push(`puissance absente pour le moteur ${m.numero} « ${m.intitule} »`);
    }
  }
  if (equipements.length === 0) {
    aConfirmer.push("aucune section d'équipements trouvée");
  }

  const description = paragraphes(section("Description"), doc.glyphes);
  const descriptionConstructeur = paragraphes(
    section("Description fournie par le constructeur"),
    doc.glyphes
  );
  if (description === "") {
    aConfirmer.push("description vendeur absente de la fiche");
  }

  const fiche: FichePdf = {
    titre,
    marque: attendu("Marque", "marque"),
    modele: attendu("Modèle", "modèle"),
    annee: /^\d{4}$/.test(annee) ? annee : A_CONFIRMER,
    longueur,
    largeur,
    prix: montant.prix,
    devise: montant.devise,
    statut_fiscal: statutFiscal === "" ? A_CONFIRMER : statutFiscal,
    condition,
    type_bateau: attendu("Type de bateau", "type de bateau"),
    carburant: attendu("Type de carburant", "carburant"),
    emplacement: attendu("Emplacement du bateau", "emplacement"),
    materiau_coque: attendu("Matériau de la coque", "matériau de coque"),
    entrainement: attendu("Type d'entraînement", "type d'entraînement"),
    cabines: attendu("Cabines d'invités", "nombre de cabines"),
    toilettes: attendu("Toilettes Invités", "nombre de toilettes"),
    nom: valeur("Nom"),
    moteurs,
    caracteristiques,
    equipements,
    description,
    description_constructeur: descriptionConstructeur,
    a_confirmer: aConfirmer,
    avertissements,
    pages: doc.pages,
  };

  return { ok: true, fiche, document: doc };
}

/** Libellés reconnus, exposés pour les tests et la documentation. */
export const LIBELLES_RECONNUS = Object.keys(LIBELLES);
