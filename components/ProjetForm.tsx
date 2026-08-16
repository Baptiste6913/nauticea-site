"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BUDGETS, HORIZONS, NATURES, labelDe } from "@/lib/projet";
import { SITE } from "@/lib/site";
import { typoFr } from "@/lib/format";

// Formulaire de conversion « Votre projet » (directive finale W3,
// parcours dégradé fiabilisé aux retours client V3 du 16/08).
// Mode automatique (RESEND_API_KEY posée côté serveur) : envoi via
// /api/projet, inchangé et prioritaire. Mode dégradé (par défaut) :
// le clic sur envoyer affiche une étape de confirmation avec le
// récapitulatif complet et trois canaux (messagerie via mailto
// compacté sous 1800 caractères, copie du message, coordonnées en
// clair), car mailto échoue en silence sans client mail associé.

type Statut = "repos" | "envoi" | "ok" | "erreur";
type Etape = "saisie" | "confirmation";
type Copie = "repos" | "ok" | "echec";

const CHAMP = "mt-1 w-full rounded border border-encre/20 bg-white px-3 py-2";
const CHAMP_ERREUR =
  "mt-1 w-full rounded border-2 border-red-700 bg-white px-3 py-2";
const LIBELLE = "block text-sm font-medium";
const BOUTON_PLEIN =
  "inline-block rounded bg-azur-2 px-5 py-2.5 font-semibold text-white hover:bg-marine";
const BOUTON_BORD =
  "inline-block rounded border border-marine px-5 py-2.5 font-semibold text-marine hover:bg-ecume";

const ORDRE_CHAMPS = ["nature", "budget", "horizon", "nom", "telephone", "email"];

function validerDonnees(d: Record<string, string>): Record<string, string> {
  const erreurs: Record<string, string> = {};
  if (!d.nature) {
    erreurs.nature = "Choisissez la nature du projet.";
  }
  if (!d.budget) {
    erreurs.budget = "Choisissez une tranche de budget.";
  }
  if (!d.horizon) {
    erreurs.horizon = "Choisissez un horizon.";
  }
  if (!d.nom?.trim()) {
    erreurs.nom = "Indiquez votre nom.";
  }
  if (!d.telephone?.trim()) {
    erreurs.telephone = "Indiquez un numéro de téléphone.";
  }
  if (!d.email?.trim()) {
    erreurs.email = "Indiquez votre email.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) {
    erreurs.email = "Cet email ne semble pas valide.";
  }
  return erreurs;
}

// Récapitulatif complet, affiché à l'écran et copié tel quel.
function lignesRecap(d: Record<string, string>): string[] {
  return [
    `Nature du projet : ${labelDe(NATURES, d.nature ?? "")}`,
    d.type_recherche ? `Type recherché : ${d.type_recherche}` : null,
    `Budget : ${labelDe(BUDGETS, d.budget ?? "")}`,
    `Horizon : ${labelDe(HORIZONS, d.horizon ?? "")}`,
    `Nom : ${d.nom ?? ""}`,
    `Téléphone : ${d.telephone ?? ""}`,
    `Email : ${d.email ?? ""}`,
    d.annonce ? `Annonce concernée : ${d.annonce}` : null,
    d.message?.trim() ? `Message : ${d.message.trim()}` : null,
  ].filter((l): l is string => l !== null);
}

// mailto compacté : mêmes lignes courtes, message tronqué au besoin
// pour rester sous 1800 caractères d'URL (les handlers mail tronquent
// souvent au-delà de ~2000) ; le récapitulatif complet reste à
// l'écran pour la copie.
function mailtoCompact(d: Record<string, string>, email: string): string {
  const sujet = `Projet : ${labelDe(NATURES, d.nature ?? "")} (${labelDe(BUDGETS, d.budget ?? "")})`;
  const base = lignesRecap(d).filter((l) => !l.startsWith("Message :"));
  const construire = (message: string) =>
    `mailto:${email}?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(
      [...base, message ? `Message : ${message}` : null]
        .filter(Boolean)
        .join("\n")
    )}`;
  let message = d.message?.trim() ?? "";
  let url = construire(message);
  while (url.length > 1800 && message.length > 0) {
    message = message.slice(0, Math.max(0, message.length - 80)).trimEnd();
    url = construire(message ? `${message}…` : "");
  }
  return url;
}

