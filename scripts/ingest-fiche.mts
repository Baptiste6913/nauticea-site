// Ingestion d'une fiche PDF BoatWizard : canal officiel d'alimentation.
//
// Usage : node --experimental-strip-types scripts/ingest-fiche.mts <fiche.pdf> [--date AAAA-MM-JJ] [--essai] [--slug <slug>]
//
// Avec --essai, rien n'est écrit hors du rapport : c'est le mode de
// relecture, qui permet de voir ce qu'une fiche produirait avant de la
// déposer pour de bon.
//
// Écrit l'annonce dans content/annonces/<slug>.json, les photos dans
// public/annonces/<slug>/, un rapport lisible dans
// rapports/ingestion-<slug>.md, et rend le slug sur la sortie standard
// pour que le workflow sache quelle branche ouvrir.
//
// Aucune étape ne modifie le corpus historique ni redirects.csv.
import fs from "node:fs";
import path from "node:path";
import { lireFichePdf } from "../lib/ingest/fiche-pdf.ts";
import { trierPhotos, nomPhoto, PIXELS_BASSE_DEF } from "../lib/ingest/photos.ts";
import {
  annonceDepuisFiche,
  diffAnnonces,
  doublonsPossibles,
  rapprocher,
  slugDeFiche,
} from "../lib/ingest/annonce.ts";
import type { Boat } from "../lib/types.ts";

const racine = process.cwd();
const DIR_ANNONCES = path.join(racine, "content", "annonces");
const DIR_PHOTOS = path.join(racine, "public", "annonces");
const DIR_RAPPORTS = path.join(racine, "rapports");

function usage(message: string): never {
  console.error(message);
  console.error(
    "Usage : node --experimental-strip-types scripts/ingest-fiche.mts <fiche.pdf> [--date AAAA-MM-JJ]"
  );
  process.exit(1);
}

const arguments_ = process.argv.slice(2);
const chemin = arguments_.find((a) => !a.startsWith("--"));
const essai = arguments_.includes("--essai");
const indexSlug = arguments_.indexOf("--slug");
const slugImpose =
  indexSlug >= 0 && arguments_[indexSlug + 1] !== undefined
    ? (arguments_[indexSlug + 1] as string)
    : null;
const indexDate = arguments_.indexOf("--date");
const date =
  indexDate >= 0 && arguments_[indexDate + 1] !== undefined
    ? (arguments_[indexDate + 1] as string)
    : new Date().toISOString().slice(0, 10);

if (!chemin) {
  usage("chemin du PDF manquant");
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  usage(`date « ${date} » hors format AAAA-MM-JJ`);
}
if (!fs.existsSync(chemin)) {
  usage(`fichier introuvable : ${chemin}`);
}

const lecture = lireFichePdf(new Uint8Array(fs.readFileSync(chemin)));
if (!lecture.ok) {
  // Rejet propre : message explicite, aucune exception, aucun fichier
  // écrit. Le workflow s'arrête ici et le PDF reste où il est.
  console.error(`fiche refusée : ${lecture.erreur}`);
  process.exit(2);
}
const { fiche, document } = lecture;

// Annonces déjà publiées, corpus historique compris : c'est là qu'on
// cherche si le bateau existe, pour conserver son slug et ses URL.
const { getBoats } = await import("../lib/sources/corpus.ts");
const existantes: Boat[] = getBoats();

let existante: Boat | undefined;
const notesRapprochement: string[] = [];
if (slugImpose !== null) {
  existante = existantes.find((b) => b.slug === slugImpose);
  if (!existante) {
    console.error(
      `annonce imposée « ${slugImpose} » introuvable : le slug est la fin de l'URL après /annonces/`
    );
    process.exit(3);
  }
  notesRapprochement.push(
    `annonce cible imposée à la main : « ${slugImpose} »`
  );
} else {
  const rapprochement = rapprocher(fiche, existantes);
  if (rapprochement.ambigues) {
    // Deux annonces indiscernables : choisir écraserait peut-être la
    // mauvaise. On rend la main avec les éléments de décision.
    console.error(
      `fiche refusée : ${rapprochement.ambigues.length} annonces en ligne portent la même marque et le même modèle, et l'année de la fiche (${fiche.annee}) ne tranche pas.`
    );
    for (const c of rapprochement.ambigues) {
      console.error(
        `  candidate : ${c.slug} (${c.etat}, ${
          c.prix === null ? "prix sur demande" : `${c.prix} ${c.devise}`
        }, année ${c.specs["Année"] ?? "inconnue"})`
      );
    }
    console.error(
      "Relancez en désignant l'annonce : --slug <slug>, ou distinguez les modèles dans BoatWizard."
    );
    process.exit(4);
  }
  existante = rapprochement.annonce;
  if (rapprochement.note) {
    notesRapprochement.push(rapprochement.note);
  }
  if (!existante) {
    // Bateau tenu pour nouveau : reste à écarter le doublon, car le
    // modèle est parfois nommé autrement sur le site que sur la fiche.
    for (const c of doublonsPossibles(fiche, existantes)) {
      notesRapprochement.push(
        `doublon possible avec l'annonce en ligne « ${c.slug} » (${c.titre}, année ${
          c.specs["Année"] ?? "inconnue"
        }, longueur ${c.specs["Longueur (m)"] ?? "inconnue"}) : le modèle diffère, aucun rapprochement automatique n'a été fait, à trancher avant de fusionner`
      );
    }
  }
}

