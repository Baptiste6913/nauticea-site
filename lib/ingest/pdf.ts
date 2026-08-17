// Lecteur PDF minimal, sans dépendance, pour les fiches BoatWizard.
//
// Périmètre volontairement étroit : ces fiches sont produites par un seul
// générateur, l'impression PDF de Chrome (« Skia/PDF »), avec table de
// références croisées classique, flux compressés en Flate, polices Type3
// accompagnées d'une table ToUnicode, et photos en JPEG (DCTDecode). Le
// lecteur couvre exactement cela et rejette proprement le reste, plutôt
// que d'ajouter une dépendance de rendu PDF complète au dépôt.
//
// Règle de robustesse : aucune exception ne sort d'ici sur un PDF
// malformé ou hostile. Les échecs sont des valeurs de retour.
import zlib from "node:zlib";

/** Borne de taille du fichier PDF accepté. */
export const TAILLE_MAX_PDF = 30 * 1024 * 1024;

/** Borne de pages du PDF accepté. */
export const PAGES_MAX_PDF = 40;

/** Borne de sûreté sur la décompression d'un flux, contre les bombes zip. */
export const TAILLE_MAX_FLUX = 64 * 1024 * 1024;

export interface Glyphe {
  texte: string;
  /**
   * Coordonnées en espace utilisateur PDF : l'origine est en bas à gauche,
   * l'ordonnée croît donc vers le haut.
   */
  x: number;
  y: number;
  /** Corps apparent, sert à distinguer titres et corps de texte. */
  corps: number;
  police: string;
  page: number;
}

export interface Cellule {
  texte: string;
  /** Abscisse du premier glyphe, sert à retrouver les colonnes. */
  x: number;
}

export interface Ligne {
  /** Cellules jointes par deux espaces, pratique pour les recherches. */
  texte: string;
  /**
   * Cellules de la ligne. Les fiches BoatWizard présentent les
   * caractéristiques sur trois colonnes : sans découpe, « Condition:
   * Occasion » et « Toilettes Invités: 2 » se retrouveraient dans la même
   * chaîne et deviendraient impossibles à interpréter.
   */
  cellules: Cellule[];
  x: number;
  y: number;
  corps: number;
  page: number;
}

export interface ImagePdf {
  /** Octets tels quels, JPEG (DCTDecode) uniquement. */
  octets: Uint8Array;
  /** Dimensions réelles du JPEG, en pixels. */
  largeur: number;
  hauteur: number;
  /**
   * Dimensions à l'impression, en points. Un logo est posé petit même
   * quand son fichier est grand : c'est ce rapport qui le distingue d'une
   * photo, plus sûrement qu'un seuil sur la seule résolution.
   */
  largeurDessin: number;
  hauteurDessin: number;
  page: number;
  /** Ordre de dessin dans le document, donc ordre de lecture. */
  rang: number;
  /** Index de l'objet PDF, sert à dédupliquer un même visuel répété. */
  objet: number;
}

export interface DocumentPdf {
  pages: number;
  lignes: Ligne[];
  /**
   * Glyphes bruts positionnés. La grille de caractéristiques des fiches est
   * une vraie grille à colonnes fixes, dont les libellés touchent parfois la
   * colonne de valeur : la découper proprement demande de revenir aux
   * positions exactes, ce que l'assemblage en lignes ne permet plus.
   */
  glyphes: Glyphe[];
  images: ImagePdf[];
  /** Anomalies non bloquantes rencontrées à la lecture. */
  avertissements: string[];
}

export type LecturePdf =
  | { ok: true; document: DocumentPdf }
  | { ok: false; erreur: string };

// ---------- utilitaires bas niveau ----------

const enc = new TextDecoder("latin1");

function texteLatin(octets: Uint8Array): string {
  return enc.decode(octets);
}

/**
 * Recense les objets indirects par balayage du fichier. On n'utilise pas la
 * table xref : elle est souvent réécrite de façon incrémentale, alors qu'un
 * balayage direct est insensible à cela. En cas de doublon, la dernière
 * définition gagne, ce qui reproduit le comportement d'une mise à jour
 * incrémentale.
 */
