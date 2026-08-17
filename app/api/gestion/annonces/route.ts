import { NextResponse } from "next/server";
import { sessionDeRequete } from "@/lib/gestion/session";
import { getBoats } from "@/lib/sources/corpus";
import { formatPrix } from "@/lib/format";

// Liste des annonces pour l'écran de gestion. Lecture seule, et strictement
// ce que l'écran affiche : vignette, titre, prix, état, marquage vendu.
// Aucune donnée n'est modifiable par cette route.

export async function GET(request: Request) {
  if (!sessionDeRequete(request)) {
    return NextResponse.json({ erreur: "Non autorisé." }, { status: 401 });
  }
  const annonces = getBoats().map((b) => ({
    slug: b.slug,
    titre: b.titre,
    prix: formatPrix(b.prix, b.devise),
    etat: b.etat,
    vendu: b.vendu === true,
    photo: b.photos[0] ?? null,
    source: b.source,
  }));
  return NextResponse.json({ annonces });
}
