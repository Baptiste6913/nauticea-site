// Cycle de vie d'une annonce : marquer vendu, ou retirer.
//
// Usage :
//   node --experimental-strip-types scripts/gerer-annonce.mts vendu <slug>
//   node --experimental-strip-types scripts/gerer-annonce.mts disponible <slug>
//   node --experimental-strip-types scripts/gerer-annonce.mts retirer <slug>
//
// « vendu » garde l'annonce en ligne, listée et indexée, avec son bandeau
// et sans appel à projet. « retirer » supprime l'annonce et ses photos, et
// ajoute une redirection 301 vers /annonces pour qu'aucune URL indexée ne
// tombe en 404. Le script écrit un rapport, qui sert de corps à la demande
// de fusion.
import fs from "node:fs";
import path from "node:path";
import { getBoats, lireEtatsAnnonces } from "../lib/sources/corpus.ts";

const racine = process.cwd();
const FICHIER_ETATS = path.join(racine, "content", "annonces-etats.json");
const FICHIER_REDIRECTIONS = path.join(
  racine,
  "corpus-nauticea",
  "redirects.csv"
);
const DIR_ANNONCES = path.join(racine, "content", "annonces");
const DIR_PHOTOS = path.join(racine, "public", "annonces");
const DIR_RAPPORTS = path.join(racine, "rapports");

const ACTIONS = ["vendu", "disponible", "retirer"] as const;
type Action = (typeof ACTIONS)[number];

function refuser(message: string): never {
  console.error(message);
  console.error(
    `Usage : node --experimental-strip-types scripts/gerer-annonce.mts <${ACTIONS.join(
      "|"
    )}> <slug>`
  );
  process.exit(1);
}

const [actionBrute, slug] = process.argv.slice(2);
if (!actionBrute || !(ACTIONS as readonly string[]).includes(actionBrute)) {
  refuser(`action « ${actionBrute ?? ""} » inconnue`);
}
if (!slug) {
  refuser("slug manquant");
}
const action = actionBrute as Action;

const annonce = getBoats().find((b) => b.slug === slug);
const etats = lireEtatsAnnonces();
if (!annonce) {
  // Une annonce déjà retirée n'est plus dans la liste : on le dit sans
  // rien casser, plutôt que d'écrire un état incohérent.
  if (etats.retirees.includes(slug)) {
    console.error(`annonce « ${slug} » déjà retirée du site`);
    process.exit(3);
  }
  console.error(
    `annonce « ${slug} » introuvable. Le slug est celui de l'URL, après /annonces/`
  );
  process.exit(3);
}

const lignes: string[] = [];
const journal: string[] = [];

function ecrireEtats(): void {
  fs.writeFileSync(
    FICHIER_ETATS,
    `${JSON.stringify(
      {
        vendus: [...new Set(etats.vendus)].sort(),
        retirees: [...new Set(etats.retirees)].sort(),
      },
      null,
      2
    )}\n`
  );
}

if (action === "vendu") {
  if (etats.vendus.includes(slug)) {
    journal.push("annonce déjà marquée vendue, aucun changement");
  } else {
    etats.vendus.push(slug);
    ecrireEtats();
    journal.push("annonce marquée vendue");
  }
  lignes.push(`# Bateau vendu : ${annonce.titre}`);
  lignes.push("");
  lignes.push(`- slug : \`${slug}\``);
  lignes.push("- l'annonce reste listée, servie et indexée");
  lignes.push("- un bandeau « Vendu » apparaît sur la carte et sur la fiche");
  lignes.push(
    "- l'appel à décrire un projet est remplacé par un lien vers la liste des annonces"
  );
  lignes.push("- la disponibilité passe à « vendu » dans les données structurées");
} else if (action === "disponible") {
  if (!etats.vendus.includes(slug)) {
    journal.push("annonce déjà disponible, aucun changement");
  } else {
    etats.vendus = etats.vendus.filter((s) => s !== slug);
    ecrireEtats();
    journal.push("marquage vendu retiré");
  }
  lignes.push(`# Bateau remis en vente : ${annonce.titre}`);
  lignes.push("");
  lignes.push(`- slug : \`${slug}\``);
  lignes.push("- le bandeau « Vendu » disparaît, les appels à l'action reviennent");
} else {
  // Retrait : état, fichier d'annonce, photos, redirection.
  if (!etats.retirees.includes(slug)) {
    etats.retirees.push(slug);
  }
  etats.vendus = etats.vendus.filter((s) => s !== slug);
  ecrireEtats();
  journal.push("slug ajouté aux annonces retirées");

  const fichierAnnonce = path.join(DIR_ANNONCES, `${slug}.json`);
  if (fs.existsSync(fichierAnnonce)) {
    fs.rmSync(fichierAnnonce);
    journal.push(`fichier d'annonce supprimé : content/annonces/${slug}.json`);
  } else {
    journal.push(
      "annonce issue du corpus historique : aucun fichier d'annonce à supprimer, le corpus reste intact"
    );
  }

  const dossierPhotos = path.join(DIR_PHOTOS, slug);
  if (fs.existsSync(dossierPhotos)) {
    const nombre = fs.readdirSync(dossierPhotos).length;
    fs.rmSync(dossierPhotos, { recursive: true });
    journal.push(`${nombre} photos supprimées : public/annonces/${slug}/`);
  } else {
    journal.push("aucun dossier de photos à supprimer");
  }

  const source = `/annonces/${slug}`;
  const csv = fs.readFileSync(FICHIER_REDIRECTIONS, "utf-8");
  const dejaPresente = csv
    .split("\n")
    .some((l) => l.split(",")[0]?.trim() === source);
  if (dejaPresente) {
    journal.push("redirection déjà présente dans redirects.csv");
  } else {
    const separateur = csv.endsWith("\n") ? "" : "\n";
    fs.appendFileSync(
      FICHIER_REDIRECTIONS,
      `${separateur}${source},/annonces\n`
    );
    journal.push(`redirection 301 ajoutée : ${source} vers /annonces`);
  }

  lignes.push(`# Annonce retirée : ${annonce.titre}`);
  lignes.push("");
  lignes.push(`- slug : \`${slug}\``);
  lignes.push(
    `- ${source} renvoie désormais une redirection 301 vers /annonces, aucune URL indexée ne tombe en 404`
  );
  lignes.push("- l'annonce sort de la liste, du sitemap et des pages de catégorie");
}

lignes.push("");
lignes.push("## Opérations effectuées");
lignes.push("");
for (const item of journal) {
  lignes.push(`- ${item}`);
}
lignes.push("");

fs.mkdirSync(DIR_RAPPORTS, { recursive: true });
const cheminRapport = path.join(DIR_RAPPORTS, `cycle-${action}-${slug}.md`);
fs.writeFileSync(cheminRapport, lignes.join("\n"));

console.log(`action=${action}`);
console.log(`slug=${slug}`);
console.log(`titre=${annonce.titre}`);
console.log(`rapport=${path.relative(racine, cheminRapport)}`);
