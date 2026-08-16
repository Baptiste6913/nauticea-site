// Réseaux sociaux : source de vérité unique du site.
//
// Facebook : réactivé le 16/08 (retours client V3) : page vérifiée par
// le client (« Nauticea Yachting, Fréjus », 741 mentions J'aime) ; le
// test technique du même jour (chaîne de redirections, UA desktop,
// mobile et crawler) ne rencontre qu'un mur de connexion, sans
// contradiction (aucune trace d'un autre détenteur).
//
// Instagram : réactivé le 16/08 sur vérification client (capture de
// l'app : compte nauticeayachting, « Bruno Bouault », concessionnaire
// Sealine et Ryck, lien vers nauticeayachting.fr, 67 publications).
// Invérifiable de l'extérieur (redirection login, 429) : la capture
// client fait foi, docs/audit-reseaux.md garde l'historique.

export const RESEAUX: { facebook: string | null; instagram: string | null } = {
  facebook: "https://www.facebook.com/nauticea/",
  instagram: "https://www.instagram.com/nauticeayachting/",
};

export function reseauxActifs(): Array<{ nom: string; url: string }> {
  return [
    { nom: "Facebook", url: RESEAUX.facebook },
    { nom: "Instagram", url: RESEAUX.instagram },
  ].filter((r): r is { nom: string; url: string } => r.url !== null);
}
