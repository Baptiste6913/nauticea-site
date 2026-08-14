import type { Metadata } from "next";
import { Archivo, Open_Sans } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SITE } from "@/lib/site";
import "./globals.css";

const corps = Open_Sans({
  variable: "--font-corps",
  subsets: ["latin"],
  display: "swap",
});

const titres = Archivo({
  variable: "--font-titres",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "Nauticea Yachting, bateaux neufs et occasions à Fréjus",
    template: "%s | Nauticea Yachting",
  },
  description:
    "Concessionnaire Sealine et RYCK Yachts à Port Fréjus. Bateaux moteur neufs et occasions sur la Côte d'Azur : Fréjus, Cannes, Nice, Saint-Raphaël, Saint-Tropez.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body className={`${corps.variable} ${titres.variable} antialiased`}>
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:px-4 focus:py-2"
        >
          Aller au contenu
        </a>
        <Header />
        <main id="contenu" className="min-h-[60vh]">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