const slug = existante?.slug ?? slugDeFiche(fiche);
if (slug === "") {
  console.error(
    "fiche refusée : ni marque ni modèle exploitables, aucun slug possible"
  );
  process.exit(2);
}

// Photos : tri, puis écriture sous public/annonces/<slug>/.
const tri = trierPhotos(document.images);
const dossierPhotos = path.join(DIR_PHOTOS, slug);
const cheminsPhotos: string[] = [];
if (essai) {
  for (const photo of tri.retenues) {
    cheminsPhotos.push(`/annonces/${slug}/${nomPhoto(photo.rang)}`);
  }
} else if (tri.retenues.length > 0) {
  fs.mkdirSync(dossierPhotos, { recursive: true });
  // Photos précédentes retirées d'abord : une fiche régénérée fait foi,
  // et un reste de l'ancienne série produirait des trous ou des doublons.
  for (const nom of fs.existsSync(dossierPhotos)
    ? fs.readdirSync(dossierPhotos)
    : []) {
    if (/^\d+\.jpg$/.test(nom)) {
      fs.rmSync(path.join(dossierPhotos, nom));
    }
  }
  for (const photo of tri.retenues) {
    const nom = nomPhoto(photo.rang);
    fs.writeFileSync(path.join(dossierPhotos, nom), photo.image.octets);
    cheminsPhotos.push(`/annonces/${slug}/${nom}`);
  }
}

const basseDef = tri.retenues.filter((p) => p.basseDef).length;
const { annonce, notes } = annonceDepuisFiche(fiche, {
  photos: cheminsPhotos,
  photosBasseDef: basseDef,
  date,
  existante,
});

if (!essai) {
  fs.mkdirSync(DIR_ANNONCES, { recursive: true });
  fs.writeFileSync(
    path.join(DIR_ANNONCES, `${slug}.json`),
    `${JSON.stringify(annonce, null, 2)}\n`
  );
}

// ---------- rapport ----------

const lignes: string[] = [];
const titre = existante ? "Mise à jour d'annonce" : "Nouvelle annonce";
lignes.push(`# ${titre} : ${annonce.titre}`);
lignes.push("");
if (essai) {
  lignes.push(
    "Essai de lecture : aucune annonce ni photo n'a été écrite, seul ce rapport l'a été."
  );
  lignes.push("");
}
lignes.push(`- fiche source : \`${path.basename(chemin)}\`, ${fiche.pages} pages`);
lignes.push(`- slug : \`${slug}\``);
lignes.push(
  existante
    ? `- annonce existante remplacée, slug conservé pour préserver l'URL indexée et les redirections`
    : "- bateau nouveau, slug construit sur marque, modèle et année"
);
lignes.push(`- date d'ingestion : ${date}`);
lignes.push("");

// Comparaison des photos : le canal PDF fournit des visuels de moindre
// résolution que ceux du site historique. C'est une décision humaine, pas
// une décision de script, donc elle est posée en tête du rapport.
const alerteQualite: string[] = [...notesRapprochement];
if (existante && existante.photos.length > tri.retenues.length) {
  alerteQualite.push(
    `l'annonce en ligne porte ${existante.photos.length} photos, la fiche n'en fournit que ${tri.retenues.length} : ${existante.photos.length - tri.retenues.length} photos seraient retirées`
  );
}
if (basseDef > 0) {
  alerteQualite.push(
    `${basseDef} des ${tri.retenues.length} photos de la fiche sont sous ${PIXELS_BASSE_DEF} pixels : la fiche PDF sert des visuels de moindre résolution que le site`
  );
}

