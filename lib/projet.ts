// Vocabulaire partagé du formulaire de conversion « Votre projet »
// (directive finale W3) : mêmes options côté client et côté serveur.

export const NATURES = [
  { valeur: "achat-neuf", label: "Achat neuf" },
  { valeur: "achat-occasion", label: "Achat occasion" },
  { valeur: "vente-reprise", label: "Vente ou reprise" },
] as const;

export const BUDGETS = [
  { valeur: "moins-100", label: "Moins de 100 000 €" },
  { valeur: "100-250", label: "100 000 à 250 000 €" },
  { valeur: "250-500", label: "250 000 à 500 000 €" },
  { valeur: "plus-500", label: "Plus de 500 000 €" },
  { valeur: "a-definir", label: "À définir" },
] as const;

export const HORIZONS = [
  { valeur: "des-que-possible", label: "Dès que possible" },
  { valeur: "3-6-mois", label: "Dans 3 à 6 mois" },
  { valeur: "6-12-mois", label: "Dans 6 à 12 mois" },
  { valeur: "plus-tard", label: "Plus tard, je me renseigne" },
] as const;

export function labelDe(
  options: ReadonlyArray<{ valeur: string; label: string }>,
  valeur: string
): string {
  return options.find((o) => o.valeur === valeur)?.label ?? valeur;
}

export function valeursDe(
  options: ReadonlyArray<{ valeur: string; label: string }>
): string[] {
  return options.map((o) => o.valeur);
}
