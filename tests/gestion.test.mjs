import test from "node:test";
import assert from "node:assert/strict";
import {
  COOKIE_SESSION,
  DUREE_LIEN_S,
  DUREE_SESSION_S,
  administrateurs,
  cookieSession,
  estAdministrateur,
  gestionConfiguree,
  jetonDeRequete,
  sessionDeRequete,
  signer,
  verifier,
} from "../lib/gestion/session.ts";
import {
  horodatageBranche,
  nomFicheSur,
  reglage,
} from "../lib/gestion/github.ts";

// Espace de gestion (18/08) : authentification par lien magique, sans
// base de données. Ces tests portent sur la couche de décision ; la
// surface HTTP, elle, est vérifiée en permanence par la section 7 bis de
// scripts/verifier.mjs, sur un serveur réel.

const SECRET = "secret-de-test-de-plus-de-32-caracteres";
const ADMIN = "bruno@nauticeayachting.fr";

function avecEnvironnement(valeurs, corps) {
  const anciennes = {};
  for (const [cle, valeur] of Object.entries(valeurs)) {
    anciennes[cle] = process.env[cle];
    if (valeur === undefined) {
      delete process.env[cle];
    } else {
      process.env[cle] = valeur;
    }
  }
  try {
    return corps();
  } finally {
    for (const [cle, valeur] of Object.entries(anciennes)) {
      if (valeur === undefined) {
        delete process.env[cle];
      } else {
        process.env[cle] = valeur;
      }
    }
  }
}

const CONFIGURE = { SESSION_SECRET: SECRET, ADMIN_EMAILS: `${ADMIN}, autre@exemple.fr` };

// ---------- 1. Configuration et liste d'administrateurs ----------

test("l'espace reste éteint sans secret ni liste d'administrateurs", () => {
  avecEnvironnement({ SESSION_SECRET: undefined, ADMIN_EMAILS: undefined }, () => {
    assert.equal(gestionConfiguree(), false);
    assert.deepEqual(administrateurs(), []);
  });
});

test("un secret trop court est refusé, plutôt que de protéger mal", () => {
  avecEnvironnement({ SESSION_SECRET: "trop-court", ADMIN_EMAILS: ADMIN }, () => {
    assert.equal(gestionConfiguree(), false);
    assert.equal(signer({ email: ADMIN, usage: "session" }, 60), null);
  });
});

test("liste d'administrateurs : virgules, espaces et casse tolérés", () => {
  avecEnvironnement(
    { SESSION_SECRET: SECRET, ADMIN_EMAILS: " Bruno@Nauticeayachting.FR , x@y.fr ,, pasunemail " },
    () => {
      assert.deepEqual(administrateurs(), ["bruno@nauticeayachting.fr", "x@y.fr"]);
      assert.equal(estAdministrateur("BRUNO@nauticeayachting.fr"), true);
      assert.equal(estAdministrateur("intrus@example.com"), false);
      assert.equal(gestionConfiguree(), true);
    }
  );
});

// ---------- 2. Jetons ----------

test("jeton de session : signé, relu, adresse normalisée", () => {
  avecEnvironnement(CONFIGURE, () => {
    const jeton = signer({ email: "BRUNO@Nauticeayachting.fr", usage: "session" }, 60);
    assert.ok(jeton);
    const charge = verifier(jeton, "session");
    assert.ok(charge);
    assert.equal(charge.email, ADMIN);
    assert.equal(charge.usage, "session");
    assert.ok(charge.exp * 1000 > Date.now());
  });
});

test("jeton de lien refusé là où une session est attendue", () => {
  avecEnvironnement(CONFIGURE, () => {
    const lien = signer({ email: ADMIN, usage: "lien" }, DUREE_LIEN_S);
    assert.equal(verifier(lien, "session"), null);
    assert.ok(verifier(lien, "lien"));
  });
});

test("signature falsifiée refusée", () => {
  avecEnvironnement(CONFIGURE, () => {
    const jeton = signer({ email: ADMIN, usage: "session" }, 60);
    const separateur = jeton.lastIndexOf(".");
    const corps = jeton.slice(0, separateur);
    assert.equal(verifier(`${corps}.signatureBidon`, "session"), null);
    // Charge modifiée, signature d'origine : refusée aussi.
    const charge = Buffer.from(
      JSON.stringify({ email: "intrus@example.com", usage: "session", exp: 2000000000 })
    )
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    assert.equal(verifier(`${charge}.${jeton.slice(separateur + 1)}`, "session"), null);
  });
});

test("jeton expiré refusé", () => {
  avecEnvironnement(CONFIGURE, () => {
    const jeton = signer({ email: ADMIN, usage: "session" }, -1);
    assert.equal(verifier(jeton, "session"), null);
  });
});

test("jeton signé d'un autre secret refusé, la rotation coupe donc tout", () => {
  const jeton = avecEnvironnement(CONFIGURE, () =>
    signer({ email: ADMIN, usage: "session" }, 600)
  );
  avecEnvironnement(
    { SESSION_SECRET: "un-autre-secret-de-plus-de-32-caracteres", ADMIN_EMAILS: ADMIN },
    () => {
      assert.equal(verifier(jeton, "session"), null);
    }
  );
});

