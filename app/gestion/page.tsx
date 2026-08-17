import type { Metadata } from "next";
import EspaceGestion from "@/components/gestion/EspaceGestion";

// Espace de gestion : télécommande du canal fiche PDF, pas un
// back-office de saisie. Aucune donnée bateau n'est saisie ici, chaque
// geste part vers les workflows du dépôt et finit en demande de fusion
// relue par un humain.
//
// Discrétion : cette page n'est liée depuis aucune page publique, ne
// figure pas au sitemap, et porte noindex par sa balise comme par
// l'en-tête X-Robots-Tag posé dans next.config.ts.

export const metadata: Metadata = {
  title: "Espace de gestion",
  robots: { index: false, follow: false, nocache: true },
};

// Rendu à la demande : la page dépend du cookie de session, elle ne doit
// jamais être figée dans le cache statique.
export const dynamic = "force-dynamic";

export default function PageGestion() {
  return <EspaceGestion />;
}
