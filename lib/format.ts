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

// Valeur de caractéristique : virgule décimale française pour les
// nombres, texte inchangé sinon.
export function formatValeurSpec(valeur: string): string {
  return /^\d+\.\d+$/.test(valeur.trim())
    ? valeur.trim().replace(".", ",")
    : valeur;
}
