import { NextResponse } from "next/server";
import {
  DUREE_SESSION_S,
  cookieSession,
  gestionConfiguree,
  signer,
  verifier,
} from "@/lib/gestion/session";

// Ouverture d'une session depuis le lien reçu par courriel. Le jeton de
// lien est échangé contre un cookie de session, puis l'adresse est
// nettoyée par une redirection vers /gestion : le jeton ne reste pas dans
// la barre d'adresse ni dans l'historique de navigation.

export async function GET(request: Request) {
  if (!gestionConfiguree()) {
    return NextResponse.json({ erreur: "Service indisponible." }, { status: 503 });
  }
  const url = new URL(request.url);
  const charge = verifier(url.searchParams.get("jeton"), "lien");
  if (!charge) {
    // Lien expiré, déjà trop vieux, mal signé, ou adresse retirée de la
    // liste : une seule réponse, sans détail.
    return NextResponse.redirect(new URL("/gestion?lien=expire", url.origin), 303);
  }
  const session = signer({ email: charge.email, usage: "session" }, DUREE_SESSION_S);
  if (!session) {
    return NextResponse.json({ erreur: "Service indisponible." }, { status: 503 });
  }
  const reponse = NextResponse.redirect(new URL("/gestion", url.origin), 303);
  reponse.headers.set("Set-Cookie", cookieSession(session, DUREE_SESSION_S));
  return reponse;
}
