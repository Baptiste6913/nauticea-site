import type { Metadata } from "next";
import ProjetForm from "@/components/ProjetForm";
import { getBoatBySlug } from "@/lib/sources/corpus";
import { SITE } from "@/lib/site";
import { typoFr } from "@/lib/format";

export const metadata: Metadata = {
  title: "Votre projet bateau",
  description:
    "Achat neuf ou occasion, vente ou reprise : décrivez votre projet en une minute, Nauticea Yachting vous répond avec des propositions concrètes.",
  alternates: { canonical: "/projet" },
};

export default async function Projet({
  searchParams,
}: {
  searchParams: Promise<{ annonce?: string }>;
}) {
  const { annonce } = await searchParams;
  const bateau = annonce ? getBoatBySlug(annonce) : undefined;
  const modeAuto = Boolean(
    process.env.RESEND_API_KEY && process.env.CONTACT_TO_EMAIL
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <p className="sonde text-xs uppercase tracking-[0.25em] text-azur-2">
        Une minute suffit
      </p>
      <h1 className="mt-2 text-display-l font-bold text-marine md:text-display-xl">
        Votre projet
      </h1>
      <p className="mt-3 leading-relaxed text-encre/80">
        {typoFr(
          bateau
            ? `Vous vous intéressez au ${bateau.titre} : dites-nous en un peu plus, nous revenons vers vous rapidement.`
            : "Achat neuf, occasion, vente ou reprise : décrivez votre projet, nous revenons vers vous avec des propositions concrètes."
        )}
      </p>
      <div className="mt-8">
        <ProjetForm
          modeAuto={modeAuto}
          emailContact={SITE.email}
          annonce={bateau?.titre}
          cleTurnstile={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
        />
      </div>
    </div>
  );
}
