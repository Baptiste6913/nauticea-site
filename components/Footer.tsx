import Image from "next/image";
import Link from "next/link";
import { SITE } from "@/lib/site";
import { reseauxActifs } from "@/lib/config/reseaux";
import { typoFr } from "@/lib/format";

export default function Footer() {
  return (
    // Un seul sombre en fond : le pavillon (couleur du logo, design/DA.md).
    <footer className="bg-pavillon text-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-3">
        <div>
          <h2 className="text-display-s font-semibold">{SITE.nom}</h2>
          <p className="mt-1 text-sm text-white/80">
            Concessionnaire exclusif Sealine et RYCK pour les départements du Var et des Alpes-Maritimes
          </p>
          <p className="mt-3 text-sm leading-relaxed text-white/80">
            {SITE.adresse.rue}
            <br />
            {SITE.adresse.codePostal} {SITE.adresse.ville}
          </p>
          <p className="mt-3 text-sm">
            <a
              href={`tel:${SITE.telephoneFixeHref}`}
              className="sonde inline-block py-1 hover:text-azur"
            >
              {typoFr(`Tél : ${SITE.telephoneFixe}`)}
            </a>
            <br />
            <a
              href={`tel:${SITE.telephoneMobileHref}`}
              className="sonde inline-block py-1 hover:text-azur"
            >
              {typoFr(`Mobile : ${SITE.telephoneMobile}`)}
            </a>
          </p>
          {reseauxActifs().length > 0 && (
            <p className="mt-3 flex gap-4 text-sm">
              {reseauxActifs().map((r) => (
                <a
                  key={r.nom}
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block py-1 hover:text-azur"
                >
                  {r.nom}
                </a>
              ))}
            </p>
          )}
        </div>
        <nav aria-label="Liens de bas de page" className="text-sm">
          <ul className="space-y-2">
            <li><Link href="/" className="inline-block py-1 hover:text-azur">Accueil</Link></li>
            <li><Link href="/annonces" className="inline-block py-1 hover:text-azur">Annonces</Link></li>
            <li><Link href="/projet" className="inline-block py-1 hover:text-azur">Votre projet</Link></li>
            <li><Link href="/contact" className="inline-block py-1 hover:text-azur">Contact</Link></li>
            <li><Link href="/mentions-legales" className="inline-block py-1 hover:text-azur">Mentions légales</Link></li>
            <li><Link href="/carte" className="inline-block py-1 hover:text-azur">Carte de visite</Link></li>
          </ul>
        </nav>
        <div className="flex items-start gap-4">
          <Image
            src="/site/logos/SEALINE-Logo.jpg"
            alt="Sealine"
            width={100}
            height={51}
            className="rounded bg-white p-1"
          />
          <Image
            src="/site/logos/Logo-Ricknoir.jpg"
            alt="RYCK Yachts"
            width={100}
            height={53}
            className="rounded bg-white p-1"
          />
        </div>
      </div>
      <div className="bg-pavillon-2 py-4 text-center text-xs text-white/70">
        <p>Copyright © 2026 Nauticea Yachting. Tous droits réservés</p>
      </div>
    </footer>
  );
}
