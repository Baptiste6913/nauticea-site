// Réseaux sociaux : source de vérité unique du site (audit du 16/08,
// docs/audit-reseaux.md). Les deux URLs historiques (facebook.com/nauticea,
// instagram.com/nauticeayachting) sont invérifiables depuis l'extérieur
// (murs de connexion) : retirées de l'affichage en attendant les URLs
// officielles confirmées par Bruno.
//
// Réactivation : remplacer null par l'URL confirmée, par exemple
//   facebook: "https://www.facebook.com/<page-confirmee>/",
// puis `npm run verifier` ; le footer et le JSON-LD les reprennent seuls.

export const RESEAUX: { facebook: string | null; instagram: string | null } = {
  facebook: null,
  instagram: null,
};

export function reseauxActifs(): Array<{ nom: string; url: string }> {
  return [
    { nom: "Facebook", url: RESEAUX.facebook },
    { nom: "Instagram", url: RESEAUX.instagram },
  ].filter((r): r is { nom: string; url: string } => r.url !== null);
}