function recenserObjets(brut: string): Map<number, { debut: number; fin: number }> {
  const objets = new Map<number, { debut: number; fin: number }>();
  const motif = /(?:^|[\r\n>\s])(\d+)\s+(\d+)\s+obj\b/g;
  let m: RegExpExecArray | null;
  while ((m = motif.exec(brut)) !== null) {
    const numero = Number(m[1]);
    const debut = m.index + m[0].length;
    const fin = brut.indexOf("endobj", debut);
    objets.set(numero, { debut, fin: fin < 0 ? brut.length : fin });
    motif.lastIndex = debut;
  }
  return objets;
}

function referenceIndirecte(dictionnaire: string, cle: string): number | null {
  const m = new RegExp(`/${cle}\\s+(\\d+)\\s+\\d+\\s+R`).exec(dictionnaire);
  return m ? Number(m[1]) : null;
}

function nombre(dictionnaire: string, cle: string): number | null {
  const m = new RegExp(`/${cle}\\s+(-?[\\d.]+)`).exec(dictionnaire);
  if (!m) {
    return null;
  }
  const v = Number(m[1]);
  return Number.isFinite(v) ? v : null;
}

// ---------- accès aux objets et aux flux ----------

class Fichier {
  readonly octets: Uint8Array;
  readonly brut: string;
  readonly objets: Map<number, { debut: number; fin: number }>;
  readonly avertissements: string[] = [];

  constructor(octets: Uint8Array) {
    this.octets = octets;
    this.brut = texteLatin(octets);
    this.objets = recenserObjets(this.brut);
  }

  corps(numero: number): string | null {
    const bornes = this.objets.get(numero);
    return bornes ? this.brut.slice(bornes.debut, bornes.fin) : null;
  }

  /** Dictionnaire d'un objet, c'est-à-dire sa partie avant « stream ». */
  dictionnaire(numero: number): string | null {
    const corps = this.corps(numero);
    if (corps === null) {
      return null;
    }
    const i = corps.indexOf("stream");
    return i < 0 ? corps : corps.slice(0, i);
  }

  /** Octets bruts d'un flux, sans décodage de filtre. */
  fluxBrut(numero: number): Uint8Array | null {
    const bornes = this.objets.get(numero);
    if (!bornes) {
      return null;
    }
    const corps = this.brut.slice(bornes.debut, bornes.fin);
    const i = corps.indexOf("stream");
    if (i < 0) {
      return null;
    }
    let j = i + "stream".length;
    if (corps.startsWith("\r\n", j)) {
      j += 2;
    } else if (corps[j] === "\n" || corps[j] === "\r") {
      j += 1;
    }
    const dict = corps.slice(0, i);
    let longueur = nombre(dict, "Length");
    if (longueur === null) {
      const indirect = referenceIndirecte(dict, "Length");
      if (indirect !== null) {
        const d = this.dictionnaire(indirect);
        const m = d ? /(-?\d+)/.exec(d) : null;
        longueur = m ? Number(m[1]) : null;
      }
    }
    const depart = bornes.debut + j;
    if (longueur === null || longueur < 0) {
      const fin = corps.indexOf("endstream", j);
      longueur = (fin < 0 ? corps.length : fin) - j;
    }
    return this.octets.subarray(depart, depart + longueur);
  }

  /** Flux décodé. Seul FlateDecode est déballé, le reste est rendu tel quel. */
  flux(numero: number): Uint8Array | null {
    const brut = this.fluxBrut(numero);
    if (!brut) {
      return null;
    }
    const dict = this.dictionnaire(numero) ?? "";
    if (!dict.includes("/FlateDecode")) {
      return brut;
    }
    try {
      return new Uint8Array(
        zlib.inflateSync(brut, { maxOutputLength: TAILLE_MAX_FLUX })
      );
    } catch {
      // Certains générateurs laissent des octets parasites en fin de flux.
      try {
        return new Uint8Array(
          zlib.inflateSync(brut, {
            finishFlush: zlib.constants.Z_SYNC_FLUSH,
            maxOutputLength: TAILLE_MAX_FLUX,
          })
        );
      } catch {
        this.avertissements.push(`flux ${numero} illisible`);
        return null;
      }
    }
  }
}

// ---------- pages ----------

