// Typographie française : espace fine insécable (U+202F) avant les
// ponctuations hautes et comme séparateur de milliers, insécable (U+00A0)
// avant le symbole monétaire.
const FINE = " ";

export function typoFr(texte: string): string {
  return texte.replace(/ ([:;!?»])/g, `${FINE}$1`).replace(/« /g, `«${FINE}`);
}

// Devises acceptées à l'affichage (durcissement du flux, 17/08) : source de
// vérité unique, partagée avec le parseur du flux Boats Group. Une valeur
// hors liste ne doit jamais faire lever d'exception au rendu, car
// Intl.NumberFormat refuse un code devise inconnu.
export const DEVISES_AUTORISEES = ["EUR", "GBP", "USD", "CHF"] as const;

export function deviseAutorisee(devise: unknown): boolean {
  return (
    typeof devise === "string" &&
    (DEVISES_AUTORISEES as readonly string[]).includes(devise)
  );
}

export function formatPrix(prix: number | null, devise = "EUR"): string {
  // Prix absent, non fini ou nul, ou devise non reconnue : on n'affiche
  // aucun montant plutôt qu'une valeur douteuse ou une page en erreur.
  if (prix === null || !Number.isFinite(prix) || prix <= 0) {
    return "Prix sur demande";
  }
  if (!deviseAutorisee(devise)) {
    return "Prix sur demande";
  }
  try {
    const montant = new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: devise,
      maximumFractionDigits: 0,
    }).format(prix);
    // Intl utilise déjà U+202F pour les milliers ; on normalise l'espace
    // avant le symbole en insécable.
    return montant.replace(/ €$/, " €");
  } catch {
    // Filet de sécurité : aucune donnée ne peut casser un rendu.
    return "Prix sur demande";
  }
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
