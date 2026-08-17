// Courriels de l'espace de gestion, envoyés par Resend, comme les
// formulaires publics. Un envoi qui échoue ne fait jamais échouer le geste
// déjà accompli : il est rendu comme un avertissement.
import { SITE } from "../site.ts";

export interface ResultatEnvoi {
  ok: boolean;
  erreur?: string;
}

function configuration(): { cle: string; expediteur: string } | null {
  const cle = process.env.RESEND_API_KEY;
  const expediteur = process.env.EMAIL_FROM;
  return cle && expediteur ? { cle, expediteur } : null;
}

export function envoiConfigure(): boolean {
  return configuration() !== null;
}

async function envoyer(
  destinataires: string[],
  sujet: string,
  texte: string
): Promise<ResultatEnvoi> {
  const config = configuration();
  if (!config) {
    return { ok: false, erreur: "envoi non configuré" };
  }
  if (destinataires.length === 0) {
    return { ok: false, erreur: "aucun destinataire" };
  }
  try {
    const reponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.cle}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${SITE.nom} <${config.expediteur}>`,
        to: destinataires,
        subject: sujet,
        text: texte,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!reponse.ok) {
      return { ok: false, erreur: `Resend a répondu ${reponse.status}` };
    }
    return { ok: true };
  } catch (e) {
    const nom = e instanceof Error ? e.name : "Erreur";
    return { ok: false, erreur: nom };
  }
}

/** Lien de connexion, envoyé à la seule adresse qui l'a demandé. */
export function envoyerLien(email: string, lien: string): Promise<ResultatEnvoi> {
  return envoyer(
    [email],
    "Votre lien de connexion à l'espace de gestion",
    [
      "Bonjour,",
      "",
      "Voici votre lien de connexion à l'espace de gestion du site :",
      "",
      lien,
      "",
      "Ce lien est valable 15 minutes et ne fonctionne qu'une fois ouvert",
      "depuis cet appareil. Si vous n'avez pas demandé cette connexion,",
      "ignorez ce message : personne ne peut entrer sans ce lien.",
      "",
      SITE.nom,
    ].join("\n")
  );
}

/** Récapitulatif d'un geste, envoyé à tous les administrateurs. */
export function envoyerRecapitulatif(
  destinataires: string[],
  sujet: string,
  lignes: string[]
): Promise<ResultatEnvoi> {
  return envoyer(destinataires, sujet, [...lignes, "", SITE.nom].join("\n"));
}
