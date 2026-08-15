import Image from "next/image";
import Link from "next/link";
import Isobathes from "@/components/da/Isobathes";
import { SITE } from "@/lib/site";
import { typoFr } from "@/lib/format";

export default function Footer() {
  return (
    <footer className="relative overflow-hidden bg-abysse text-white">
      {/* Bande d'isobathes du pied de page (design/DA.md) : niveau 0,
          sous les marges, jamais sous le texte courant. */}
      <Isobathes
        graine={19}
        variante="separateur"
        couleur="var(--color-azur)"
        opacite={0.25}
        sondes
        className="absolute inset-x-0 top-0 h-24 w-full"
      />
      <div className="relative mx-auto grid max-w-6xl gap-8 px-4 pb-10 pt-16 md:grid-cols-3">
        <div>
          <h2 className="text-display-s font-semibold">{SITE.nom}</h2>
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
          <p className="mt-3 flex gap-4 text-sm">
            <a href={SITE.reseaux.facebook} rel="noopener" className="inline-block py-1 hover:text-azur">
              Facebook
            </a>
            <a href={SITE.reseaux.instagram} rel="noopener" className="inline-block py-1 hover:text-azur">
              Instagram
            </a>
          </p>
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
      <div className="relative border-t border-white/10 py-4 text-center text-xs text-white/60">
        <p>Copyright © 2026 Nauticea Yachting. Tous droits réservés</p>
      </div>
    </footer>
  );
}
