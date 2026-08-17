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

// Types de bateau recherchés (retours client V4) : champ à choix dont
// les libellés viennent de la taxonomie réelle du site (sous-catégories
// du corpus + catégorie voiliers). La valeur vide = pas de préférence,
// la ligne est alors omise du récapitulatif.
export const TYPES_RECHERCHE = [
  { valeur: "", label: "Peu importe / à définir" },
  { valeur: "vedette", label: "Vedette" },
  { valeur: "flybridge", label: "Flybridge" },
  { valeur: "coupe", label: "Coupé" },
  { valeur: "trawler", label: "Trawler" },
  { valeur: "motor-yacht", label: "Motor yacht" },
  { valeur: "semi-rigide", label: "Semi-rigide" },
  { valeur: "catamaran", label: "Catamaran" },
  { valeur: "voilier", label: "Voilier" },
] as const;

// Récapitulatif du projet, partagé entre l'écran de confirmation, le
// mailto, le message copié et le corps de l'email API : une seule
// source, uniquement des libellés humains (retours client V4).
export function lignesRecapProjet(
  d: Record<string, string | undefined>
): string[] {
  return [
    `Nature du projet : ${labelDe(NATURES, d.nature ?? "")}`,
    d.type_recherche
      ? `Type recherché : ${labelDe(TYPES_RECHERCHE, d.type_recherche)}`
      : null,
    `Budget : ${labelDe(BUDGETS, d.budget ?? "")}`,
    `Horizon : ${labelDe(HORIZONS, d.horizon ?? "")}`,
    `Nom : ${d.nom ?? ""}`,
    `Téléphone : ${d.telephone ?? ""}`,
    `Email : ${d.email ?? ""}`,
    d.annonce ? `Annonce concernée : ${d.annonce}` : null,
    d.message?.trim() ? `Message : ${d.message.trim()}` : null,
  ].filter((l): l is string => l !== null);
}
