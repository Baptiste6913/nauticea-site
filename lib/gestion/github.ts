// Pont vers l'API GitHub pour l'espace de gestion.
//
// Le jeton GITHUB_GESTION_TOKEN vit uniquement côté serveur : il n'est
// jamais lu dans un composant client, jamais préfixé NEXT_PUBLIC, jamais
// rendu dans une réponse. Portée attendue, à créer en jeton à portée fine
// sur ce dépôt seulement : contents write, pull requests write, actions
// write.
//
// Aucun geste n'écrit sur la branche par défaut : un dépôt de fiche crée
// une branche, et les workflows existants font le reste, jusqu'à une
// demande de fusion relue par un humain.

export interface Reglage {
  jeton: string;
  proprietaire: string;
  depot: string;
}

export type Resultat<T> = { ok: true; valeur: T } | { ok: false; erreur: string };

const API = "https://api.github.com";

/** Configuration du pont, ou null si l'espace n'est pas branché. */
export function reglage(): Reglage | null {
  const jeton = process.env.GITHUB_GESTION_TOKEN;
  const complet = process.env.GITHUB_GESTION_REPO;
  if (!jeton || !complet || !complet.includes("/")) {
    return null;
  }
  const [proprietaire, depot] = complet.split("/", 2) as [string, string];
  return { jeton, proprietaire, depot };
}

async function appel<T>(
  config: Reglage,
  chemin: string,
  options: { methode?: string; corps?: unknown } = {}
): Promise<Resultat<T>> {
  try {
    const reponse = await fetch(`${API}/repos/${config.proprietaire}/${config.depot}${chemin}`, {
      method: options.methode ?? "GET",
      headers: {
        Authorization: `Bearer ${config.jeton}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: options.corps === undefined ? undefined : JSON.stringify(options.corps),
      signal: AbortSignal.timeout(20_000),
    });
    if (reponse.status === 204) {
      return { ok: true, valeur: undefined as T };
    }
    const texte = await reponse.text();
    if (!reponse.ok) {
      // Le message de GitHub est repris borné, sans jamais renvoyer
      // d'en-tête ni de jeton.
      return {
        ok: false,
        erreur: `GitHub a répondu ${reponse.status} : ${texte.slice(0, 200)}`,
      };
    }
    return { ok: true, valeur: (texte ? JSON.parse(texte) : undefined) as T };
  } catch (e) {
    const nom = e instanceof Error ? e.name : "Erreur";
    return { ok: false, erreur: `appel GitHub impossible (${nom})` };
  }
}

/** Branche par défaut du dépôt, jamais supposée. */
export async function brancheParDefaut(config: Reglage): Promise<Resultat<string>> {
  const r = await appel<{ default_branch?: string }>(config, "");
  if (!r.ok) {
    return r;
  }
  const nom = r.valeur.default_branch;
  return nom
    ? { ok: true, valeur: nom }
    : { ok: false, erreur: "branche par défaut introuvable" };
}

/**
 * Crée une branche depuis la branche par défaut, puis y ajoute la fiche.
 * Le workflow d'ingestion prend la suite tout seul, puisqu'il se déclenche
 * sur l'arrivée d'un PDF dans ingest/.
 */
export async function deposerFiche(
  config: Reglage,
  options: { branche: string; nomFichier: string; octets: Uint8Array; message: string }
): Promise<Resultat<{ branche: string; chemin: string }>> {
  const base = await brancheParDefaut(config);
  if (!base.ok) {
    return base;
  }
  const ref = await appel<{ object?: { sha?: string } }>(
    config,
    `/git/ref/heads/${encodeURIComponent(base.valeur)}`
  );
  if (!ref.ok) {
    return ref;
  }
  const sha = ref.valeur.object?.sha;
  if (!sha) {
    return { ok: false, erreur: "tête de la branche par défaut introuvable" };
  }
  const creation = await appel<unknown>(config, "/git/refs", {
    methode: "POST",
    corps: { ref: `refs/heads/${options.branche}`, sha },
  });
  if (!creation.ok) {
    return creation;
  }
  const chemin = `ingest/${options.nomFichier}`;
  const ecriture = await appel<unknown>(
    config,
    `/contents/${chemin.split("/").map(encodeURIComponent).join("/")}`,
    {
      methode: "PUT",
      corps: {
        message: options.message,
        content: Buffer.from(options.octets).toString("base64"),
        branch: options.branche,
      },
    }
  );
  if (!ecriture.ok) {
    return ecriture;
  }
  return { ok: true, valeur: { branche: options.branche, chemin } };
}

/** Déclenche gerer-annonce.yml sur la branche par défaut. */
export async function declencherCycle(
  config: Reglage,
  options: { slug: string; action: string }
): Promise<Resultat<{ branche: string }>> {
  const base = await brancheParDefaut(config);
  if (!base.ok) {
    return base;
  }
  const envoi = await appel<unknown>(
    config,
    "/actions/workflows/gerer-annonce.yml/dispatches",
    {
      methode: "POST",
      corps: {
        ref: base.valeur,
        inputs: { slug: options.slug, action: options.action },
      },
    }
  );
  if (!envoi.ok) {
    return envoi;
  }
  return { ok: true, valeur: { branche: base.valeur } };
}

/** Horodatage de branche, stable et trié : 2026-08-17-1530-42. */
export function horodatageBranche(date: Date): string {
  const p = (n: number, taille = 2): string => String(n).padStart(taille, "0");
  return [
    date.getUTCFullYear(),
    p(date.getUTCMonth() + 1),
    p(date.getUTCDate()),
    `${p(date.getUTCHours())}${p(date.getUTCMinutes())}`,
    p(date.getUTCSeconds()),
  ].join("-");
}

/**
 * Nom de fichier sûr pour une fiche déposée. Le workflow n'accepte que des
 * lettres, chiffres, points, tirets et espaces : on assainit ici plutôt
 * que de laisser l'ingestion refuser plus tard.
 */
export function nomFicheSur(nomOrigine: string, horodatage: string): string {
  const base = nomOrigine
    .replace(/\.pdf$/i, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 _-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-\s]+|[-\s]+$/g, "")
    .slice(0, 80);
  return `${horodatage}-${base === "" ? "fiche" : base}.pdf`;
}
