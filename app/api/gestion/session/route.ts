import { NextResponse } from "next/server";
import {
  cookieSession,
  gestionConfiguree,
  sessionDeRequete,
} from "@/lib/gestion/session";

// État de la session courante, et déconnexion.
//
// GET rend seulement ce dont l'écran a besoin : connecté ou non, et
// l'adresse de la personne connectée. Aucun jeton n'est jamais rendu.

export async function GET(request: Request) {
  if (!gestionConfiguree()) {
    return NextResponse.json({ connecte: false, disponible: false });
  }
  const session = sessionDeRequete(request);
  return NextResponse.json({
    disponible: true,
    connecte: session !== null,
    email: session?.email ?? null,
  });
}

export async function DELETE() {
  const reponse = NextResponse.json({ connecte: false });
  // Cookie vidé avec les mêmes attributs qu'à la pose, sans quoi certains
  // navigateurs le laisseraient en place.
  reponse.headers.set("Set-Cookie", cookieSession("", 0));
  return reponse;
}