test("adresse retirée de la liste : la session tombe immédiatement", () => {
  const jeton = avecEnvironnement(CONFIGURE, () =>
    signer({ email: ADMIN, usage: "session" }, DUREE_SESSION_S)
  );
  avecEnvironnement({ SESSION_SECRET: SECRET, ADMIN_EMAILS: "quelquun@dautre.fr" }, () => {
    assert.equal(verifier(jeton, "session"), null);
  });
});

test("entrées absurdes refusées sans exception", () => {
  avecEnvironnement(CONFIGURE, () => {
    for (const valeur of [undefined, null, "", ".", "a.b", "sansPoint", 42, {}]) {
      assert.equal(verifier(valeur, "session"), null, String(valeur));
    }
  });
});

// ---------- 3. Cookie ----------

test("cookie de session : httpOnly, SameSite, durée, Secure en production", () => {
  const enClair = cookieSession("valeur", DUREE_SESSION_S, false);
  assert.match(enClair, /^nauticea_gestion=valeur/);
  assert.match(enClair, /HttpOnly/);
  assert.match(enClair, /SameSite=Lax/);
  assert.match(enClair, /Max-Age=604800/);
  assert.match(enClair, /Path=\//);
  assert.ok(!enClair.includes("Secure"));
  assert.match(cookieSession("valeur", DUREE_SESSION_S, true), /Secure/);
  // Purge : mêmes attributs, durée nulle, sans quoi certains navigateurs
  // laisseraient le cookie en place.
  assert.match(cookieSession("", 0, true), /Max-Age=0/);
  assert.match(cookieSession("", 0, true), /HttpOnly/);
});

test("lecture du cookie parmi d'autres, et absence de cookie", () => {
  const requete = (cookie) =>
    new Request("https://exemple.fr/api/gestion/annonces", {
      headers: cookie ? { cookie } : {},
    });
  assert.equal(jetonDeRequete(requete(null)), null);
  assert.equal(jetonDeRequete(requete("autre=1; nauticea_gestion=abc; encore=2")), "abc");
  assert.equal(jetonDeRequete(requete("autre=1")), null);
  assert.equal(COOKIE_SESSION, "nauticea_gestion");
});

test("session d'une requête : cookie valide accepté, cookie faux refusé", () => {
  avecEnvironnement(CONFIGURE, () => {
    const jeton = signer({ email: ADMIN, usage: "session" }, 600);
    const avec = new Request("https://exemple.fr/api/gestion/annonces", {
      headers: { cookie: `${COOKIE_SESSION}=${jeton}` },
    });
    assert.equal(sessionDeRequete(avec)?.email, ADMIN);

    const faux = new Request("https://exemple.fr/api/gestion/annonces", {
      headers: { cookie: `${COOKIE_SESSION}=nimportequoi` },
    });
    assert.equal(sessionDeRequete(faux), null);
    assert.equal(
      sessionDeRequete(new Request("https://exemple.fr/api/gestion/annonces")),
      null
    );
  });
});

// ---------- 4. Pont GitHub ----------

test("le pont reste éteint sans jeton ni dépôt", () => {
  avecEnvironnement(
    { GITHUB_GESTION_TOKEN: undefined, GITHUB_GESTION_REPO: undefined },
    () => {
      assert.equal(reglage(), null);
    }
  );
  avecEnvironnement(
    { GITHUB_GESTION_TOKEN: "jeton", GITHUB_GESTION_REPO: "sans-barre-oblique" },
    () => {
      assert.equal(reglage(), null);
    }
  );
});

test("réglage lu proprement quand les deux variables sont posées", () => {
  avecEnvironnement(
    { GITHUB_GESTION_TOKEN: "jeton", GITHUB_GESTION_REPO: "proprio/depot" },
    () => {
      assert.deepEqual(reglage(), {
        jeton: "jeton",
        proprietaire: "proprio",
        depot: "depot",
      });
    }
  );
});

test("horodatage de branche : trié, sans caractère douteux", () => {
  const h = horodatageBranche(new Date("2026-08-18T09:07:03Z"));
  assert.equal(h, "2026-08-18-0907-03");
  assert.match(h, /^[0-9-]+$/);
});

test("nom de fiche assaini : le workflow ne peut plus le refuser", () => {
  const h = "2026-08-18-0907-03";
  assert.equal(nomFicheSur("2010 Beneteau MC42.pdf", h), `${h}-2010 Beneteau MC42.pdf`);
  assert.equal(nomFicheSur("fiche été; rm -rf /.pdf", h), `${h}-fiche ete- rm -rf.pdf`);
  assert.equal(nomFicheSur(".pdf", h), `${h}-fiche.pdf`);
  assert.equal(nomFicheSur("", h), `${h}-fiche.pdf`);
  // Le motif du workflow d'ingestion, reproduit tel quel.
  for (const origine of ["a.pdf", "É*|.pdf", "très/long\\nom.pdf", "x".repeat(200) + ".pdf"]) {
    const nom = nomFicheSur(origine, h);
    assert.match(`ingest/${nom}`, /^ingest\/[A-Za-z0-9._ -]+\.[Pp][Dd][Ff]$/, origine);
  }
});
