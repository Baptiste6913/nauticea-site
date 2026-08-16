// Coordonnées extraites du corpus (pages mentions légales et contact du
// site actuel). Champ absent du corpus = "a_confirmer", masqué à l'affichage.
export const SITE = {
  nom: "Nauticea Yachting",
  url: "https://www.nauticeayachting.fr",
  adresse: {
    rue: "Côté capitainerie, 23 Quai de la Foudre, l'Amirauté",
    codePostal: "83600",
    ville: "Fréjus",
    pays: "FR",
  },
  telephoneFixe: "+33 4 94 51 02 22",
  telephoneFixeHref: "+33494510222",
  telephoneMobile: "+33 6 12 98 86 61",
  telephoneMobileHref: "+33612988661",
  siret: "42952328500030",
  responsable: "Bruno BOUAULT",
  // Adresse confirmée par le client (whois + usage réel, GO du 14/08) :
  // le mode mailto fonctionne dès le merge, sans variable d'env.
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "contact@nauticeayachting.fr",
  marques: {
    sealine: "https://www.hanseyachtsag.com/sealine/fr/",
    ryck: "https://www.hanseyachtsag.com/ryck/fr/",
  },
} as const;

export function emailDisponible(): boolean {
  return SITE.email !== "a_confirmer" && SITE.email.includes("@");
}
