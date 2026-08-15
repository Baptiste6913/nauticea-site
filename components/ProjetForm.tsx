"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BUDGETS, HORIZONS, NATURES, labelDe } from "@/lib/projet";

// Formulaire de conversion « Votre projet » (directive finale W3).
// Mode automatique (RESEND_API_KEY posée côté serveur) : envoi via
// /api/projet. Mode dégradé (par défaut) : le bouton compose un mailto
// vers l'email de contact avec toutes les réponses dans le corps ; le
// lead part du client mail du prospect, zéro backend.

type Statut = "repos" | "envoi" | "ok" | "erreur";

const CHAMP = "mt-1 w-full rounded border border-encre/20 bg-white px-3 py-2";
const LIBELLE = "block text-sm font-medium";

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
  const [monteA] = useState(() => Date.now());
  const formRef = useRef<HTMLFormElement>(null);

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
    const donnees = donneesDuFormulaire(e.currentTarget);

    if (!modeAuto) {
      const lignes = [
        `Nature du projet : ${labelDe(NATURES, donnees.nature ?? "")}`,
        donnees.type_recherche ? `Type recherché : ${donnees.type_recherche}` : null,
        `Budget : ${labelDe(BUDGETS, donnees.budget ?? "")}`,
        `Horizon : ${labelDe(HORIZONS, donnees.horizon ?? "")}`,
        `Nom : ${donnees.nom ?? ""}`,
        `Téléphone : ${donnees.telephone ?? ""}`,
        `Email : ${donnees.email ?? ""}`,
        donnees.annonce ? `Annonce concernée : ${donnees.annonce}` : null,
        donnees.message ? `\n${donnees.message}` : null,
      ].filter((l): l is string => l !== null);
      const sujet = `Projet : ${labelDe(NATURES, donnees.nature ?? "")} (${labelDe(BUDGETS, donnees.budget ?? "")})`;
      window.location.href = `mailto:${emailContact}?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(lignes.join("\n"))}`;
      setStatut("ok");
      return;
    }

    setStatut("envoi");
    try {
      const reponse = await fetch("/api/projet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(donnees),
      });
      setStatut(reponse.ok ? "ok" : "erreur");
    } catch {
      setStatut("erreur");
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

  return (
    <form ref={formRef} onSubmit={envoyer} className="space-y-4">
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
        <select id="nature" name="nature" required className={CHAMP}>
          {NATURES.map((o) => (
            <option key={o.valeur} value={o.valeur}>
              {o.label}
            </option>
          ))}
        </select>
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
          <select id="budget" name="budget" required className={CHAMP}>
            {BUDGETS.map((o) => (
              <option key={o.valeur} value={o.valeur}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="horizon" className={LIBELLE}>
            Horizon
          </label>
          <select id="horizon" name="horizon" required className={CHAMP}>
            {HORIZONS.map((o) => (
              <option key={o.valeur} value={o.valeur}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="nom" className={LIBELLE}>
            Nom
          </label>
          <input id="nom" name="nom" type="text" required maxLength={120} autoComplete="name" className={CHAMP} />
        </div>
        <div>
          <label htmlFor="telephone" className={LIBELLE}>
            Téléphone
          </label>
          <input id="telephone" name="telephone" type="tel" required maxLength={30} autoComplete="tel" className={CHAMP} />
        </div>
      </div>
      <div>
        <label htmlFor="email" className={LIBELLE}>
          Email
        </label>
        <input id="email" name="email" type="email" required maxLength={254} autoComplete="email" className={CHAMP} />
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
          : "Envoyer par email"}
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
  );
}