function listerPages(f: Fichier): number[] {
  const racine = /\/Root\s+(\d+)\s+\d+\s+R/.exec(f.brut);
  const pages: number[] = [];
  const vus = new Set<number>();

  const descendre = (numero: number, profondeur: number): void => {
    if (profondeur > 32 || vus.has(numero) || pages.length > PAGES_MAX_PDF * 4) {
      return;
    }
    vus.add(numero);
    const dict = f.dictionnaire(numero);
    if (!dict) {
      return;
    }
    if (/\/Type\s*\/Page\b/.test(dict)) {
      pages.push(numero);
      return;
    }
    const kids = /\/Kids\s*\[([^\]]*)\]/.exec(dict);
    if (!kids) {
      return;
    }
    for (const m of kids[1].matchAll(/(\d+)\s+\d+\s+R/g)) {
      descendre(Number(m[1]), profondeur + 1);
    }
  };

  if (racine) {
    const dictRacine = f.dictionnaire(Number(racine[1])) ?? "";
    const arbre = referenceIndirecte(dictRacine, "Pages");
    if (arbre !== null) {
      descendre(arbre, 0);
    }
  }
  if (pages.length === 0) {
    // Repli : ordre des objets. Les fiches BoatWizard sont écrites dans
    // l'ordre des pages, donc ce repli reste fidèle.
    for (const numero of [...f.objets.keys()].sort((a, b) => a - b)) {
      const dict = f.dictionnaire(numero);
      if (dict && /\/Type\s*\/Page\b/.test(dict)) {
        pages.push(numero);
      }
    }
  }
  return pages;
}

// ---------- polices Type3 et ToUnicode ----------

function lireToUnicode(contenu: string): Map<number, string> {
  const table = new Map<number, string>();
  const hexVersTexte = (hex: string): string => {
    let sortie = "";
    for (let i = 0; i + 3 < hex.length + 1; i += 4) {
      const point = Number.parseInt(hex.slice(i, i + 4), 16);
      if (Number.isFinite(point) && point > 0) {
        sortie += String.fromCharCode(point);
      }
    }
    return sortie;
  };

  for (const bloc of contenu.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const m of bloc[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
      table.set(Number.parseInt(m[1], 16), hexVersTexte(m[2]));
    }
  }
  for (const bloc of contenu.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    for (const m of bloc[1].matchAll(
      /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g
    )) {
      const bas = Number.parseInt(m[1], 16);
      const haut = Number.parseInt(m[2], 16);
      const cible = Number.parseInt(m[3], 16);
      if (haut - bas > 65535) {
        continue;
      }
      for (let code = bas; code <= haut; code += 1) {
        table.set(code, String.fromCharCode(cible + code - bas));
      }
    }
  }
  return table;
}

// ---------- extraction du texte ----------

type Matrice = [number, number, number, number, number, number];

function multiplier(a: Matrice, b: Matrice): Matrice {
  return [
    a[0] * b[0] + a[1] * b[2],
    a[0] * b[1] + a[1] * b[3],
    a[2] * b[0] + a[3] * b[2],
    a[2] * b[1] + a[3] * b[3],
    a[4] * b[0] + a[5] * b[2] + b[4],
    a[4] * b[1] + a[5] * b[3] + b[5],
  ];
}

const IDENTITE: Matrice = [1, 0, 0, 1, 0, 0];

/** Découpe un flux de contenu en jetons PostScript. */
function jetons(contenu: string): string[] {
  const sortie: string[] = [];
  let i = 0;
  while (i < contenu.length) {
    const c = contenu[i];
    if (c === undefined) {
      break;
    }
    if (c === "%") {
      while (i < contenu.length && contenu[i] !== "\n") {
        i += 1;
      }
      continue;
    }
    if (/\s/.test(c)) {
      i += 1;
      continue;
    }
    if (c === "<" && contenu[i + 1] === "<") {
      sortie.push("<<");
      i += 2;
      continue;
    }
    if (c === ">" && contenu[i + 1] === ">") {
      sortie.push(">>");
      i += 2;
      continue;
    }
    if (c === "<") {
      const fin = contenu.indexOf(">", i);
      sortie.push(contenu.slice(i, fin < 0 ? contenu.length : fin + 1));
      i = fin < 0 ? contenu.length : fin + 1;
      continue;
    }
    if (c === "(") {
      // Chaîne littérale : parenthèses imbriquées et échappements.
      let profondeur = 1;
      let j = i + 1;
      let brut = "";
      while (j < contenu.length && profondeur > 0) {
        const d = contenu[j];
        if (d === "\\") {
          brut += contenu.slice(j, j + 2);
          j += 2;
          continue;
        }
        if (d === "(") {
          profondeur += 1;
        } else if (d === ")") {
          profondeur -= 1;
          if (profondeur === 0) {
            break;
          }
        }
        brut += d;
        j += 1;
      }
      sortie.push(`(${brut})`);
      i = j + 1;
      continue;
    }
    if (c === "[" || c === "]" || c === "{" || c === "}") {
      sortie.push(c);
      i += 1;
      continue;
    }
    let j = i;
    while (j < contenu.length && !/[\s()<>[\]{}/%]/.test(contenu[j] as string)) {
      j += 1;
    }
    if (c === "/") {
      j = i + 1;
      while (j < contenu.length && !/[\s()<>[\]{}/%]/.test(contenu[j] as string)) {
        j += 1;
      }
    }
    sortie.push(contenu.slice(i, Math.max(j, i + 1)));
    i = Math.max(j, i + 1);
  }
  return sortie;
}

