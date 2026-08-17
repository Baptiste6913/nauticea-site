import { NextResponse } from "next/server";
import { administrateurs, sessionDeRequete } from "@/lib/gestion/session";
import { envoyerRecapitulatif } from "@/lib/gestion/courriel";
import {
  deposerFiche,
  horodatageBranche,
  nomFicheSur,
  reglage,
} from "@/lib/gestion/github";
import { TAILLE_MAX_PDF } from "@/lib/ingest/pdf";
import { SITE } from "@/lib/site";

// Dépôt d'une fiche PDF depuis l'écran de gestion.
//
// La route ne lit pas la fiche et n'écrit aucune donnée bateau : elle pose
// le PDF sur une branche, et le workflow d'ingestion fait tout le reste,
// jusqu'à une demande de fusion relue par un humain. C'est ce qui fait de
// /gestion une télécommande et non un back-office de saisie.

const TAILLE_MAX_REQUETE = TAILLE_MAX_PDF + 64 * 1024;

export async function POST(request: Request) {
  const session = sessionDeRequete(request);
  if (!session) {
    return NextResponse.json({ erreur: "Non autorisé." }, { status: 401 });
  }
  const config = reglage();
  if (!config) {
    return NextResponse.json(
      { erreur: "Le dépôt n'est pas encore branché sur le dépôt de code." },
      { status: 503 }
    );
  }

  const annonce = new URL(request.url).searchParams.get("annonce");
  let formulaire: FormData;
  try {
    formulaire = await request.formData();
  } catch {
    return NextResponse.json({ erreur: "Requête invalide." }, { status: 400 });
  }
  const fichier = formulaire.get("fiche");
  if (!(fichier instanceof File)) {
    return NextResponse.json(
      { erreur: "Aucune fiche reçue. Choisissez un fichier PDF." },
      { status: 400 }
    );
  }
  if (fichier.size === 0) {
    return NextResponse.json({ erreur: "Le fichier est vide." }, { status: 400 });
  }
  if (fichier.size > TAILLE_MAX_REQUETE) {
    return NextResponse.json(
      { erreur: "Fiche trop lourde : la limite est de 30 Mo." },
      { status: 413 }
    );
  }

  const octets = new Uint8Array(await fichier.arrayBuffer());
  // Contrôle du contenu, pas seulement de l'extension : un fichier
  // renommé en .pdf est refusé tout de suite, plutôt que de faire échouer
  // le workflow deux minutes plus tard.
  const entete = Buffer.from(octets.subarray(0, 5)).toString("latin1");
  if (entete !== "%PDF-") {
    return NextResponse.json(
      {
        erreur:
          "Ce fichier n'est pas un PDF. Exportez la fiche depuis BoatWizard, puis redéposez-la.",
      },
      { status: 415 }
    );
  }

  const horodatage = horodatageBranche(new Date());
  const nomFichier = nomFicheSur(fichier.name, horodatage);
  const suffixe = annonce ? `, remplacement de la fiche de ${annonce}` : "";
  const resultat = await deposerFiche(config, {
    branche: `depot/${horodatage}`,
    nomFichier,
    octets,
    message: `Dépôt d'une fiche depuis l'espace de gestion${suffixe}

Déposée par ${session.email} depuis ${SITE.url}/gestion. L'ingestion
enchaîne et ouvre une demande de fusion à relire.`,
  });
  if (!resultat.ok) {
    return NextResponse.json(
      {
        erreur:
          "Le dépôt n'a pas abouti. Réessayez dans un instant ; si cela persiste, prévenez votre développeur.",
        detail: resultat.erreur,
      },
      { status: 502 }
    );
  }

  // Le courriel récapitulatif ne conditionne pas le geste : la fiche est
  // déjà déposée, un échec d'envoi est seulement signalé.
  const envoi = await envoyerRecapitulatif(
    administrateurs(),
    "Espace de gestion : fiche déposée",
    [
      `${session.email} a déposé une fiche depuis l'espace de gestion.`,
      "",
      `Fichier : ${nomFichier}`,
      annonce ? `Annonce visée : ${annonce}` : "Nouveau bateau, ou mise à jour reconnue automatiquement.",
      `Branche : ${resultat.valeur.branche}`,
      "",
      "L'ingestion lit la fiche, écrit l'annonce et ouvre une demande de",
      "fusion. Rien n'est publié avant sa relecture.",
    ]
  );

  return NextResponse.json({
    message:
      "Fiche reçue. L'annonce sera relue puis publiée. Vous recevrez un courriel de récapitulatif.",
    branche: resultat.valeur.branche,
    courriel: envoi.ok,
  });
}