export default function ProjetForm({
  modeAuto,
  emailContact,
  annonce,
  cleTurnstile,
}: {
  modeAuto: boolean;
  emailContact: string;
  annonce?: string;
  cleTurnstile?: string;
}) {
  const [statut, setStatut] = useState<Statut>("repos");
  const [etape, setEtape] = useState<Etape>("saisie");
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [donnees, setDonnees] = useState<Record<string, string> | null>(null);
  const [copie, setCopie] = useState<Copie>("repos");
  const [monteA] = useState(() => Date.now());

  // Widget Turnstile optionnel (désactivé sans clé publique).
  useEffect(() => {
    if (!cleTurnstile) {
      return;
    }
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    script.async = true;
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, [cleTurnstile]);

  function donneesDuFormulaire(form: HTMLFormElement): Record<string, string> {
    const d: Record<string, string> = { horodatage: String(monteA) };
    new FormData(form).forEach((valeur, cle) => {
      if (typeof valeur === "string") {
        d[cle] = valeur;
      }
    });
    return d;
  }

  async function envoyer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = donneesDuFormulaire(e.currentTarget);

    // Validation visible : message sous chaque champ requis manquant,
    // focus sur la première erreur (retours V3, W1d).
    const erreursValidation = validerDonnees(d);
    if (Object.keys(erreursValidation).length > 0) {
      setErreurs(erreursValidation);
      const premier = ORDRE_CHAMPS.find((c) => erreursValidation[c]);
      if (premier) {
        document.getElementById(premier)?.focus();
      }
      return;
    }
    setErreurs({});

    if (!modeAuto) {
      setDonnees(d);
      setCopie("repos");
      setEtape("confirmation");
      return;
    }

    setStatut("envoi");
    try {
      const reponse = await fetch("/api/projet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(d),
      });
      setStatut(reponse.ok ? "ok" : "erreur");
    } catch {
      setStatut("erreur");
    }
  }

  async function copierRecap() {
    if (!donnees) {
      return;
    }
    try {
      await navigator.clipboard.writeText(lignesRecap(donnees).join("\n"));
      setCopie("ok");
    } catch {
      setCopie("echec");
    }
  }

  if (statut === "ok" && modeAuto) {
    return (
      <p role="status" className="rounded bg-ecume p-4 font-medium text-marine">
        Merci, votre projet est bien transmis. Nous revenons vers vous
        rapidement.
      </p>
    );
  }

  // Aide au rendu d'un champ en erreur.
  const classeDe = (champ: string) => (erreurs[champ] ? CHAMP_ERREUR : CHAMP);
  const ariaDe = (champ: string) =>
    erreurs[champ]
      ? { "aria-invalid": true as const, "aria-describedby": `erreur-${champ}` }
      : {};
  const messageErreur = (champ: string) =>
    erreurs[champ] ? (
      <p id={`erreur-${champ}`} className="mt-1 text-sm font-medium text-red-700">
        {erreurs[champ]}
      </p>
    ) : null;

  return (
    <div>
      {etape === "confirmation" && donnees && (
        <section aria-labelledby="confirmation-titre">
          <h2
            id="confirmation-titre"
            className="text-display-s font-semibold text-marine"
          >
            Votre message est prêt
          </h2>
          <p className="mt-2 leading-relaxed text-encre/80">
            {typoFr(
              "Vérifiez le récapitulatif, puis envoyez-le par le canal de votre choix :"
            )}
          </p>
          <div className="mt-4 whitespace-pre-line rounded-lg bg-ecume p-4 text-sm leading-relaxed text-encre/90">
            {typoFr(lignesRecap(donnees).join("\n"))}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <a href={mailtoCompact(donnees, emailContact)} className={BOUTON_PLEIN}>
              Ouvrir dans votre messagerie
            </a>
            <button type="button" onClick={copierRecap} className={BOUTON_BORD}>
              Copier le message
            </button>
            <button
              type="button"
              onClick={() => setEtape("saisie")}
              className={BOUTON_BORD}
            >
              Modifier ma saisie
            </button>
          </div>
          <p role="status" className="mt-3 min-h-5 text-sm font-medium text-marine">
            {copie === "ok" &&
              typoFr("Message copié. Collez-le dans un email vers l'adresse ci-dessous.")}
            {copie === "echec" &&
              typoFr(
                "Copie automatique impossible : sélectionnez le récapitulatif ci-dessus pour le copier."
              )}
          </p>
          <p className="mt-2 leading-relaxed text-encre/80">
            {typoFr("Ou contactez-nous directement : ")}
            <a
              href={`mailto:${emailContact}`}
              className="font-semibold text-azur-2 hover:underline"
            >
              {emailContact}
            </a>
            {typoFr(" ou par téléphone ")}
            <a
              href={`tel:${SITE.telephoneMobileHref}`}
              className="sonde font-semibold text-azur-2 hover:underline"
            >
              {SITE.telephoneMobile}
            </a>
            .
          </p>
        </section>
      )}

      <form
        onSubmit={envoyer}
        noValidate
        className={etape === "confirmation" ? "hidden" : "space-y-4"}
      >
        {annonce && <input type="hidden" name="annonce" value={annonce} />}
        {/* Honeypot anti-spam : champ invisible, doit rester vide. */}
        <div className="hidden" aria-hidden="true">
          <label htmlFor="societe">Société</label>
          <input id="societe" name="societe" type="text" tabIndex={-1} autoComplete="off" />
        </div>

        <div>
          <label htmlFor="nature" className={LIBELLE}>
            Nature du projet
          </label>
          <select id="nature" name="nature" required className={classeDe("nature")} {...ariaDe("nature")}>
            {NATURES.map((o) => (
              <option key={o.valeur} value={o.valeur}>
                {o.label}
              </option>
            ))}
          </select>
          {messageErreur("nature")}
        </div>
        <div>
          <label htmlFor="type_recherche" className={LIBELLE}>
            Type de bateau recherché (optionnel)
          </label>
          <input
            id="type_recherche"
            name="type_recherche"
            type="text"
            maxLength={120}
            placeholder="Vedette 10 à 12 m, flybridge…"
            className={CHAMP}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="budget" className={LIBELLE}>
              Tranche de budget
            </label>
            <select id="budget" name="budget" required className={classeDe("budget")} {...ariaDe("budget")}>
              {BUDGETS.map((o) => (
                <option key={o.valeur} value={o.valeur}>
                  {o.label}
                </option>
              ))}
            </select>
            {messageErreur("budget")}
          </div>
          <div>
            <label htmlFor="horizon" className={LIBELLE}>
              Horizon
            </label>
            <select id="horizon" name="horizon" required className={classeDe("horizon")} {...ariaDe("horizon")}>
              {HORIZONS.map((o) => (
                <option key={o.valeur} value={o.valeur}>
                  {o.label}
                </option>
              ))}
            </select>
            {messageErreur("horizon")}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="nom" className={LIBELLE}>
              Nom
            </label>
            <input id="nom" name="nom" type="text" required maxLength={120} autoComplete="name" className={classeDe("nom")} {...ariaDe("nom")} />
            {messageErreur("nom")}
          </div>
          <div>
            <label htmlFor="telephone" className={LIBELLE}>
              Téléphone
            </label>
            <input id="telephone" name="telephone" type="tel" required maxLength={30} autoComplete="tel" className={classeDe("telephone")} {...ariaDe("telephone")} />
            {messageErreur("telephone")}
          </div>
        </div>
        <div>
          <label htmlFor="email" className={LIBELLE}>
            Email
          </label>
          <input id="email" name="email" type="email" required maxLength={254} autoComplete="email" className={classeDe("email")} {...ariaDe("email")} />
          {messageErreur("email")}
        </div>
        <div>
          <label htmlFor="message" className={LIBELLE}>
            Message (optionnel)
          </label>
          <textarea id="message" name="message" rows={4} maxLength={4000} className={CHAMP} />
        </div>

        {cleTurnstile && (
          <div className="cf-turnstile" data-sitekey={cleTurnstile} />
        )}

        {statut === "erreur" && (
          <p role="alert" className="text-sm font-medium text-red-700">
            L&apos;envoi a échoué. Merci de réessayer ou de nous appeler
            directement.
          </p>
        )}
        <button
          type="submit"
          disabled={statut === "envoi"}
          className="rounded bg-azur-2 px-6 py-3 font-semibold text-white hover:bg-marine disabled:opacity-60"
        >
          {modeAuto
            ? statut === "envoi"
              ? "Envoi en cours…"
              : "Envoyer mon projet"
            : "Préparer mon message"}
        </button>
        <p className="text-xs leading-relaxed text-encre/70">
          Ces informations servent uniquement à répondre à votre demande.
          Destinataire : Nauticea Yachting, aucune cession à des tiers,
          suppression sur simple demande. Détails dans les{" "}
          <Link href="/mentions-legales" className="underline hover:text-azur-2">
            mentions légales
          </Link>
          .
        </p>
      </form>
    </div>
  );
}