function codesDeChaine(jeton: string): number[] {
  if (jeton.startsWith("<")) {
    const hex = jeton.slice(1, -1).replace(/[^0-9A-Fa-f]/g, "");
    const codes: number[] = [];
    for (let i = 0; i < hex.length; i += 2) {
      codes.push(Number.parseInt(hex.slice(i, i + 2).padEnd(2, "0"), 16));
    }
    return codes;
  }
  if (jeton.startsWith("(")) {
    const contenu = jeton.slice(1, -1);
    const codes: number[] = [];
    for (let i = 0; i < contenu.length; i += 1) {
      if (contenu[i] === "\\") {
        const suivant = contenu[i + 1] ?? "";
        const echappes: Record<string, number> = {
          n: 10,
          r: 13,
          t: 9,
          b: 8,
          f: 12,
        };
        if (suivant in echappes) {
          codes.push(echappes[suivant] as number);
          i += 1;
        } else if (/[0-7]/.test(suivant)) {
          const oct = /^[0-7]{1,3}/.exec(contenu.slice(i + 1))?.[0] ?? "0";
          codes.push(Number.parseInt(oct, 8) & 0xff);
          i += oct.length;
        } else {
          codes.push(suivant.charCodeAt(0));
          i += 1;
        }
        continue;
      }
      codes.push(contenu.charCodeAt(i) & 0xff);
    }
    return codes;
  }
  return [];
}

interface EtatPage {
  polices: Map<string, Map<number, string>>;
  glyphes: Glyphe[];
  page: number;
  /** Nom de XObject vers numéro d'objet, pour l'opérateur Do. */
  xobjets: Map<string, number>;
  /** Dessins d'images rencontrés, dans l'ordre. */
  dessins: Array<{ objet: number; largeur: number; hauteur: number }>;
}

