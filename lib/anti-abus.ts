// Anti-abus des routes de formulaire (directive finale W3) : limitation
// de débit par IP en fenêtre glissante, délai minimal de soumission,
// vérification Turnstile optionnelle. État en mémoire : par instance
// serverless, donc une borne réelle mais pas une garantie distribuée
// (compromis documenté dans le rapport).

const FENETRE_MS = 10 * 60 * 1000;
const MAX_REQUETES_PAR_FENETRE = 5;
const DELAI_MINIMAL_MS = 4000;
const MAX_HORODATAGE_FUTUR_MS = 5000;

const journalParIp = new Map<string, number[]>();

export function ipDeLaRequete(request: Request): string {
  const enTete =
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip") ??
    "inconnue";
  return enTete.split(",")[0].trim();
}

export function debitAutorise(ip: string): boolean {
  const maintenant = Date.now();
  const recents = (journalParIp.get(ip) ?? []).filter(
    (t) => maintenant - t < FENETRE_MS
  );
  if (recents.length >= MAX_REQUETES_PAR_FENETRE) {
    journalParIp.set(ip, recents);
    return false;
  }
  recents.push(maintenant);
  journalParIp.set(ip, recents);
  // Purge opportuniste pour borner la mémoire.
  if (journalParIp.size > 5000) {
    for (const [cle, valeurs] of journalParIp) {
      if (valeurs.every((t) => maintenant - t >= FENETRE_MS)) {
        journalParIp.delete(cle);
      }
    }
  }
  return true;
}

// Le formulaire pose un horodatage au montage ; une soumission plus
// rapide que le délai minimal (ou datée du futur) est traitée comme un
// robot.
export function delaiHumainRespecte(horodatage: unknown): boolean {
  const t = Number(horodatage);
  if (!Number.isFinite(t)) {
    return false;
  }
  const age = Date.now() - t;
  return age >= DELAI_MINIMAL_MS && age > -MAX_HORODATAGE_FUTUR_MS;
}

// Vérification Turnstile, active uniquement si TURNSTILE_SECRET_KEY est
// posée (désactivée par défaut).
export async function turnstileValide(jeton: unknown): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return true;
  }
  if (typeof jeton !== "string" || jeton.length === 0) {
    return false;
  }
  const reponse = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: jeton }),
    }
  );
  if (!reponse.ok) {
    return false;
  }
  const resultat = (await reponse.json()) as { success?: boolean };
  return resultat.success === true;
}

export function texteBorne(valeur: unknown, max: number): string | null {
  if (typeof valeur !== "string") {
    return null;
  }
  const propre = valeur.trim();
  return propre.length > 0 && propre.length <= max ? propre : null;
}

export function emailValide(valeur: unknown): string | null {
  const texte = texteBorne(valeur, 254);
  if (!texte || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(texte)) {
    return null;
  }
  return texte;
}
