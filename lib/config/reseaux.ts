// Réseaux sociaux : source de vérité unique du site.
//
// Facebook : réactivé le 16/08 (retours client V3) : page vérifiée par
// le client (« Nauticea Yachting, Fréjus », 741 mentions J'aime) ; le
// test technique du même jour (chaîne de redirections, UA desktop,
// mobile et crawler) ne rencontre qu'un mur de connexion, sans
// contradiction (aucune trace d'un autre détenteur).
//
// Instagram : reste à null (audit du 16/08, docs/audit-reseaux.md) :
// invérifiable de l'extérieur (redirection login, 429) et détenteur du
// handle inconnu. Seule la confirmation du client réactive : remplacer
// null par l'URL confirmée puis `npm run verifier` ; le footer, la page
// contact et le JSON-LD les reprennent seuls.

export const RESEAUX: { facebook: string | null; instagram: string | null } = {
  facebook: "https://www.facebook.com/nauticea/",
  instagram: null,
};

export function reseauxActifs(): Array<{ nom: string; url: string }> {
  return [
    { nom: "Facebook", url: RESEAUX.facebook },
    { nom: "Instagram", url: RESEAUX.instagram },
  ].filter((r): r is { nom: string; url: string } => r.url !== null);
}
