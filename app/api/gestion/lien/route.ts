import { NextResponse } from "next/server";
import {
  debitAutorise,
  delaiHumainRespecte,
  emailValide,
  ipDeLaRequete,
} from "@/lib/anti-abus";
import { envoyerLien } from "@/lib/gestion/courriel";
import {
  DUREE_LIEN_S,
  estAdministrateur,
  gestionConfiguree,
  signer,
} from "@/lib/gestion/session";
import { SITE } from "@/lib/site";

// Demande d'un lien de connexion à l'espace de gestion.
//
// Règle d'or : la réponse est la même quoi qu'il arrive, adresse connue ou
// non. Une réponse qui distinguerait les deux cas transformerait cette
// route en annuaire des administrateurs.

const TAILLE_MAX_CORPS = 4 * 1024;
const REPONSE_NEUTRE = {
  message:
    "Si cette adresse est autorisée, un lien de connexion vient de lui être envoyé. Le lien est valable 15 minutes.",
};

export async function POST(request: Request) {
  if (!gestionConfiguree()) {
    return NextResponse.json({ erreur: "Service indisponible." }, { status: 503 });
  }
  if (!debitAutorise(ipDeLaRequete(request))) {
    return NextResponse.json({ erreur: "Trop de requêtes." }, { status: 429 });
  }

  const brut = await request.text();
  if (brut.length > TAILLE_MAX_CORPS) {
    return NextResponse.json({ erreur: "Requête invalide." }, { status: 413 });
  }
  let d: Record<string, unknown>;
  try {
    d = JSON.parse(brut) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ erreur: "Requête invalide." }, { status: 400 });
  }

  // Honeypot : un robot qui remplit le champ caché reçoit la réponse
  // neutre, et rien n'est envoyé.
  if (typeof d.societe === "string" && d.societe.length > 0) {
    return NextResponse.json(REPONSE_NEUTRE);
  }
  if (!delaiHumainRespecte(d.horodatage)) {
    return NextResponse.json(REPONSE_NEUTRE);
  }

  const email = emailValide(d.email);
  if (!email || !estAdministrateur(email)) {
    // Adresse absente, mal formée, ou hors liste : même réponse, aucun
    // envoi, aucune fuite.
    return NextResponse.json(REPONSE_NEUTRE);
  }

  const jeton = signer({ email, usage: "lien" }, DUREE_LIEN_S);
  if (!jeton) {
    return NextResponse.json({ erreur: "Service indisponible." }, { status: 503 });
  }
  const lien = `${SITE.url}/api/gestion/entrer?jeton=${encodeURIComponent(jeton)}`;
  const envoi = await envoyerLien(email, lien);
  if (!envoi.ok) {
    // Même réponse, même code, même corps qu'une adresse hors liste :
    // renvoyer 502 ici distinguerait une adresse autorisée d'une adresse
    // inconnue, et cette route deviendrait un annuaire des
    // administrateurs. La panne est tracée côté serveur uniquement.
    console.error(`espace de gestion : envoi du lien impossible (${envoi.erreur})`);
  }
  return NextResponse.json(REPONSE_NEUTRE);
}
