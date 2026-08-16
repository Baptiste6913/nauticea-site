import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Surface from "@/components/da/Surface";
import { SITE, emailDisponible } from "@/lib/site";
import { typoFr } from "@/lib/format";

// Page carte de visite : cible du QR code des cartes imprimées.
export const metadata: Metadata = {
  title: "Carte de visite",
  description:
    "Coordonnées de Nauticea Yachting à Port Fréjus : téléphone, adresse et annonces de bateaux.",
  alternates: { canonical: "/carte" },
};

export default function Carte() {
  return (
    <div className="relative">
      <Surface
        niveau="domine"
        className="relative mx-auto my-12 flex max-w-md flex-col items-center rounded-lg bg-white px-6 py-10 text-center"
      >
      <Image
        src="/site/logos/logo-1382603607.png"
        alt="Nauticea Yachting"
        width={230}
        height={80}
        priority
      />
      <h1 className="mt-6 text-display-m font-bold text-marine">{SITE.nom}</h1>
      <p className="mt-1 text-sm text-encre/70">
        Concessionnaire Sealine et RYCK Yachts
      </p>
      <p className="mt-4 text-sm leading-relaxed text-encre/80">
        {SITE.adresse.rue}
        <br />
        {SITE.adresse.codePostal} {SITE.adresse.ville}
      </p>
      <p className="mt-4 text-sm text-encre/80">
        {typoFr(`Contact : ${SITE.responsable}`)}
      </p>
      <div className="mt-4 flex w-full flex-col gap-3">
        <a
          href={`tel:${SITE.telephoneFixeHref}`}
          className="sonde rounded bg-marine px-5 py-3 font-semibold text-white hover:bg-marine-2"
        >
          {typoFr(`Bureau : ${SITE.telephoneFixe}`)}
        </a>
        <a
          href={`tel:${SITE.telephoneMobileHref}`}
          className="sonde rounded border border-marine px-5 py-3 font-semibold text-marine hover:bg-ecume"
        >
          {typoFr(`Mobile : ${SITE.telephoneMobile}`)}
        </a>
        {emailDisponible() && (
          <a
            href={`mailto:${SITE.email}`}
            className="rounded border border-marine px-5 py-3 font-semibold text-marine hover:bg-ecume"
          >
            {SITE.email}
          </a>
        )}
        <Link
          href="/annonces"
          className="rounded bg-azur-2 px-5 py-3 font-semibold text-white hover:bg-azur"
        >
          Voir nos annonces
        </Link>
        <Link
          href="/contact"
          className="rounded border border-marine px-5 py-3 font-semibold text-marine hover:bg-ecume"
        >
          Formulaire de contact
        </Link>
      </div>
      </Surface>
    </div>
  );
}
