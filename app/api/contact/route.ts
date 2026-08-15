import { NextResponse } from "next/server";
import {
  debitAutorise,
  delaiHumainRespecte,
  emailValide,
  ipDeLaRequete,
  texteBorne,
} from "@/lib/anti-abus";
import { SITE } from "@/lib/site";

// Envoi du formulaire de contact via Resend si RESEND_API_KEY est
// présent. Sans clé, la page contact sert le mode dégradé (téléphones
// et mailto) et cette route répond 503. Durci (directive finale W5) :
// validation stricte, limite de taille, débit par IP, délai minimal,
// codes d'erreur sobres.

const TAILLE_MAX_CORPS = 16 * 1024;

export async function POST(request: Request) {
  const cle = process.env.RESEND_API_KEY;
  const destinataire = process.env.CONTACT_TO_EMAIL;
  if (!cle || !destinataire) {
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

  // Honeypot : un robot qui remplit le champ caché est ignoré en silence.
  if (typeof d.societe === "string" && d.societe.length > 0) {
    return NextResponse.json({ ok: true });
  }
  if (!delaiHumainRespecte(d.horodatage)) {
    return NextResponse.json({ erreur: "Requête invalide." }, { status: 400 });
  }

  const nom = texteBorne(d.nom, 120);
  const email = emailValide(d.email);
  const telephone = typeof d.telephone === "string" ? d.telephone.slice(0, 30) : "";
  const message = texteBorne(d.message, 10000);
  const annonce = texteBorne(d.annonce, 160);

  if (!nom || !email || !message) {
    return NextResponse.json({ erreur: "Champs invalides." }, { status: 400 });
  }

  const corps = [
    `Nom : ${nom}`,
    `E-mail : ${email}`,
    telephone ? `Téléphone : ${telephone}` : null,
    annonce ? `Annonce concernée : ${SITE.url}/annonces/${annonce}` : null,
    "",
    message,
  ]
    .filter((l): l is string => l !== null)
    .join("\n");

  // Domaine expéditeur : nauticeayachting.fr exclusivement.
  const expediteur =
    process.env.CONTACT_FROM_EMAIL ?? "site@nauticeayachting.fr";

  const reponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cle}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${SITE.nom} <${expediteur}>`,
      to: [destinataire],
      reply_to: email,
      subject: `[nauticeayachting.fr] Message de ${nom}`,
      text: corps,
    }),
  });

  if (!reponse.ok) {
    return NextResponse.json({ erreur: "Envoi impossible." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
