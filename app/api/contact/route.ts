import { NextResponse } from "next/server";
import { SITE } from "@/lib/site";

// Envoi du formulaire de contact via Resend si RESEND_API_KEY est présent.
// Sans clé, la page contact n'affiche pas le formulaire (dégradation propre :
// téléphone cliquable), et cette route répond 503.

interface Demande {
  nom?: string;
  email?: string;
  telephone?: string;
  message?: string;
  annonce?: string;
  societe?: string;
}

export async function POST(request: Request) {
  const cle = process.env.RESEND_API_KEY;
  const destinataire = process.env.CONTACT_TO_EMAIL;
  if (!cle || !destinataire) {
    return NextResponse.json(
      { erreur: "Formulaire indisponible, merci de nous appeler." },
      { status: 503 }
    );
  }

  let demande: Demande;
  try {
    demande = (await request.json()) as Demande;
  } catch {
    return NextResponse.json({ erreur: "Requête invalide." }, { status: 400 });
  }

  // Honeypot : un robot qui remplit le champ caché est ignoré silencieusement.
  if (demande.societe) {
    return NextResponse.json({ ok: true });
  }

  const { nom, email, telephone, message, annonce } = demande;
  if (!nom || !email || !message || !email.includes("@")) {
    return NextResponse.json(
      { erreur: "Champs obligatoires manquants." },
      { status: 400 }
    );
  }

  const corps = [
    `Nom : ${nom}`,
    `E-mail : ${email}`,
    telephone ? `Téléphone : ${telephone}` : null,
    annonce ? `Annonce concernée : ${SITE.url}/annonces/${annonce}` : null,
    "",
    message,
  ]
    .filter((l) => l !== null)
    .join("\n");

  const reponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cle}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.CONTACT_FROM_EMAIL ?? "onboarding@resend.dev",
      to: [destinataire],
      reply_to: email,
      subject: `[nauticeayachting.fr] Message de ${nom}`,
      text: corps.slice(0, 10000),
    }),
  });

  if (!reponse.ok) {
    return NextResponse.json(
      { erreur: "L'envoi a échoué, merci de réessayer." },
      { status: 502 }
    );
  }
  return NextResponse.json({ ok: true });
}