lignes.push("## À confirmer par un humain");
lignes.push("");
if (
  fiche.a_confirmer.length === 0 &&
  notes.length === 0 &&
  alerteQualite.length === 0
) {
  lignes.push("Rien : tous les champs attendus ont été lus sur la fiche.");
} else {
  for (const item of alerteQualite) {
    lignes.push(`- ${item}`);
  }
  for (const item of fiche.a_confirmer) {
    lignes.push(`- ${item}`);
  }
  for (const note of notes) {
    lignes.push(`- ${note}`);
  }
}
lignes.push("");

lignes.push("## Champs retenus");
lignes.push("");
lignes.push("| champ | valeur |");
lignes.push("| --- | --- |");
const champs: Array<[string, string]> = [
  ["titre", annonce.titre],
  ["marque", annonce.marque],
  ["modèle", annonce.modele],
  ["année", fiche.annee],
  ["état", annonce.etat],
  ["prix", annonce.prix === null ? "aucun, prix sur demande" : `${annonce.prix} ${annonce.devise}`],
  ["longueur", fiche.longueur === null ? "a_confirmer" : `${fiche.longueur} m`],
  ["largeur", fiche.largeur === null ? "a_confirmer" : `${fiche.largeur} m`],
  ["catégorie", `${annonce.categorie} / ${annonce.sous_categorie}`],
  ["emplacement", fiche.emplacement],
  ["statut fiscal", fiche.statut_fiscal],
  ["moteurs", String(fiche.moteurs.length)],
  ["équipements", String(annonce.equipements.length)],
  ["caractères de description", String(annonce.description.length)],
];
for (const [nom, valeur] of champs) {
  lignes.push(`| ${nom} | ${valeur.replace(/\|/g, " ")} |`);
}
lignes.push("");

lignes.push("## Moteurs");
lignes.push("");
if (fiche.moteurs.length === 0) {
  lignes.push("Aucun bloc moteur sur la fiche.");
} else {
  for (const m of fiche.moteurs) {
    lignes.push(
      `- moteur ${m.numero} : ${m.intitule}, type ${m.type}, ${m.carburant}, puissance ${m.puissance}, heures ${m.heures}, entraînement ${m.entrainement}`
    );
  }
}
lignes.push("");

lignes.push("## Photos");
lignes.push("");
lignes.push(
  `- retenues : ${tri.retenues.length}${
    basseDef > 0
      ? `, dont ${basseDef} sous ${PIXELS_BASSE_DEF} pixels, donc en basse définition`
      : ""
  }`
);
if (tri.rejetees.length === 0) {
  lignes.push("- écartées : aucune");
} else {
  lignes.push(`- écartées : ${tri.rejetees.length}`);
  for (const r of tri.rejetees) {
    lignes.push(`  - rang ${r.image.rang}, page ${r.image.page} : ${r.motif}, ${r.detail}`);
  }
}
lignes.push("");

lignes.push("## Différences avec l'annonce en ligne");
lignes.push("");
for (const ligne of diffAnnonces(existante, annonce)) {
  lignes.push(`- ${ligne}`);
}
lignes.push("");

if (document.avertissements.length > 0 || fiche.avertissements.length > 0) {
  lignes.push("## Avertissements de lecture");
  lignes.push("");
  for (const a of [...document.avertissements, ...fiche.avertissements]) {
    lignes.push(`- ${a}`);
  }
  lignes.push("");
}

lignes.push("## Sections d'équipements");
lignes.push("");
for (const section of fiche.equipements) {
  lignes.push(`- ${section.titre} : ${section.items.join(", ")}`);
}
lignes.push("");
lignes.push(
  "Le pied de page vendeur et l'avis de non-responsabilité de la fiche ne sont jamais importés."
);
lignes.push("");

fs.mkdirSync(DIR_RAPPORTS, { recursive: true });
const cheminRapport = path.join(
  DIR_RAPPORTS,
  essai ? `essai-ingestion-${slug}.md` : `ingestion-${slug}.md`
);
fs.writeFileSync(cheminRapport, `${lignes.join("\n")}`);

console.log(`essai=${essai ? "oui" : "non"}`);
console.log(`slug=${slug}`);
console.log(`nouvelle=${existante ? "non" : "oui"}`);
console.log(`photos=${tri.retenues.length}`);
console.log(`photos_basse_def=${basseDef}`);
console.log(`photos_ecartees=${tri.rejetees.length}`);
console.log(
  `a_confirmer=${fiche.a_confirmer.length + notes.length + alerteQualite.length}`
);
console.log(`rapport=${path.relative(racine, cheminRapport)}`);
