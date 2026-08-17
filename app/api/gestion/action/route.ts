import { NextResponse } from "next/server";
import { administrateurs, sessionDeRequete } from "@/lib/gestion/session";
import { envoyerRecapitulatif } from "@/lib/gestion/courriel";
import { declencherCycle, reglage } from "@/lib/gestion/github";
import { getBoats } from "@/lib/sources/corpus";

// Cycle de vie d'une annonce depuis l'écran de gestion : la route ne
// modifie rien, elle déclenche le workflow « Gérer une annonce », qui
// ouvre une demande de fusion à relire.

const ACTIONS = ["vendu", "disponible", "retirer"] as const;
type Action = (typeof ACTIONS)[number];

const PHRASES: Record<Action, string> = {
  vendu:
    "Demande enregistrée. Le bandeau « Vendu » sera posé après relecture, et l'annonce restera en ligne.",
  disponible:
    "Demande enregistrée. Le bateau repassera en vente après relecture.",
  retirer:
    "Demande enregistrée. L'annonce sera retirée après relecture, et son ancienne adresse renverra vers la liste des bateaux.",
};

const TAILLE_MAX_CORPS = 2 * 1024;

export async function POST(request: Request) {
  const session = sessionDeRequete(request);
  if (!session) {
    return NextResponse.json({ erreur: "Non autorisé." }, { status: 401 });
  }
  const config = reglage();
  if (!config) {
    return NextResponse.json(
      { erreur: "Les actions ne sont pas encore branchées sur le dépôt de code." },
      { status: 503 }
    );
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

  const action = typeof d.action === "string" ? d.action : "";
  if (!(ACTIONS as readonly string[]).includes(action)) {
    return NextResponse.json({ erreur: "Action inconnue." }, { status: 400 });
  }
  const slug = typeof d.slug === "string" ? d.slug.trim() : "";
  // Le slug est vérifié contre l'inventaire réel : rien d'arbitraire ne
  // part vers le workflow, et une annonce déjà retirée est refusée ici.
  const annonce = getBoats().find((b) => b.slug === slug);
  if (!annonce) {
    return NextResponse.json({ erreur: "Annonce introuvable." }, { status: 404 });
  }

  const resultat = await declencherCycle(config, { slug, action });
  if (!resultat.ok) {
    return NextResponse.json(
      {
        erreur:
          "La demande n'a pas abouti. Réessayez dans un instant ; si cela persiste, prévenez votre développeur.",
        detail: resultat.erreur,
      },
      { status: 502 }
    );
  }

  const envoi = await envoyerRecapitulatif(
    administrateurs(),
    `Espace de gestion : ${action} sur ${annonce.titre}`,
    [
      `${session.email} a demandé l'action « ${action} » depuis l'espace de gestion.`,
      "",
      `Bateau : ${annonce.titre}`,
      `Adresse : /annonces/${annonce.slug}`,
      "",
      "Une demande de fusion va s'ouvrir. Rien ne change en ligne avant sa",
      "relecture.",
    ]
  );

  return NextResponse.json({
    message: PHRASES[action as Action],
    courriel: envoi.ok,
  });
}
