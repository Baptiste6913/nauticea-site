import type { Metadata } from "next";
import ContactForm from "@/components/ContactForm";
import Surface from "@/components/da/Surface";
import { SITE, emailDisponible } from "@/lib/site";
import { typoFr } from "@/lib/format";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contactez Nauticea Yachting à Port Fréjus : formulaire, téléphone et adresse, côté capitainerie, 23 Quai de la Foudre.",
  alternates: { canonical: "/contact" },
};

export default async function Contact({
  searchParams,
}: {
  searchParams: Promise<{ annonce?: string }>;
}) {
  const { annonce } = await searchParams;
  const formulaireActif = Boolean(process.env.RESEND_API_KEY);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-display-l font-bold text-marine md:text-display-xl">
        Nous contacter
      </h1>
      <div className="mt-8 grid gap-10 md:grid-cols-[3fr_2fr]">
        <section aria-label="Formulaire de contact">
          {formulaireActif ? (
            <>
              <p className="mb-6 leading-relaxed text-encre/80">
                {typoFr(
                  "Si vous souhaitez plus d'informations, remplissez ce formulaire. Nous reviendrons vers vous dès que possible."
                )}
              </p>
              <ContactForm annonce={annonce} />
            </>
          ) : (
            <Surface niveau="flotte" className="rounded-lg bg-ecume p-6">
              <p className="leading-relaxed text-encre/90">
                {typoFr(
                  "Pour toute demande d'information, appelez-nous directement :"
                )}
              </p>
              <p className="mt-4 space-y-2 text-lg font-semibold">
                <a
                  href={`tel:${SITE.telephoneMobileHref}`}
                  className="sonde block text-azur-2 hover:underline"
                >
                  {typoFr(`${SITE.responsable} : ${SITE.telephoneMobile}`)}
                </a>
                <a
                  href={`tel:${SITE.telephoneFixeHref}`}
                  className="sonde block text-azur-2 hover:underline"
                >
                  {typoFr(`Bureau : ${SITE.telephoneFixe}`)}
                </a>
              </p>
              {emailDisponible() && (
                <p className="mt-4">
                  <a
                    href={`mailto:${SITE.email}`}
                    className="font-semibold text-azur-2 hover:underline"
                  >
                    {SITE.email}
                  </a>
                </p>
              )}
            </Surface>
          )}
        </section>
        <aside>
          <h2 className="text-display-s font-semibold text-marine">
            {SITE.nom}
          </h2>
          <address className="mt-3 text-sm not-italic leading-relaxed text-encre/80">
            {SITE.adresse.rue}
            <br />
            {SITE.adresse.codePostal} {SITE.adresse.ville}
          </address>
          <p className="mt-3 text-sm">
            <a
              href={`tel:${SITE.telephoneMobileHref}`}
              className="sonde font-semibold text-azur-2 hover:underline"
            >
              {typoFr(`Mobile : ${SITE.telephoneMobile}`)}
            </a>
            <br />
            <a
              href={`tel:${SITE.telephoneFixeHref}`}
              className="sonde font-semibold text-azur-2 hover:underline"
            >
              {typoFr(`Bureau : ${SITE.telephoneFixe}`)}
            </a>
          </p>
          <p className="mt-4 flex gap-4 text-sm">
            <a href={SITE.reseaux.facebook} rel="noopener" className="text-azur-2 hover:underline">
              Facebook
            </a>
            <a href={SITE.reseaux.instagram} rel="noopener" className="text-azur-2 hover:underline">
              Instagram
            </a>
          </p>
        </aside>
      </div>
    </div>
  );
}
