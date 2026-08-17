// Authentification de l'espace de gestion : lien magique, sans base de
// données et sans dépendance nouvelle.
//
// Deux jetons, tous deux signés en HMAC-SHA256 avec SESSION_SECRET :
//
// 1. le jeton de lien, valable 15 minutes, à usage de connexion, envoyé
//    par courriel ;
// 2. le jeton de session, valable 7 jours, posé en cookie httpOnly.
//
// Il n'y a pas de révocation individuelle : sans base, la seule
// révocation possible est la rotation de SESSION_SECRET, qui invalide
// toutes les sessions. C'est un compromis assumé et documenté dans
// docs/GESTION.md, acceptable pour deux ou trois administrateurs.
import crypto from "node:crypto";

export const COOKIE_SESSION = "nauticea_gestion";
export const DUREE_LIEN_S = 15 * 60;
export const DUREE_SESSION_S = 7 * 24 * 60 * 60;

export type Usage = "lien" | "session";

export interface Charge {
  /** Adresse de l'administrateur, en minuscules. */
  email: string;
  usage: Usage;
  /** Date d'expiration, en secondes depuis l'époque. */
  exp: number;
}

function base64url(donnees: Buffer | string): string {
  return Buffer.from(donnees)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function depuisBase64url(texte: string): Buffer {
  return Buffer.from(texte.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function secret(): string | null {
  const valeur = process.env.SESSION_SECRET;
  // Un secret trop court ne protège rien : mieux vaut refuser de servir
  // l'espace que de le servir mal.
  return typeof valeur === "string" && valeur.length >= 32 ? valeur : null;
}

/** L'espace de gestion n'est servi que si sa configuration est complète. */
export function gestionConfiguree(): boolean {
  return secret() !== null && administrateurs().length > 0;
}

/** Administrateurs autorisés, depuis ADMIN_EMAILS séparés par des virgules. */
export function administrateurs(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes("@"));
}

export function estAdministrateur(email: string): boolean {
  return administrateurs().includes(email.trim().toLowerCase());
}

export function signer(charge: Omit<Charge, "exp">, dureeSecondes: number): string | null {
  const cle = secret();
  if (!cle) {
    return null;
  }
  const complete: Charge = {
    ...charge,
    email: charge.email.trim().toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + dureeSecondes,
  };
  const corps = base64url(JSON.stringify(complete));
  const signature = base64url(
    crypto.createHmac("sha256", cle).update(corps).digest()
  );
  return `${corps}.${signature}`;
}

/**
 * Vérifie un jeton. Rend null sur toute anomalie, sans distinguer les
 * causes : une signature fausse, une expiration, un usage inattendu ou une
 * adresse retirée de la liste donnent le même résultat.
 */
export function verifier(jeton: unknown, usage: Usage): Charge | null {
  const cle = secret();
  if (!cle || typeof jeton !== "string") {
    return null;
  }
  const separateur = jeton.lastIndexOf(".");
  if (separateur <= 0) {
    return null;
  }
  const corps = jeton.slice(0, separateur);
  const signature = jeton.slice(separateur + 1);
  const attendue = crypto.createHmac("sha256", cle).update(corps).digest();
  const fournie = depuisBase64url(signature);
  if (
    fournie.length !== attendue.length ||
    !crypto.timingSafeEqual(fournie, attendue)
  ) {
    return null;
  }
  let charge: Charge;
  try {
    charge = JSON.parse(depuisBase64url(corps).toString("utf-8")) as Charge;
  } catch {
    return null;
  }
  if (
    typeof charge?.email !== "string" ||
    charge.usage !== usage ||
    typeof charge.exp !== "number" ||
    charge.exp * 1000 < Date.now()
  ) {
    return null;
  }
  // Une adresse retirée d'ADMIN_EMAILS perd l'accès immédiatement, même
  // si son cookie court encore.
  if (!estAdministrateur(charge.email)) {
    return null;
  }
  return charge;
}

/**
 * Attributs du cookie de session, identiques à la pose et à la purge.
 * L'attribut Secure est posé en production ; il est paramétrable pour
 * rester vérifiable en test, puisque NODE_ENV n'est pas modifiable.
 */
export function cookieSession(
  valeur: string,
  dureeSecondes: number,
  secure = process.env.NODE_ENV === "production"
): string {
  const attributs = [
    `${COOKIE_SESSION}=${valeur}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${dureeSecondes}`,
  ];
  if (secure) {
    attributs.push("Secure");
  }
  return attributs.join("; ");
}

/** Lit le cookie de session dans l'en-tête brut d'une requête. */
export function jetonDeRequete(request: Request): string | null {
  const brut = request.headers.get("cookie");
  if (!brut) {
    return null;
  }
  for (const morceau of brut.split(";")) {
    const separateur = morceau.indexOf("=");
    if (separateur < 0) {
      continue;
    }
    if (morceau.slice(0, separateur).trim() === COOKIE_SESSION) {
      return morceau.slice(separateur + 1).trim();
    }
  }
  return null;
}

/**
 * Session valide d'une requête, ou null. C'est le contrôle unique que
 * chaque route de /api/gestion appelle en première ligne.
 */
export function sessionDeRequete(request: Request): Charge | null {
  return verifier(jetonDeRequete(request), "session");
}
