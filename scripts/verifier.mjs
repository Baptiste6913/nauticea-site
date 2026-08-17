#!/usr/bin/env node
// Harnais de vérification du site (directive finale W6).
// Usage : npm run verifier  (ou : node scripts/verifier.mjs --sans-build)
// Build de production, serveur local éphémère, puis vérifications :
// crawl du sitemap + 404, liens internes, images, unicité des title et
// description, canonicals, JSON-LD, les 48 redirections 301, chaînes
// interdites dans les sources et le rendu, pages masquées hors sitemap
// et hors navigation, références d'actions GitHub épinglées sur des
// condensats, discrétion et fermeture de l'espace de gestion. Exit code
// non nul au moindre échec ; résultat écrit dans verification.json.

import { execSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const PORT = 3187;
const BASE = `http://localhost:${PORT}`;
const RACINE = process.cwd();
const echecs = [];
const resume = {};

function echec(categorie, detail) {
  echecs.push({ categorie, detail });
  console.error(`ECHEC [${categorie}] ${detail}`);
}

// ---------- 1. Build et serveur ----------
if (!process.argv.includes("--sans-build")) {
  console.log("build de production...");
  execSync("npm run build", { stdio: "inherit" });
}

// L'espace de gestion n'est servi que si sa configuration existe : le
// harnais pose donc des valeurs d'essai, sans quoi ses contrôles
// porteraient sur un espace éteint. Ces valeurs ne sortent pas d'ici.
const SECRET_ESSAI = "harnais-de-verification-secret-de-40-caracteres";
const ADMIN_ESSAI = "essai-autorise@nauticeayachting.fr";
const ADMIN_INCONNU = "essai-inconnu@example.invalid";

const serveur = spawn(
  path.join(RACINE, "node_modules", ".bin", "next"),
  ["start", "-p", String(PORT)],
  {
    stdio: "ignore",
    detached: false,
    env: {
      ...process.env,
      SESSION_SECRET: SECRET_ESSAI,
      ADMIN_EMAILS: ADMIN_ESSAI,
    },
  }
);

async function attendreServeur() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const r = await fetch(`${BASE}/`);
      if (r.ok) {
        return;
      }
    } catch {
      // pas encore prêt
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("serveur local injoignable");
}

function extraire(html, regex) {
  return [...html.matchAll(regex)].map((m) => m[1]);
}

