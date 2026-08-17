"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Surface from "@/components/da/Surface";
import { typoFr } from "@/lib/format";

// Écran unique de l'espace de gestion, pensé pour un non-technicien : une
// liste de bateaux, un bouton de dépôt de fiche, et trois gestes par
// bateau. Aucune donnée bateau n'est saisie ici : chaque geste part vers
// le dépôt de code et revient sous forme de demande de fusion à relire.
//
// Le vocabulaire de l'interface est celui du métier, pas celui du code :
// « fiche », « bateau vendu », « retirer l'annonce », jamais « slug »,
// « branche » ni « workflow ».

const CHAMP = "mt-1 w-full rounded border border-encre/20 bg-white px-3 py-2";
const BOUTON_PLEIN =
  "inline-block rounded bg-azur-2 px-4 py-2 text-sm font-semibold text-white hover:bg-marine disabled:opacity-60";
const BOUTON_BORD =
  "inline-block rounded border border-marine px-3 py-1.5 text-sm font-semibold text-marine hover:bg-ecume disabled:opacity-60";

interface AnnonceGestion {
  slug: string;
  titre: string;
  prix: string;
  etat: string;
  vendu: boolean;
  photo: string | null;
}

type EtatSession = "chargement" | "absente" | "connectee" | "indisponible";

const ETIQUETTES_ETAT: Record<string, string> = {
  neuf: "Neuf",
  occasion: "Occasion",
};

