// Téléchargement borné, utilisé par la synchronisation du flux Boats
// Group (durcissement du 17/08). Trois bornes : durée, taille, et refus
// de tout ce qui n'est pas une réponse 2xx. Aucune exception ne remonte :
// un échec est une valeur de retour, pour qu'une photo manquante ne fasse
// jamais échouer la synchronisation entière.

/** Taille maximale d'une image (corpus réel : 578 Ko au maximum). */
export const TAILLE_MAX_IMAGE = 5 * 1024 * 1024;

/** Délai maximal d'un téléchargement d'image. */
export const DELAI_MAX_MS = 15_000;

export type Resultat =
  | { ok: true; octets: Uint8Array }
  | { ok: false; erreur: string };

export interface Options {
  /** Injectable pour les tests ; `fetch` global par défaut. */
  fetchImpl?: typeof fetch;
  tailleMax?: number;
  delaiMs?: number;
}

export async function telechargerBorne(
  url: string,
  options: Options = {}
): Promise<Resultat> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const tailleMax = options.tailleMax ?? TAILLE_MAX_IMAGE;
  const delaiMs = options.delaiMs ?? DELAI_MAX_MS;

  try {
    const reponse = await fetchImpl(url, {
      signal: AbortSignal.timeout(delaiMs),
      redirect: "follow",
    });

    if (!reponse.ok) {
      return { ok: false, erreur: `statut ${reponse.status}` };
    }

    // Refus immédiat si la taille annoncée dépasse la borne : inutile de
    // lire le corps.
    const annoncee = Number(reponse.headers.get("content-length"));
    if (Number.isFinite(annoncee) && annoncee > tailleMax) {
      return {
        ok: false,
        erreur: `taille annoncée ${annoncee} octets au-dessus de la borne ${tailleMax}`,
      };
    }

    // Une taille absente ou mensongère est rattrapée en comptant les
    // octets réellement reçus, et en coupant la lecture au dépassement.
    if (!reponse.body) {
      return { ok: false, erreur: "corps de réponse absent" };
    }
    const lecteur = reponse.body.getReader();
    const morceaux: Uint8Array[] = [];
    let recus = 0;
    for (;;) {
      const { done, value } = await lecteur.read();
      if (done) {
        break;
      }
      recus += value.byteLength;
      if (recus > tailleMax) {
        await lecteur.cancel();
        return {
          ok: false,
          erreur: `flux au-dessus de la borne ${tailleMax} octets`,
        };
      }
      morceaux.push(value);
    }

    const octets = new Uint8Array(recus);
    let position = 0;
    for (const m of morceaux) {
      octets.set(m, position);
      position += m.byteLength;
    }
    if (octets.byteLength === 0) {
      return { ok: false, erreur: "réponse vide" };
    }
    return { ok: true, octets };
  } catch (e) {
    const nom = e instanceof Error ? e.name : "Erreur";
    const message = e instanceof Error ? e.message : String(e);
    // AbortError : le délai maximal a été atteint.
    return {
      ok: false,
      erreur: nom === "TimeoutError" || nom === "AbortError"
        ? `délai de ${delaiMs} ms dépassé`
        : `${nom} : ${message.slice(0, 80)}`,
    };
  }
}
