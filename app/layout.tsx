import type { Metadata } from "next";
import { Archivo, Fira_Sans, IBM_Plex_Mono } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Isobathes from "@/components/da/Isobathes";
import { SITE } from "@/lib/site";
import { actualitesActives } from "@/lib/contenu";
import "./globals.css";

// Corps humaniste (retouche GO session B) : Fira Sans, lignée FF Meta,
// même registre et même lisibilité qu'Open Sans, dessin plus incarné.
const corps = Fira_Sans({
  variable: "--font-corps",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
});

// Display DA : Archivo variable avec l'axe de largeur (wdth 125 posé en
// CSS), lettrage de signalétique portuaire (design/DA.md). preload
// désactivé : la variable pèse 88 Ko et concurrençait l'image LCP sur
// mobile ; le swap tardif des titres est un compromis assumé.
const titres = Archivo({
  variable: "--font-titres",
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
  preload: false,
});

// Utilitaire DA : chiffres d'instruments pour specs et prix. Deux
// graisses et pas de preload : même arbitrage budget que le display.
const sondes = IBM_Plex_Mono({
  variable: "--font-sondes",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
  preload: false,
});

// Barre système mobile alignée sur le fond du header (token pavillon).
export const viewport = {
  themeColor: "#001647",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "Nauticea Yachting, bateaux neufs et occasions : Fréjus, Var et Alpes-Maritimes",
    template: "%s | Nauticea Yachting",
  },
  description:
    "Concessionnaire exclusif Sealine et RYCK pour le Var et les Alpes-Maritimes, à Port Fréjus. Bateaux moteur neufs et occasions : Fréjus, Cannes, Nice, Saint-Raphaël, Saint-Tropez.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Nauticea Yachting",
    images: ["/site/slider/sealine-c390-3.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // data-scroll-behavior : Next 16 ne neutralise plus le scroll-behavior
  // smooth CSS pendant les navigations sans cet attribut, ce qui laissait
  // la page arriver en cours de défilement (retours client V3, bug du
  // retour accueil en milieu de page).
  return (
    <html lang="fr" data-scroll-behavior="smooth">
      <body
        className={`${corps.variable} ${titres.variable} ${sondes.variable} antialiased`}
      >
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:px-4 focus:py-2"
        >
          Aller au contenu
        </a>
        {/* Fond porteur unique du site : le filigrane d'isobathes,
            continu, opacité et échelle par tokens (design/DA.md).
            Fixe : jamais de coupure du motif à une frontière. */}
        <div
          aria-hidden="true"
          className="derive-lente pointer-events-none fixed inset-0 -z-10"
          style={{ opacity: "var(--filigrane-opacite)" }}
        >
          <Isobathes
            graine={43}
            variante="fond"
            couleur="var(--color-marine)"
            opacite={1}
            className="h-full w-full"
          />
        </div>
        <Header avecActualites={actualitesActives()} />
        <main id="contenu" className="min-h-[60vh]">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
