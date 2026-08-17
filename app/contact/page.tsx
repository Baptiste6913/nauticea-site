import type { Metadata } from "next";
import CarteFacade from "@/components/CarteFacade";
import ContactForm from "@/components/ContactForm";
import Surface from "@/components/da/Surface";
import { SITE, emailDisponible, itineraireUrl } from "@/lib/site";
import { reseauxActifs } from "@/lib/config/reseaux";
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
  // Détection serveur, mêmes variables que la route (retours V4).
  const formulaireActif = Boolean(
    process.env.RESEND_API_KEY &&
      process.env.CONTACT_TO_EMAIL &&
      process.env.EMAIL_FROM
  );

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
                  className="sonde block py-1 text-azur-2 hover:underline"
                >
                  {typoFr(`${SITE.responsable} : ${SITE.telephoneMobile}`)}
                </a>
                <a
                  href={`tel:${SITE.telephoneFixeHref}`}
                  className="sonde block py-1 text-azur-2 hover:underline"
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
          {/* Sans formulaire actif, l'encadré « appelez-nous » affiche
              déjà les deux numéros : on ne les répète pas ici (retour
              client du 16/08). Ils reviennent dès que le formulaire
              Resend est actif, pour rester joignable au téléphone. */}
          {formulaireActif && (
            <p className="mt-3 text-sm">
              <a
                href={`tel:${SITE.telephoneMobileHref}`}
                className="sonde inline-block py-1 font-semibold text-azur-2 hover:underline"
              >
                {typoFr(`Mobile : ${SITE.telephoneMobile}`)}
              </a>
              <br />
              <a
                href={`tel:${SITE.telephoneFixeHref}`}
                className="sonde inline-block py-1 font-semibold text-azur-2 hover:underline"
              >
                {typoFr(`Bureau : ${SITE.telephoneFixe}`)}
              </a>
            </p>
          )}
          {reseauxActifs().length > 0 && (
            <p className="mt-4 flex gap-4 text-sm">
              {reseauxActifs().map((r) => (
                <a
                  key={r.nom}
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-azur-2 hover:underline"
                >
                  {r.nom}
                </a>
              ))}
            </p>
          )}
        </aside>
      </div>
      <section id="plan" aria-labelledby="plan-titre" className="mt-14">
        <h2 id="plan-titre" className="text-display-s font-semibold text-marine">
          Nous trouver dans le port
        </h2>
        {/* Carte Google Maps en façade (retours client 16/08 V2) :
            l'iframe ne se charge qu'au clic sur « Afficher la carte ». */}
        <CarteFacade
          adresse={`${SITE.nom}, ${SITE.adresse.rue}, ${SITE.adresse.codePostal} ${SITE.adresse.ville}.`}
        />
        <p className="mt-5">
          <a
            href={itineraireUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded bg-marine px-5 py-2.5 font-semibold text-white hover:bg-marine-2"
          >
            Itinéraire
          </a>
        </p>
      </section>
    </div>
  );
}
