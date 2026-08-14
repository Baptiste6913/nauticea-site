// Phase B : normalise un flux XML Open Marine (Boats Group) en JSON.
// Usage : node --experimental-strip-types scripts/normalise-feed.mts <feed.xml> <sortie.json>
import fs from "node:fs";
import { parseOpenMarine } from "../lib/sources/boatsgroup.ts";

const [, , entree, sortie] = process.argv;
if (!entree || !sortie) {
  console.error(
    "Usage : node --experimental-strip-types scripts/normalise-feed.mts <feed.xml> <sortie.json>"
  );
  process.exit(1);
}

const xml = fs.readFileSync(entree, "utf-8");
const boats = parseOpenMarine(xml);
fs.writeFileSync(sortie, JSON.stringify(boats, null, 2) + "\n");
console.log(`${boats.length} annonces normalisées vers ${sortie}`);