export default function EspaceGestion() {
  const [session, setSession] = useState<EtatSession>("chargement");
  const [email, setEmail] = useState("");
  const [messageLien, setMessageLien] = useState("");
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  // Horodatage de montage, comparé côté serveur au délai minimal
  // d'humanité. Posé à l'initialisation de l'état plutôt que dans un
  // effet, pour ne pas déclencher un rendu de plus.
  const [horodatage] = useState(() => Date.now());
  const [annonces, setAnnonces] = useState<AnnonceGestion[]>([]);
  const [journal, setJournal] = useState<string[]>([]);
  const [occupe, setOccupe] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{ slug: string; action: string } | null>(
    null
  );

  const noter = useCallback((texte: string) => {
    setJournal((precedent) => [texte, ...precedent].slice(0, 6));
  }, []);

  // Un seul effet au montage : état de session puis, si elle est ouverte,
  // liste des bateaux. La liste ne se recharge pas après un geste, et
  // c'est voulu : rien n'a encore changé en ligne, tout attend la
  // relecture de la demande de fusion.
  useEffect(() => {
    void (async () => {
      let connecte = false;
      try {
        const r = await fetch("/api/gestion/session", { cache: "no-store" });
        const d = (await r.json()) as { connecte?: boolean; disponible?: boolean };
        if (d.disponible === false) {
          setSession("indisponible");
          return;
        }
        connecte = d.connecte === true;
        setSession(connecte ? "connectee" : "absente");
      } catch {
        setSession("absente");
        return;
      }
      if (!connecte) {
        return;
      }
      try {
        const r = await fetch("/api/gestion/annonces", { cache: "no-store" });
        if (r.status === 401) {
          setSession("absente");
          return;
        }
        const d = (await r.json()) as { annonces?: AnnonceGestion[] };
        setAnnonces(d.annonces ?? []);
      } catch {
        noter("La liste des bateaux n'a pas pu être chargée. Rechargez la page.");
      }
    })();
  }, [noter]);

  async function demanderLien(evenement: React.FormEvent) {
    evenement.preventDefault();
    setEnvoiEnCours(true);
    setMessageLien("");
    try {
      const r = await fetch("/api/gestion/lien", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, horodatage, societe: "" }),
      });
      const d = (await r.json()) as { message?: string; erreur?: string };
      setMessageLien(
        d.message ??
          d.erreur ??
          "Demande envoyée. Vérifiez votre boîte de réception."
      );
    } catch {
      setMessageLien("La demande n'a pas abouti. Réessayez dans un instant.");
    } finally {
      setEnvoiEnCours(false);
    }
  }

  async function deconnecter() {
    await fetch("/api/gestion/session", { method: "DELETE" });
    setSession("absente");
    setAnnonces([]);
  }

  async function envoyerFiche(fichier: File, slug?: string) {
    setOccupe(slug ?? "depot");
    try {
      const corps = new FormData();
      corps.set("fiche", fichier);
      const url = slug
        ? `/api/gestion/depot?annonce=${encodeURIComponent(slug)}`
        : "/api/gestion/depot";
      const r = await fetch(url, { method: "POST", body: corps });
      const d = (await r.json()) as { message?: string; erreur?: string };
      if (r.status === 401) {
        setSession("absente");
        return;
      }
      noter(d.message ?? d.erreur ?? "Réponse inattendue.");
    } catch {
      noter("Le dépôt n'a pas abouti. Réessayez dans un instant.");
    } finally {
      setOccupe(null);
    }
  }

  async function agir(slug: string, action: string) {
    setOccupe(slug);
    setConfirmation(null);
    try {
      const r = await fetch("/api/gestion/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, action }),
      });
      const d = (await r.json()) as { message?: string; erreur?: string };
      if (r.status === 401) {
        setSession("absente");
        return;
      }
      noter(d.message ?? d.erreur ?? "Réponse inattendue.");
    } catch {
      noter("La demande n'a pas abouti. Réessayez dans un instant.");
    } finally {
      setOccupe(null);
    }
  }

  if (session === "chargement") {
    return (
      <p className="mx-auto max-w-2xl px-4 py-16 text-encre/70">Chargement...</p>
    );
  }

  if (session === "indisponible") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <h1 className="text-display-l font-bold text-marine">Espace de gestion</h1>
        <p className="mt-4 text-encre/80">
          {typoFr(
            "Cet espace n'est pas encore activé. Il le sera dès que les réglages d'accès auront été posés."
          )}
        </p>
      </div>
    );
  }

  if (session === "absente") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <h1 className="text-display-l font-bold text-marine">Espace de gestion</h1>
        <p className="mt-3 text-encre/80">
          {typoFr(
            "Entrez votre adresse : vous recevrez un lien de connexion, valable 15 minutes."
          )}
        </p>
        <Surface niveau="flotte" className="mt-6 rounded-lg bg-ecume p-5">
          <form onSubmit={demanderLien}>
            <label className="block text-sm font-medium" htmlFor="email-gestion">
              Votre adresse électronique
            </label>
            <input
              id="email-gestion"
              className={CHAMP}
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {/* Champ leurre : invisible pour une personne, rempli par les
                robots, qui reçoivent alors la même réponse sans envoi. */}
            <div className="hidden" aria-hidden="true">
              <label htmlFor="societe-gestion">Société</label>
              <input id="societe-gestion" name="societe" tabIndex={-1} />
            </div>
            <button className={`${BOUTON_PLEIN} mt-4`} type="submit" disabled={envoiEnCours}>
              {envoiEnCours ? "Envoi..." : "Recevoir mon lien"}
            </button>
          </form>
          {messageLien !== "" && (
            <p className="mt-4 text-sm text-encre/80" role="status">
              {typoFr(messageLien)}
            </p>
          )}
        </Surface>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-display-l font-bold text-marine">Espace de gestion</h1>
        <button className={BOUTON_BORD} type="button" onClick={deconnecter}>
          Se déconnecter
        </button>
      </div>
      <p className="mt-3 max-w-2xl text-encre/80">
        {typoFr(
          "Chaque geste part vers le dépôt et revient sous forme de proposition à relire. Rien ne part en ligne sans votre relecture."
        )}
      </p>

      {journal.length > 0 && (
        <Surface niveau="flotte" className="mt-6 rounded-lg bg-ecume p-4">
          <ul
            className="list-none space-y-1 p-0 text-sm text-encre/90"
            role="status"
          >
            {journal.map((ligne, index) => (
              <li key={`${ligne}-${index}`}>{typoFr(ligne)}</li>
            ))}
          </ul>
        </Surface>
      )}

      <section className="mt-8">
        <h2 className="text-display-m font-semibold text-marine">Ajouter un bateau</h2>
        <p className="mt-2 max-w-2xl text-sm text-encre/80">
          {typoFr(
            "Exportez la fiche PDF depuis BoatWizard, puis déposez-la ici. Le bateau est reconnu tout seul s'il est déjà en ligne."
          )}
        </p>
        <ZoneDepot
          occupe={occupe === "depot"}
          identifiant="depot-general"
          libelle="Choisir une fiche PDF"
          onFichier={(f) => void envoyerFiche(f)}
        />
      </section>

      <section className="mt-12">
        <h2 className="text-display-m font-semibold text-marine">
          {`Bateaux en ligne (${annonces.length})`}
        </h2>
        <ul className="mt-4 list-none space-y-3 p-0">
          {annonces.map((a) => (
            <li key={a.slug}>
              <Surface
                niveau="affleure"
                className="rounded-lg border border-encre/10 bg-white p-3"
              >
                <div className="flex flex-wrap items-center gap-4">
                  <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded bg-ecume">
                    {a.photo && (
                      <Image
                        src={a.photo}
                        alt=""
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-48 grow">
                    <p className="font-semibold text-marine">{a.titre}</p>
                    <p className="mt-0.5 text-sm text-encre/70">
                      {`${ETIQUETTES_ETAT[a.etat] ?? "État sur demande"} · ${a.prix}`}
                      {a.vendu ? " · Vendu" : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {a.vendu ? (
                      <button
                        className={BOUTON_BORD}
                        type="button"
                        disabled={occupe === a.slug}
                        onClick={() => setConfirmation({ slug: a.slug, action: "disponible" })}
                      >
                        Remettre en vente
                      </button>
                    ) : (
                      <button
                        className={BOUTON_BORD}
                        type="button"
                        disabled={occupe === a.slug}
                        onClick={() => setConfirmation({ slug: a.slug, action: "vendu" })}
                      >
                        Marquer vendu
                      </button>
                    )}
                    <button
                      className={BOUTON_BORD}
                      type="button"
                      disabled={occupe === a.slug}
                      onClick={() => setConfirmation({ slug: a.slug, action: "retirer" })}
                    >
                      Retirer
                    </button>
                    <ZoneDepot
                      occupe={occupe === a.slug}
                      identifiant={`depot-${a.slug}`}
                      libelle="Remplacer la fiche"
                      compact
                      onFichier={(f) => void envoyerFiche(f, a.slug)}
                    />
                  </div>
                </div>
                {confirmation?.slug === a.slug && (
                  <Confirmation
                    action={confirmation.action}
                    titre={a.titre}
                    onAnnuler={() => setConfirmation(null)}
                    onValider={() => void agir(a.slug, confirmation.action)}
                  />
                )}
              </Surface>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function ZoneDepot({
  identifiant,
  libelle,
  occupe,
  compact = false,
  onFichier,
}: {
  identifiant: string;
  libelle: string;
  occupe: boolean;
  compact?: boolean;
  onFichier: (fichier: File) => void;
}) {
  return (
    <div className={compact ? "" : "mt-4"}>
      <label
        className={compact ? BOUTON_BORD : `${BOUTON_PLEIN} cursor-pointer`}
        htmlFor={identifiant}
      >
        {occupe ? "Envoi..." : libelle}
      </label>
      <input
        id={identifiant}
        className="sr-only"
        type="file"
        accept="application/pdf,.pdf"
        disabled={occupe}
        onChange={(e) => {
          const fichier = e.target.files?.[0];
          // Le champ est vidé pour qu'un même fichier redéposé déclenche
          // bien un nouvel envoi.
          e.target.value = "";
          if (fichier) {
            onFichier(fichier);
          }
        }}
      />
    </div>
  );
}

const PHRASES_CONFIRMATION: Record<string, string> = {
  vendu:
    "Le bateau sera marqué vendu. Son annonce reste en ligne, avec un bandeau « Vendu ».",
  disponible: "Le bateau repassera en vente, sans bandeau.",
  retirer:
    "L'annonce et ses photos seront retirées du site. Son ancienne adresse renverra vers la liste des bateaux.",
};

function Confirmation({
  action,
  titre,
  onAnnuler,
  onValider,
}: {
  action: string;
  titre: string;
  onAnnuler: () => void;
  onValider: () => void;
}) {
  return (
    <div className="mt-3 border-l-2 border-azur bg-ecume p-3">
      <p className="text-sm text-encre/90">
        {typoFr(`${titre} : ${PHRASES_CONFIRMATION[action] ?? ""}`)}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button className={BOUTON_PLEIN} type="button" onClick={onValider}>
          Confirmer
        </button>
        <button className={BOUTON_BORD} type="button" onClick={onAnnuler}>
          Annuler
        </button>
      </div>
    </div>
  );
}