function extraireGlyphes(contenu: string, etat: EtatPage, ctmPage: Matrice): void {
  const js = jetons(contenu);
  const pile: Matrice[] = [];
  let ctm: Matrice = ctmPage;
  let tm: Matrice = IDENTITE;
  let tlm: Matrice = IDENTITE;
  let police = "";
  let corps = 0;
  let interligne = 0;
  const operandes: string[] = [];

  const nb = (index: number): number => {
    const v = Number(operandes[operandes.length - index]);
    return Number.isFinite(v) ? v : 0;
  };

  const poser = (codes: number[]): void => {
    const table = etat.polices.get(police);
    for (const code of codes) {
      const texte = table?.get(code);
      const m = multiplier(tm, ctm);
      if (texte !== undefined && texte !== "") {
        etat.glyphes.push({
          texte,
          x: m[4],
          y: m[5],
          corps: Math.abs(corps * Math.hypot(m[0], m[1])) || corps,
          police,
          page: etat.page,
        });
      }
    }
  };

  for (const jeton of js) {
    switch (jeton) {
      case "q":
        pile.push(ctm);
        break;
      case "Q":
        ctm = pile.pop() ?? ctm;
        break;
      case "cm":
        ctm = multiplier(
          [nb(6), nb(5), nb(4), nb(3), nb(2), nb(1)] as Matrice,
          ctm
        );
        break;
      case "BT":
        tm = IDENTITE;
        tlm = IDENTITE;
        break;
      case "Tf":
        police = (operandes[operandes.length - 2] ?? "").replace(/^\//, "");
        corps = nb(1);
        break;
      case "TL":
        interligne = nb(1);
        break;
      case "Td":
        tlm = multiplier([1, 0, 0, 1, nb(2), nb(1)], tlm);
        tm = tlm;
        break;
      case "TD":
        interligne = -nb(1);
        tlm = multiplier([1, 0, 0, 1, nb(2), nb(1)], tlm);
        tm = tlm;
        break;
      case "Tm":
        tlm = [nb(6), nb(5), nb(4), nb(3), nb(2), nb(1)] as Matrice;
        tm = tlm;
        break;
      case "T*":
        tlm = multiplier([1, 0, 0, 1, 0, -interligne], tlm);
        tm = tlm;
        break;
      case "Tj":
      case "'":
      case '"': {
        if (jeton !== "Tj") {
          tlm = multiplier([1, 0, 0, 1, 0, -interligne], tlm);
          tm = tlm;
        }
        poser(codesDeChaine(operandes[operandes.length - 1] ?? ""));
        break;
      }
      case "Do": {
        const nom = (operandes[operandes.length - 1] ?? "").replace(/^\//, "");
        const objet = etat.xobjets.get(nom);
        if (objet !== undefined) {
          // Une image de l'espace image, carré unité, est mise à l'échelle
          // par la matrice courante : ses colonnes donnent donc la taille
          // réellement posée sur la page.
          etat.dessins.push({
            objet,
            largeur: Math.abs(Math.hypot(ctm[0], ctm[1])),
            hauteur: Math.abs(Math.hypot(ctm[2], ctm[3])),
          });
        }
        break;
      }
      case "TJ": {
        // Le tableau a été aplati par le tokeniseur : on reprend tous les
        // jetons de chaîne depuis le crochet ouvrant.
        let debut = operandes.length - 1;
        while (debut >= 0 && operandes[debut] !== "[") {
          debut -= 1;
        }
        for (const op of operandes.slice(debut + 1)) {
          if (op.startsWith("(") || op.startsWith("<")) {
            poser(codesDeChaine(op));
          }
        }
        break;
      }
      default:
        break;
    }
    if (/^(q|Q|cm|BT|ET|Tf|TL|Td|TD|Tm|T\*|Tj|TJ|Do|'|")$/.test(jeton)) {
      operandes.length = 0;
    } else {
      operandes.push(jeton);
      if (operandes.length > 4096) {
        operandes.splice(0, 2048);
      }
    }
  }
}

/**
 * Ligatures typographiques posées par le générateur. Sans cette
 * normalisation, « vérifiées » arrive en « vériﬁées » et aucune recherche
 * de libellé ne fonctionne.
 */
const LIGATURES: Array<[RegExp, string]> = [
  [/ﬀ/g, "ff"],
  [/ﬁ/g, "fi"],
  [/ﬂ/g, "fl"],
  [/ﬃ/g, "ffi"],
  [/ﬄ/g, "ffl"],
  [/ﬅ/g, "st"],
  [/ﬆ/g, "st"],
];

export function normaliserTexte(texte: string): string {
  let sortie = texte;
  for (const [motif, remplacement] of LIGATURES) {
    sortie = sortie.replace(motif, remplacement);
  }
  // Le site n'emploie nulle part le tiret cadratin, et son harnais le
  // refuse jusque dans le rendu. Une fiche qui en contient un le voit
  // ramené au demi-cadratin, qui tient le même rôle d'incise : les mots
  // sont intacts, seule la longueur du tiret change. Sans cela, une
  // description parfaitement légitime bloquerait toute l'ingestion.
  sortie = sortie.replace(/\u2014/g, "\u2013");
  // Espaces exotiques ramenées à l'espace ordinaire, apostrophe typographique
  // conservée telle quelle car elle appartient au texte du client.
  return sortie.replace(/[\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]/g, " ");
}

/**
 * Écart, exprimé en fraction du corps, au-delà duquel deux glyphes ne se
 * touchent plus et méritent une espace intercalée.
 *
 * Le générateur pose une espace comme un glyphe à part entière : cette
 * insertion ne sert donc qu'aux blancs entre deux blocs de texte
 * distincts, jamais à l'intérieur d'un mot. Le seuil est haut à dessein,
 * car l'avance du « m » atteint 1,06 corps : à 1,05, « micro » devenait
 * « m icro », et à 0,7, « Monte Carlo » devenait « M onte C arlo ».
 */
export const ECART_ESPACE = 1.5;

/** Écart au-delà duquel on change de cellule, donc de colonne. */
export const ECART_COLONNE = 2.2;

/**
 * Regroupe les glyphes en lignes puis en cellules. Deux glyphes
 * appartiennent à la même ligne si leur ordonnée diffère de moins de la
 * moitié du corps. L'ordonnée est celle de l'espace utilisateur PDF, qui
 * croît vers le haut : l'ordre de lecture est donc obtenu en la triant de
 * façon décroissante.
 */
function assembler(glyphes: Glyphe[], page: number): Ligne[] {
  if (glyphes.length === 0) {
    return [];
  }
  const tries = [...glyphes].sort((a, b) => b.y - a.y || a.x - b.x);
  const lignes: Ligne[] = [];
  let courant: Glyphe[] = [];

  const vider = (): void => {
    if (courant.length === 0) {
      return;
    }
    const ordonnes = [...courant].sort((a, b) => a.x - b.x);
    const cellules: Cellule[] = [];
    let segment = "";
    let departSegment = (ordonnes[0] as Glyphe).x;
    let precedent: Glyphe | null = null;
    for (const g of ordonnes) {
      if (precedent) {
        const ecart = g.x - precedent.x;
        const reference = Math.max(precedent.corps, g.corps, 1);
        if (ecart > reference * ECART_COLONNE) {
          if (segment.trim() !== "") {
            cellules.push({ texte: segment.trim(), x: departSegment });
          }
          segment = "";
          departSegment = g.x;
        } else if (
          ecart > reference * ECART_ESPACE &&
          !segment.endsWith(" ") &&
          g.texte !== " "
        ) {
          segment += " ";
        }
      }
      segment += g.texte;
      precedent = g;
    }
    if (segment.trim() !== "") {
      cellules.push({ texte: segment.trim(), x: departSegment });
    }
    const propres = cellules
      .map((c) => ({
        texte: normaliserTexte(c.texte).replace(/\s+/g, " ").trim(),
        x: c.x,
      }))
      .filter((c) => c.texte !== "");
    if (propres.length > 0) {
      const premier = ordonnes[0] as Glyphe;
      lignes.push({
        texte: propres.map((c) => c.texte).join("  "),
        cellules: propres,
        x: premier.x,
        y: premier.y,
        corps: Math.max(...ordonnes.map((g) => g.corps)),
        page,
      });
    }
    courant = [];
  };

  for (const g of tries) {
    const reference = courant[0];
    if (reference && Math.abs(g.y - reference.y) > Math.max(reference.corps, 1) * 0.5) {
      vider();
    }
    courant.push(g);
  }
  vider();
  return lignes;
}

// ---------- images ----------

/**
 * Retient les images réellement dessinées, dans l'ordre de dessin. On ne
 * parcourt pas le dictionnaire de ressources : il contient parfois des
 * visuels non posés, et il ne dit rien de l'ordre ni de la taille.
 */
function retenirImages(
  f: Fichier,
  dessins: Array<{ objet: number; largeur: number; hauteur: number }>,
  indexPage: number,
  images: ImagePdf[],
  vus: Set<number>
): void {
  for (const dessin of dessins) {
    const numero = dessin.objet;
    const d = f.dictionnaire(numero);
    if (!d || !/\/Subtype\s*\/Image\b/.test(d)) {
      continue;
    }
    if (vus.has(numero)) {
      // Même visuel posé deux fois : une seule photo, pas un doublon.
      continue;
    }
    vus.add(numero);
    const largeur = nombre(d, "Width") ?? 0;
    const hauteur = nombre(d, "Height") ?? 0;
    if (!d.includes("/DCTDecode")) {
      // Les fiches BoatWizard portent leurs photos en JPEG. Un autre
      // encodage est signalé, jamais transcodé à l'aveugle.
      f.avertissements.push(
        `image ${numero} ignorée, encodage non JPEG (${largeur}x${hauteur})`
      );
      continue;
    }
    const octets = f.fluxBrut(numero);
    if (!octets || octets.byteLength === 0) {
      f.avertissements.push(`image ${numero} ignorée, flux vide`);
      continue;
    }
    images.push({
      octets,
      largeur,
      hauteur,
      largeurDessin: dessin.largeur,
      hauteurDessin: dessin.hauteur,
      page: indexPage,
      rang: images.length + 1,
      objet: numero,
    });
  }
}

// ---------- point d'entrée ----------

export function lirePdf(octets: Uint8Array): LecturePdf {
  try {
    if (octets.byteLength === 0) {
      return { ok: false, erreur: "fichier vide" };
    }
    if (octets.byteLength > TAILLE_MAX_PDF) {
      return {
        ok: false,
        erreur: `PDF de ${octets.byteLength} octets au-dessus de la borne ${TAILLE_MAX_PDF}`,
      };
    }
    if (texteLatin(octets.subarray(0, 5)) !== "%PDF-") {
      return { ok: false, erreur: "en-tête %PDF- absent, ce n'est pas un PDF" };
    }

    const f = new Fichier(octets);
    const pages = listerPages(f);
    if (pages.length === 0) {
      return { ok: false, erreur: "aucune page trouvée" };
    }
    if (pages.length > PAGES_MAX_PDF) {
      return {
        ok: false,
        erreur: `${pages.length} pages, au-dessus de la borne ${PAGES_MAX_PDF}`,
      };
    }

    const lignes: Ligne[] = [];
    const glyphes: Glyphe[] = [];
    const images: ImagePdf[] = [];
    const imagesVues = new Set<number>();

    for (const [index, numeroPage] of pages.entries()) {
      const dictPage = f.dictionnaire(numeroPage) ?? "";
      const polices = new Map<string, Map<number, string>>();
      const blocPolices = /\/Font\s*<<([\s\S]*?)>>/.exec(dictPage);
      if (blocPolices) {
        for (const m of blocPolices[1].matchAll(/\/(\w+)\s+(\d+)\s+\d+\s+R/g)) {
          const dictPolice = f.dictionnaire(Number(m[2])) ?? "";
          const ref = referenceIndirecte(dictPolice, "ToUnicode");
          if (ref === null) {
            f.avertissements.push(`police ${m[1]} sans table ToUnicode`);
            continue;
          }
          const flux = f.flux(ref);
          if (flux) {
            polices.set(m[1] as string, lireToUnicode(texteLatin(flux)));
          }
        }
      }

      const xobjets = new Map<string, number>();
      const blocXObjets = /\/XObject\s*<<([\s\S]*?)>>/.exec(dictPage);
      if (blocXObjets) {
        for (const m of blocXObjets[1].matchAll(/\/(\w+)\s+(\d+)\s+\d+\s+R/g)) {
          xobjets.set(m[1] as string, Number(m[2]));
        }
      }

      const etat: EtatPage = {
        polices,
        glyphes: [],
        page: index + 1,
        xobjets,
        dessins: [],
      };
      const contenus = referenceIndirecte(dictPage, "Contents");
      const contenusTableau = /\/Contents\s*\[([^\]]*)\]/.exec(dictPage);
      const numerosContenu: number[] = [];
      if (contenusTableau) {
        for (const m of contenusTableau[1].matchAll(/(\d+)\s+\d+\s+R/g)) {
          numerosContenu.push(Number(m[1]));
        }
      } else if (contenus !== null) {
        numerosContenu.push(contenus);
      }
      for (const numero of numerosContenu) {
        const flux = f.flux(numero);
        if (flux) {
          extraireGlyphes(texteLatin(flux), etat, IDENTITE);
        }
      }
      lignes.push(...assembler(etat.glyphes, index + 1));
      glyphes.push(...etat.glyphes);
      retenirImages(f, etat.dessins, index + 1, images, imagesVues);
    }

    return {
      ok: true,
      document: {
        pages: pages.length,
        lignes,
        glyphes,
        images,
        avertissements: f.avertissements,
      },
    };
  } catch (e) {
    const message = e instanceof Error ? `${e.name} : ${e.message}` : String(e);
    return { ok: false, erreur: `lecture impossible, ${message.slice(0, 120)}` };
  }
}

/** Texte du document, une ligne par ligne visuelle, dans l'ordre de lecture. */
export function texteDuDocument(doc: DocumentPdf): string[] {
  return doc.lignes.map((l) => l.texte);
}
