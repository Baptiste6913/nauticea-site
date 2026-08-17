// Phase B : normalise un flux XML Open Marine (Boats Group) en JSON, et
// rapatrie les photos autorisées dans public/annonces/<slug>/.
// Usage : node --experimental-strip-types scripts/normalise-feed.mts <feed.xml> <sortie.json>
//
// Durcissement du 17/08, avant toute activation : le flux est une source
// externe, donc chaque étape est bornée et toute anomalie est signalée au
// rapport plutôt que d'interrompre la synchronisation. Seule une erreur
// structurelle (arguments manquants, flux illisible) sort en code non nul.
import fs from "node:fs";
import path from "node:path";
import {
  filtrerImages,
  hotesAutorises,
  parseOpenMarine,
  type Anomalie,
} from "../lib/sources/boatsgroup.ts";
import { telechargerBorne } from "./telechargement.mts";

const [, , entree, sortie] = process.argv;
if (!entree || !sortie) {
  console.error(
    "Usage : node --experimental-strip-types scripts/normalise-feed.mts <feed.xml> <sortie.json>"
  );
  process.exit(1);
}

const racine = process.cwd();
const CHEMIN_RAPPORT = path.join(
  racine,
  "corpus-nauticea",
  "rapport-sync-flux.json"
);

const anomalies: Anomalie[] = [];
const hotes = hotesAutorises(process.env.FEED_IMAGE_HOSTS);

const xml = fs.readFileSync(entree, "utf-8");
const boats = parseOpenMarine(xml, { signaler: (a) => anomalies.push(a) });

// Hôtes rencontrés mais refusés : c'est cette liste que l'opérateur copie
// dans FEED_IMAGE_HOSTS après avoir vu le premier flux réel.
const hotesRencontres = new Map<string, number>();
let photosRetenues = 0;
let photosTelechargees = 0;

for (const boat of boats) {
  const { retenues, refus } = filtrerImages(boat.photos, hotes);
  for (const r of refus) {
    anomalies.push({ annonce: boat.id, type: r.type, detail: r.detail });
    if (r.type === "image-hote-refuse") {
      hotesRencontres.set(r.detail, (hotesRencontres.get(r.detail) ?? 0) + 1);
    }
  }
  photosRetenues += retenues.length;

  const dossier = path.join(racine, "public", "annonces", boat.slug);
  const locales: string[] = [];
  for (const [index, url] of retenues.entries()) {
    const nom = `${String(index + 1).padStart(2, "0")}.jpg`;
    const resultat = await telechargerBorne(url);
    if (!resultat.ok) {
      // Photo manquante signalée, annonce conservée : jamais de synchro
      // en échec total pour une image.
      anomalies.push({
        annonce: boat.id,
        type: "telechargement-echoue",
        detail: `${nom} depuis ${url.slice(0, 90)} : ${resultat.erreur}`,
      });
      continue;
    }
    fs.mkdirSync(dossier, { recursive: true });
    fs.writeFileSync(path.join(dossier, nom), resultat.octets);
    locales.push(`/annonces/${boat.slug}/${nom}`);
    photosTelechargees += 1;
  }
  boat.photos = locales;
}

fs.writeFileSync(sortie, JSON.stringify(boats, null, 2) + "\n");

const rapport = {
  date: new Date().toISOString(),
  annonces: boats.length,
  photos_retenues: photosRetenues,
  photos_telechargees: photosTelechargees,
  hotes_autorises: hotes,
  hotes_refuses: Object.fromEntries(hotesRencontres),
  anomalies,
};
fs.writeFileSync(CHEMIN_RAPPORT, JSON.stringify(rapport, null, 2) + "\n");

console.log(`${boats.length} annonces normalisées vers ${sortie}`);
console.log(
  `photos : ${photosTelechargees} téléchargées sur ${photosRetenues} retenues`
);
if (hotes.length === 0) {
  console.log(
    "FEED_IMAGE_HOSTS absente : toutes les images sont refusées (mode découverte)."
  );
}
if (hotesRencontres.size > 0) {
  console.log("hôtes d'images refusés, à autoriser sciemment si légitimes :");
  for (const [hote, n] of [...hotesRencontres].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${hote} (${n} images)`);
  }
  console.log(
    `  FEED_IMAGE_HOSTS=${[...hotesRencontres.keys()].join(",")}`
  );
}
const parType = new Map<string, number>();
for (const a of anomalies) {
  parType.set(a.type, (parType.get(a.type) ?? 0) + 1);
}
if (parType.size > 0) {
  console.log(`${anomalies.length} anomalies (détail : ${path.relative(racine, CHEMIN_RAPPORT)}) :`);
  for (const [type, n] of parType) {
    console.log(`  ${type} : ${n}`);
  }
} else {
  console.log("aucune anomalie.");
}
