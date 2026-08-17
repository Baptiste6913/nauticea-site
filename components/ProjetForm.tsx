"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BUDGETS,
  HORIZONS,
  NATURES,
  TYPES_RECHERCHE,
  lignesRecapProjet,
} from "@/lib/projet";
import { SITE } from "@/lib/site";
import { typoFr } from "@/lib/format";

// Formulaire de conversion « Votre projet » (directive finale W3,
// parcours fiabilisé aux retours V3 puis V4 du 16/08).
// Étape de confirmation dans les deux modes : champs structurés en
// récapitulatif (libellés humains uniquement), message libre éditable.
// Mode automatique (variables Resend posées côté serveur, détection
// serveur dans app/projet/page.tsx) : bouton primaire « Envoyer ma
// demande » vers /api/projet, canaux de secours visibles en échec.
// Mode dégradé : trois canaux (mailto compacté sous 1800 caractères,
// copie avec feedback, coordonnées en clair).

type Statut = "repos" | "envoi" | "ok" | "erreur";
type Etape = "saisie" | "confirmation";
type Copie = "repos" | "ok" | "echec";

const CHAMP = "mt-1 w-full rounded border border-encre/20 bg-white px-3 py-2";
const CHAMP_ERREUR =
  "mt-1 w-full rounded border-2 border-red-700 bg-white px-3 py-2";
const LIBELLE = "block text-sm font-medium";
const BOUTON_PLEIN =
  "inline-block rounded bg-azur-2 px-5 py-2.5 font-semibold text-white hover:bg-marine disabled:opacity-60";
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

// mailto compacté : mêmes lignes courtes, message tronqué au besoin
// pour rester sous 1800 caractères d'URL (les handlers mail tronquent
// souvent au-delà de ~2000) ; le récapitulatif complet reste à
// l'écran pour la copie.
function mailtoCompact(d: Record<string, string>, email: string): string {
  const sujet = `Projet : ${lignesRecapProjet(d)[0].replace("Nature du projet : ", "")}`;
  const base = lignesRecapProjet({ ...d, message: "" });
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
  // Message libre : éditable jusque dans la confirmation (retours V4).
  const [message, setMessage] = useState("");
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

  function preparer(e: React.FormEvent<HTMLFormElement>) {
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
    setDonnees(d);
    setCopie("repos");
    setStatut("repos");
    setEtape("confirmation");
  }

  // Données effectivement envoyées : libellés côté rendu, message édité.
  const donneesFinales = donnees ? { ...donnees, message } : null;

  async function envoyerApi() {
    if (!donneesFinales) {
      return;
    }
    setStatut("envoi");
    try {
      const reponse = await fetch("/api/projet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(donneesFinales),
      });
      setStatut(reponse.ok ? "ok" : "erreur");
    } catch {
      setStatut("erreur");
    }
  }

  async function copierRecap() {
    if (!donneesFinales) {
      return;
    }
    try {
      await navigator.clipboard.writeText(
        lignesRecapProjet(donneesFinales).join("\n")
      );
      setCopie("ok");
    } catch {
      setCopie("echec");
    }
  }

  if (statut === "ok" && modeAuto) {
    return (
      <div role="status" className="rounded bg-ecume p-5">
        <p className="font-medium text-marine">
          Votre demande est envoyée, nous revenons vers vous rapidement.
        </p>
        <p className="mt-3 text-sm text-encre/80">
          {typoFr("Besoin d'une réponse immédiate ? ")}
          <a
            href={`tel:${SITE.telephoneMobileHref}`}
            className="sonde font-semibold text-azur-2 hover:underline"
          >
            {typoFr(`${SITE.responsable} : ${SITE.telephoneMobile}`)}
          </a>
        </p>
      </div>
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

  // Canaux de secours du mode dégradé, réutilisés en cas d'échec API.
  const canauxSecours = donneesFinales && (
    <>
      <div className="mt-5 flex flex-wrap gap-3">
        <a
          href={mailtoCompact(donneesFinales, emailContact)}
          className={modeAuto ? BOUTON_BORD : BOUTON_PLEIN}
        >
          Ouvrir dans votre messagerie
        </a>
        <button type="button" onClick={copierRecap} className={BOUTON_BORD}>
          Copier le message
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
    </>
  );

  return (
    <div>
      {etape === "confirmation" && donneesFinales && (
        <section aria-labelledby="confirmation-titre">
          <h2
            id="confirmation-titre"
            className="text-display-s font-semibold text-marine"
          >
            {modeAuto ? "Vérifiez votre demande" : "Votre message est prêt"}
          </h2>
          <p className="mt-2 leading-relaxed text-encre/80">
            {typoFr(
              modeAuto
                ? "Relisez le récapitulatif, ajustez le message si besoin, puis envoyez :"
                : "Vérifiez le récapitulatif, puis envoyez-le par le canal de votre choix :"
            )}
          </p>
          <div className="mt-4 whitespace-pre-line rounded-lg bg-ecume p-4 text-sm leading-relaxed text-encre/90">
            {typoFr(lignesRecapProjet({ ...donneesFinales, message: "" }).join("\n"))}
          </div>
          <div className="mt-4">
            <label htmlFor="message-final" className={LIBELLE}>
              Votre message (modifiable avant envoi)
            </label>
            <textarea
              id="message-final"
              rows={4}
              maxLength={4000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className={CHAMP}
            />
          </div>

          {modeAuto ? (
            <>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={envoyerApi}
                  disabled={statut === "envoi"}
                  className={BOUTON_PLEIN}
                >
                  {statut === "envoi" ? "Envoi en cours…" : "Envoyer ma demande"}
                </button>
                <button
                  type="button"
                  onClick={() => setEtape("saisie")}
                  className={BOUTON_BORD}
                >
                  Modifier ma saisie
                </button>
              </div>
              {statut === "erreur" && (
                <div className="mt-4 rounded border border-red-700/40 bg-white p-4">
                  <p role="alert" className="font-medium text-red-700">
                    {typoFr(
                      "L'envoi automatique a échoué. Votre saisie est conservée : utilisez un canal de secours ci-dessous."
                    )}
                  </p>
                  {canauxSecours}
                </div>
              )}
            </>
          ) : (
            <>
              {canauxSecours}
              <p className="mt-4">
                <button
                  type="button"
                  onClick={() => setEtape("saisie")}
                  className={BOUTON_BORD}
                >
                  Modifier ma saisie
                </button>
              </p>
            </>
          )}
        </section>
      )}

      <form
        onSubmit={preparer}
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
          <select id="type_recherche" name="type_recherche" className={CHAMP}>
            {TYPES_RECHERCHE.map((o) => (
              <option key={o.valeur} value={o.valeur}>
                {o.label}
              </option>
            ))}
          </select>
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
          <textarea
            id="message"
            name="message"
            rows={4}
            maxLength={4000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className={CHAMP}
          />
        </div>

        {cleTurnstile && (
          <div className="cf-turnstile" data-sitekey={cleTurnstile} />
        )}

        <button type="submit" className="rounded bg-azur-2 px-6 py-3 font-semibold text-white hover:bg-marine">
          {modeAuto ? "Vérifier ma demande" : "Préparer mon message"}
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
