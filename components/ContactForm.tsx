"use client";

import { useState } from "react";

type Statut = "repos" | "envoi" | "ok" | "erreur";

export default function ContactForm({ annonce }: { annonce?: string }) {
  const [statut, setStatut] = useState<Statut>("repos");

  async function envoyer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatut("envoi");
    const donnees = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const rep = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(donnees),
      });
      setStatut(rep.ok ? "ok" : "erreur");
    } catch {
      setStatut("erreur");
    }
  }

  if (statut === "ok") {
    return (
      <p role="status" className="rounded bg-ecume p-4 font-medium text-marine">
        Merci, votre message a bien été envoyé. Nous reviendrons vers vous dès
        que possible.
      </p>
    );
  }

  return (
    <form onSubmit={envoyer} className="space-y-4">
      {annonce && <input type="hidden" name="annonce" value={annonce} />}
      {/* Honeypot anti-spam : champ invisible, doit rester vide. */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="societe">Société</label>
        <input id="societe" name="societe" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <div>
        <label htmlFor="nom" className="block text-sm font-medium">
          Nom
        </label>
        <input
          id="nom"
          name="nom"
          type="text"
          required
          autoComplete="name"
          className="mt-1 w-full rounded border border-encre/20 px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-1 w-full rounded border border-encre/20 px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="telephone" className="block text-sm font-medium">
          Numéro de téléphone
        </label>
        <input
          id="telephone"
          name="telephone"
          type="tel"
          autoComplete="tel"
          className="mt-1 w-full rounded border border-encre/20 px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="message" className="block text-sm font-medium">
          Votre message
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={6}
          className="mt-1 w-full rounded border border-encre/20 px-3 py-2"
        />
      </div>
      <p className="text-xs leading-relaxed text-encre/60">
        Les données qui vous concernent sont confidentielles et seul Nauticea
        Yachting a le droit de les consulter. Vous disposez d&apos;un droit
        d&apos;accès, de modification, de rectification et de suppression des
        données qui vous concernent (loi « Informatique et Libertés » du
        6 janvier 1978). Pour l&apos;exercer, contactez-nous.
      </p>
      {statut === "erreur" && (
        <p role="alert" className="text-sm font-medium text-red-700">
          L&apos;envoi a échoué. Merci de réessayer ou de nous appeler
          directement.
        </p>
      )}
      <button
        type="submit"
        disabled={statut === "envoi"}
        className="rounded bg-marine px-6 py-2.5 font-semibold text-white hover:bg-marine-2 disabled:opacity-60"
      >
        {statut === "envoi" ? "Envoi en cours…" : "Envoyer"}
      </button>
    </form>
  );
}