try {
  await attendreServeur();

  // ---------- 2. Routes du sitemap ----------
  const sitemapXml = await (await fetch(`${BASE}/sitemap.xml`)).text();
  const urls = extraire(sitemapXml, /<loc>([^<]+)<\/loc>/g).map((u) =>
    u.replace("https://www.nauticeayachting.fr", "")
  );
  resume.routes_sitemap = urls.length;
  console.log(`${urls.length} routes au sitemap`);

  const pages = new Map();
  for (const route of urls) {
    const rep = await fetch(`${BASE}${route || "/"}`);
    if (rep.status !== 200) {
      echec("statut", `${route} renvoie ${rep.status}`);
      continue;
    }
    pages.set(route, await rep.text());
  }

  // 404 propre
  const rep404 = await fetch(`${BASE}/page-inexistante-harnais`);
  if (rep404.status !== 404) {
    echec("statut", `la 404 renvoie ${rep404.status}`);
  }

  // ---------- 3. Titles, descriptions, canonicals, JSON-LD ----------
  const titres = new Map();
  const descriptions = new Map();
  for (const [route, html] of pages) {
    const titre = (html.match(/<title>([^<]*)<\/title>/) ?? [])[1] ?? "";
    const desc =
      (html.match(/<meta name="description" content="([^"]*)"/) ?? [])[1] ?? "";
    if (!titre) {
      echec("seo", `${route} : title absent`);
    }
    if (!desc) {
      echec("seo", `${route} : description absente`);
    }
    if (titres.has(titre)) {
      echec("seo", `title dupliqué « ${titre} » : ${titres.get(titre)} et ${route}`);
    }
    titres.set(titre, route);
    if (descriptions.has(desc)) {
      echec(
        "seo",
        `description dupliquée entre ${descriptions.get(desc)} et ${route}`
      );
    }
    descriptions.set(desc, route);
    if (!html.includes('rel="canonical"')) {
      echec("seo", `${route} : canonical absent`);
    }
  }

  // JSON-LD parsable sur l'accueil et sur chaque fiche annonce
  for (const [route, html] of pages) {
    const estFiche = /^\/annonces\/[^/]+$/.test(route) &&
      !["/annonces/bateaux-moteur", "/annonces/catamaran", "/annonces/voiliers"].includes(route);
    if (route !== "" && route !== "/" && !estFiche) {
      continue;
    }
    const blocs = extraire(
      html,
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g
    );
    if (blocs.length === 0) {
      echec("jsonld", `${route || "/"} : aucun bloc JSON-LD`);
      continue;
    }
    for (const bloc of blocs) {
      try {
        JSON.parse(bloc);
      } catch {
        echec("jsonld", `${route || "/"} : JSON-LD non parsable`);
      }
    }
    if (estFiche) {
      const contenu = blocs.join(" ");
      if (!contenu.includes('"Product"') || !contenu.includes('"BreadcrumbList"')) {
        echec("jsonld", `${route} : Product ou BreadcrumbList manquant`);
      }
    }
  }

  // ---------- 4. Liens internes et images ----------
  const verifies = new Map();
  async function statutDe(chemin) {
    if (verifies.has(chemin)) {
      return verifies.get(chemin);
    }
    const rep = await fetch(`${BASE}${chemin}`, { redirect: "manual" });
    verifies.set(chemin, rep.status);
    return rep.status;
  }
  let liens = 0;
  let images = 0;
  for (const [route, html] of pages) {
    for (const href of new Set(extraire(html, /<a[^>]+href="(\/[^"#?]*)/g))) {
      liens += 1;
      const statut = await statutDe(href);
      if (![200, 301, 308].includes(statut)) {
        echec("lien", `${route} -> ${href} renvoie ${statut}`);
      }
    }
    for (const src of new Set(
      extraire(html, /<img[^>]+src="(\/[^"]+)"/g).map((s) =>
        s.replace(/&amp;/g, "&")
      )
    )) {
      images += 1;
      const statut = await statutDe(src);
      if (statut !== 200) {
        echec("image", `${route} : image ${src.slice(0, 80)} renvoie ${statut}`);
      }
    }
  }
  resume.liens_internes_verifies = liens;
  resume.images_verifiees = images;

  // ---------- 5. Les 48 redirections ----------
  const csv = fs
    .readFileSync(path.join(RACINE, "corpus-nauticea", "redirects.csv"), "utf-8")
    .trim()
    .split("\n")
    .slice(1);
  resume.redirections = csv.length;
  for (const ligne of csv) {
    const [source, destination] = ligne.split(",");
    const rep = await fetch(`${BASE}${source}`, { redirect: "manual" });
    if (rep.status !== 301) {
      echec("redirection", `${source} renvoie ${rep.status} au lieu de 301`);
      continue;
    }
    const cible = rep.headers.get("location");
    if (cible !== destination) {
      echec("redirection", `${source} -> ${cible} au lieu de ${destination}`);
    }
  }

  // ---------- 6. Chaînes interdites ----------
  // 6a. Dans les sources du site (hors corpus, données brutes du legacy).
  const INTERDITES_SOURCES = [
    ["cinq.studio", /cinq\.studio/],
    ["em-dash", /—/],
    ["TODO", /\bTODO\b/],
    ["FIXME", /\bFIXME\b/],
    ["lorem", /lorem/i],
    ["joomla", /joomla/i],
    ["bretweb", /bretweb/i],
    ["ancien site (assets)", /nauticeayachting\.fr\/(images|Video|templates|media)/],
  ];
  const DOSSIERS_SOURCES = ["app", "components", "lib", "scripts", "docs", "design", "content"];
  // Fichiers de racine scannés ; un absent est ignoré plutôt que fatal,
  // car le harnais doit tourner sur un clone neuf comme sur un poste.
  const FICHIERS_RACINE = ["README.md", ".env.example", "next.config.ts", "package.json"];
  function fichiersDe(dossier) {
    const resultat = [];
    if (!fs.existsSync(dossier)) {
      return resultat;
    }
    for (const entree of fs.readdirSync(dossier, { withFileTypes: true })) {
      const chemin = path.join(dossier, entree.name);
      if (entree.isDirectory()) {
        resultat.push(...fichiersDe(chemin));
      } else if (/\.(ts|tsx|mjs|mts|md|css|txt|json|yml)$/.test(entree.name)) {
        resultat.push(chemin);
      }
    }
    return resultat;
  }
  const sources = [
    ...DOSSIERS_SOURCES.flatMap((d) => fichiersDe(path.join(RACINE, d))),
    ...FICHIERS_RACINE.map((f) => path.join(RACINE, f)).filter((f) => fs.existsSync(f)),
  ].filter(
    (f) =>
      !f.includes("design/qa/") &&
      // Le harnais porte la liste des motifs interdits : il s'exclut.
      !f.endsWith("scripts/verifier.mjs")
  );
  // Deux motifs visent le contenu publié et le code, pas la documentation
  // interne : un rapport d'audit ou de recette doit pouvoir nommer le CMS
  // et le prestataire d'origine, c'est même son objet. Ils restent
  // interdits partout ailleurs, et dans le rendu de toutes les pages au
  // contrôle 6b, qui est celui qui protège le site.
  const TOLERES_EN_DOCUMENTATION = new Set(["joomla", "bretweb"]);
  for (const fichier of sources) {
    const contenu = fs.readFileSync(fichier, "utf-8");
    const estDocumentation = path
      .relative(RACINE, fichier)
      .startsWith(`docs${path.sep}`);
    for (const [nom, regex] of INTERDITES_SOURCES) {
      if (estDocumentation && TOLERES_EN_DOCUMENTATION.has(nom)) {
        continue;
      }
      if (regex.test(contenu)) {
        echec("interdit", `${path.relative(RACINE, fichier)} contient « ${nom} »`);
      }
    }
  }
  resume.fichiers_sources_scannes = sources.length;

  // 6b. Dans le rendu de toutes les pages.
  const INTERDITES_RENDU = [
    ["Catégorie -", /Catégorie -/],
    ["lorem", /lorem ipsum/i],
    ["cinq.studio", /cinq\.studio/],
    ["em-dash", /—/],
    ["joomla", /joomla/i],
    ["bretweb", /bretweb/i],
    ["ancien site (assets)", /nauticeayachting\.fr\/(images|Video|templates|media)/],
    ["lien interne .html", /href="\/[^"]*\.html"/],
  ];
  for (const [route, html] of pages) {
    for (const [nom, regex] of INTERDITES_RENDU) {
      if (regex.test(html)) {
        echec("interdit-rendu", `${route || "/"} contient « ${nom} »`);
      }
    }
  }

  // ---------- 6c. Actions GitHub épinglées sur des condensats ----------
  // Une étiquette (@v4) ou une branche (@main) est mobile : son
  // mainteneur peut la déplacer, ce qui exécuterait un autre code dans
  // un workflow qui a le droit d'écrire sur le dépôt. Seul un condensat
  // de commit complet est immuable. Dependabot tient ces condensats à
  // jour par PR (.github/dependabot.yml).
  const DOSSIER_WORKFLOWS = path.join(RACINE, ".github", "workflows");
  let usesVerifies = 0;
  if (fs.existsSync(DOSSIER_WORKFLOWS)) {
    for (const nom of fs.readdirSync(DOSSIER_WORKFLOWS).sort()) {
      if (!/\.ya?ml$/.test(nom)) {
        continue;
      }
      const relatif = path.join(".github", "workflows", nom);
      const lignes = fs
        .readFileSync(path.join(DOSSIER_WORKFLOWS, nom), "utf-8")
        .split("\n");
      lignes.forEach((ligne, index) => {
        // Les lignes entièrement en commentaire ne sont pas exécutées.
        if (/^\s*#/.test(ligne)) {
          return;
        }
        const trouve = ligne.match(/uses:\s*([^\s#]+)/);
        if (!trouve) {
          return;
        }
        const reference = trouve[1].replace(/^["']|["']$/g, "");
        usesVerifies += 1;
        // Action locale du dépôt ou image conteneur : pas de condensat
        // d'action à épingler.
        if (reference.startsWith("./") || reference.startsWith("docker://")) {
          return;
        }
        if (!/@[0-9a-f]{40}$/.test(reference)) {
          echec(
            "actions-mutables",
            `${relatif}:${index + 1} référence mutable « ${reference} » : un condensat de commit de 40 caractères hexadécimaux est exigé`
          );
        }
      });
    }
  }
  resume.uses_workflows_verifies = usesVerifies;

  // ---------- 7. Pages masquées : servies mais hors sitemap et nav ----------
  // /actualites est revenue au sitemap avec la première actu de 2026 ;
  // /annonces/voiliers est visible au sitemap sur décision client
  // (retours du 16/08 V2) ; les anciennes actus du corpus (2022)
  // restent servies mais masquées.
  const MASQUEES = ["/actualites/sealine-c-390", "/actualites/nouveau-sealine-s390", "/actualites/sealine-s430-la-visite", "/actualites/sealine-c335"];
  for (const route of MASQUEES) {
    if (urls.includes(route)) {
      echec("masquage", `${route} figure au sitemap`);
    }
    const rep = await fetch(`${BASE}${route}`);
    if (rep.status !== 200) {
      echec("masquage", `${route} devrait rester servie (${rep.status})`);
    }
  }
  const accueilHtml = pages.get("") ?? pages.get("/") ?? "";
  for (const route of MASQUEES) {
    if (accueilHtml.includes(`href="${route}"`)) {
      echec("masquage", `l'accueil pointe vers la page masquée ${route}`);
    }
  }
  if (urls.includes("/gamme-neuve")) {
    echec("masquage", "/gamme-neuve figure au sitemap sans flag");
  }
  const repGamme = await fetch(`${BASE}/gamme-neuve`);
  if (repGamme.status !== 404) {
    echec("masquage", `/gamme-neuve devrait renvoyer 404 sans flag (${repGamme.status})`);
  }

  // ---------- 7 bis. Espace de gestion : discret et fermé ----------
  // L'espace est une télécommande privée : il ne doit apparaître nulle
  // part côté public, et aucune de ses routes ne doit répondre sans
  // session. Ces contrôles sont permanents, pas une vérification de
  // session.
  let controlesGestion = 0;
  const compter = () => {
    controlesGestion += 1;
  };

  if (urls.some((u) => u.includes("gestion"))) {
    echec("gestion", "une adresse de l'espace de gestion figure au sitemap");
  }
  compter();

  // Aucune page publique ne le mentionne, ni en lien, ni en commentaire.
  for (const [route, html] of pages) {
    if (/gestion/i.test(html)) {
      echec("gestion", `la page ${route || "/"} mentionne l'espace de gestion`);
    }
  }
  compter();

  // Aucun script servi à une page publique ne le mentionne : c'est ce qui
  // garantit qu'aucun indice ne traîne dans le bundle.
  const scriptsPublics = new Set();
  for (const [, html] of pages) {
    for (const src of extraire(html, /<script[^>]+src="([^"]+)"/g)) {
      if (src.startsWith("/_next/")) {
        scriptsPublics.add(src);
      }
    }
  }
  for (const src of scriptsPublics) {
    const corps = await (await fetch(`${BASE}${src}`)).text();
    if (/gestion/i.test(corps)) {
      echec("gestion", `le script public ${src} mentionne l'espace de gestion`);
    }
  }
  resume.scripts_publics_verifies = scriptsPublics.size;
  compter();

  // La page existe, mais interdit l'indexation, par la balise comme par
  // l'en-tête.
  const repGestion = await fetch(`${BASE}/gestion`);
  const entetesGestion = repGestion.headers.get("x-robots-tag") ?? "";
  if (!/noindex/.test(entetesGestion) || !/nofollow/.test(entetesGestion)) {
    echec("gestion", `/gestion sans en-tête X-Robots-Tag complet (« ${entetesGestion} »)`);
  }
  const htmlGestion = await repGestion.text();
  if (!/<meta name="robots"[^>]*noindex/.test(htmlGestion)) {
    echec("gestion", "/gestion sans balise meta robots noindex");
  }
  compter();

  // Toutes les routes de données exigent une session.
  for (const [chemin, methode] of [
    ["/api/gestion/annonces", "GET"],
    ["/api/gestion/action", "POST"],
    ["/api/gestion/depot", "POST"],
  ]) {
    const rep = await fetch(`${BASE}${chemin}`, {
      method: methode,
      headers: { "Content-Type": "application/json" },
      body: methode === "POST" ? "{}" : undefined,
    });
    if (rep.status !== 401) {
      echec("gestion", `${chemin} répond ${rep.status} sans session, 401 attendu`);
    }
  }
  compter();

  // Demande de lien : adresse autorisée et adresse inconnue doivent
  // donner exactement la même réponse, sans quoi la route deviendrait un
  // annuaire des administrateurs.
  const reponsesLien = [];
  for (const email of [ADMIN_ESSAI, ADMIN_INCONNU]) {
    const rep = await fetch(`${BASE}/api/gestion/lien`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, horodatage: Date.now() - 9000 }),
    });
    reponsesLien.push({ statut: rep.status, corps: await rep.text() });
  }
  const [autorisee, inconnue] = reponsesLien;
  if (autorisee.statut !== inconnue.statut || autorisee.corps !== inconnue.corps) {
    echec(
      "gestion",
      `la demande de lien distingue une adresse autorisée (${autorisee.statut}) d'une inconnue (${inconnue.statut})`
    );
  }
  compter();

  // Le jeton GitHub ne doit jamais franchir la frontière du serveur.
  for (const src of scriptsPublics) {
    const corps = await (await fetch(`${BASE}${src}`)).text();
    for (const nom of ["GITHUB_GESTION_TOKEN", "SESSION_SECRET", "ADMIN_EMAILS"]) {
      if (corps.includes(nom)) {
        echec("gestion", `le script public ${src} contient le nom de secret ${nom}`);
      }
    }
  }
  const scriptsGestion = extraire(htmlGestion, /<script[^>]+src="([^"]+)"/g).filter(
    (s) => s.startsWith("/_next/")
  );
  for (const src of scriptsGestion) {
    const corps = await (await fetch(`${BASE}${src}`)).text();
    for (const secret of [SECRET_ESSAI, ADMIN_ESSAI, "GITHUB_GESTION_TOKEN"]) {
      if (corps.includes(secret)) {
        echec("gestion", `le script ${src} de l'espace expose ${secret.slice(0, 20)}`);
      }
    }
  }
  compter();
  resume.controles_gestion = controlesGestion;

  // ---------- 8. En-têtes de sécurité ----------
  const entetes = (await fetch(`${BASE}/`)).headers;
  for (const attendu of [
    "strict-transport-security",
    "x-content-type-options",
    "referrer-policy",
    "content-security-policy",
    "permissions-policy",
  ]) {
    if (!entetes.get(attendu)) {
      echec("entetes", `en-tête ${attendu} absent`);
    }
  }
} catch (e) {
  echec("harnais", e.message);
} finally {
  serveur.kill("SIGKILL");
}

// ---------- Rapport ----------
const rapport = {
  date: new Date().toISOString(),
  statut: echecs.length === 0 ? "OK" : "ECHEC",
  resume,
  echecs,
};
fs.writeFileSync(
  path.join(RACINE, "verification.json"),
  JSON.stringify(rapport, null, 2) + "\n"
);
console.log(
  `\nverification.json écrit : ${rapport.statut} (${echecs.length} échec${echecs.length > 1 ? "s" : ""})`
);
console.log(JSON.stringify(resume, null, 1));
process.exit(echecs.length === 0 ? 0 : 1);
