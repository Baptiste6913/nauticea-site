// Typographie française : espace fine insécable (U+202F) avant les
// ponctuations hautes et comme séparateur de milliers, insécable (U+00A0)
// avant le symbole monétaire.
const FINE = " ";

export function typoFr(texte: string): string {
  return texte.replace(/ ([:;!?»])/g, `${FINE}$1`).replace(/« /g, `«${FINE}`);
}

export function formatPrix(prix: number | null, devise = "EUR"): string {
  if (prix === null) {
    return "Prix sur demande";
  }
  const montant = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: devise,
    maximumFractionDigits: 0,
  }).format(prix);
  // Intl utilise déjà U+202F pour les milliers ; on normalise l'espace
  // avant le symbole en insécable.
  return montant.replace(/ €$/, " €");
}

export function formatLongueur(metres: string): string {
  return `${metres.replace(".", ",")}${FINE}m`;
}

const MOIS_FR = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

// Date AAAA-MM-JJ en toutes lettres françaises ; entrée inattendue
// rendue telle quelle.
export function formatDateFr(iso: string): string {
  const [annee, mois, jour] = iso.split("-").map(Number);
  if (!annee || !mois || mois > 12 || !jour) {
    return iso;
  }
  return `${jour === 1 ? "1er" : jour} ${MOIS_FR[mois - 1]} ${annee}`;
}

// Valeur de caractéristique : virgule décimale française pour les
// nombres, texte inchangé sinon.
export function formatValeurSpec(valeur: string): string {
  return /^\d+\.\d+$/.test(valeur.trim())
    ? valeur.trim().replace(".", ",")
    : valeur;
}
