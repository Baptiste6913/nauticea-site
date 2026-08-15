import { NextResponse } from "next/server";
import {
  debitAutorise,
  delaiHumainRespecte,
  emailValide,
  ipDeLaRequete,
  texteBorne,
  turnstileValide,
} from "@/lib/anti-abus";
import { BUDGETS, HORIZONS, NATURES, labelDe, valeursDe } from "@/lib/projet";
import { SITE } from "@/lib/site";

// Réception du formulaire « Votre projet » (directive finale W3).
// Active uniquement quand RESEND_API_KEY et CONTACT_TO_EMAIL sont
// posées ; sinon la page sert le mode mailto et cette route répond 503.
// Codes d'erreur sobres : aucun détail interne exposé.

const TAILLE_MAX_CORPS = 8 * 1024;

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
  if (!(await turnstileValide(d["cf-turnstile-response"]))) {
    return NextResponse.json({ erreur: "Vérification échouée." }, { status: 403 });
  }

  const nature = texteBorne(d.nature, 30);
  const budget = texteBorne(d.budget, 30);
  const horizon = texteBorne(d.horizon, 30);
  const nom = texteBorne(d.nom, 120);
  const telephone = texteBorne(d.telephone, 30);
  const email = emailValide(d.email);
  const typeRecherche = texteBorne(d.type_recherche, 120);
  const message = typeof d.message === "string" ? d.message.slice(0, 4000) : "";
  const annonce = texteBorne(d.annonce, 160);

  if (
    !nature ||
    !valeursDe(NATURES).includes(nature) ||
    !budget ||
    !valeursDe(BUDGETS).includes(budget) ||
    !horizon ||
    !valeursDe(HORIZONS).includes(horizon) ||
    !nom ||
    !telephone ||
    !email
  ) {
    return NextResponse.json({ erreur: "Champs invalides." }, { status: 400 });
  }

  const corps = [
    `Nature du projet : ${labelDe(NATURES, nature)}`,
    typeRecherche ? `Type recherché : ${typeRecherche}` : null,
    `Budget : ${labelDe(BUDGETS, budget)}`,
    `Horizon : ${labelDe(HORIZONS, horizon)}`,
    `Nom : ${nom}`,
    `Téléphone : ${telephone}`,
    `Email : ${email}`,
    annonce ? `Annonce concernée : ${annonce}` : null,
    message ? `\n${message}` : null,
  ]
    .filter((l): l is string => l !== null)
    .join("\n");

  // Domaine expéditeur : nauticeayachting.fr exclusivement (SPF et
  // DKIM posés à la vérification Resend, voir docs/GO-LIVE.md).
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
      subject: `Lead site : ${labelDe(NATURES, nature)} (${labelDe(BUDGETS, budget)})`,
      text: corps,
    }),
  });

  if (!reponse.ok) {
    return NextResponse.json({ erreur: "Envoi impossible." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
