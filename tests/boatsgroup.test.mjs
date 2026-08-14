import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseOpenMarine } from "../lib/sources/boatsgroup.ts";

const ici = path.dirname(fileURLToPath(import.meta.url));
const fixture = fs.readFileSync(
  path.join(ici, "fixtures", "openmarine-minimal.xml"),
  "utf-8"
);

test("parse deux annonces du fixture Open Marine", () => {
  const boats = parseOpenMarine(fixture);
  assert.equal(boats.length, 2);
});

test("mappe les champs principaux de la première annonce", () => {
  const [b] = parseOpenMarine(fixture);
  assert.equal(b.id, "12345");
  assert.equal(b.titre, "SEALINE C390");
  assert.equal(b.slug, "sealine-c390-12345");
  assert.equal(b.categorie, "bateaux-moteur");
  assert.equal(b.etat, "neuf");
  assert.equal(b.prix, 700000);
  assert.equal(b.devise, "EUR");
  assert.equal(b.specs["Longueur (m)"], "11.99");
  assert.equal(b.specs["Année"], "2026");
  assert.equal(b.photos.length, 2);
  assert.equal(b.description, "Exemple de description & caractères spéciaux.");
  assert.equal(b.source, "boatsgroup");
});

test("champ absent = null ou a_confirmer, jamais inventé", () => {
  const [, b] = parseOpenMarine(fixture);
  assert.equal(b.prix, null);
  assert.equal(b.etat, "occasion");
  assert.equal(b.categorie, "voiliers");
  assert.equal(b.sous_categorie, "a_confirmer");
  assert.equal(b.updated_at, "a_confirmer");
  assert.equal(b.photos.length, 0);
});
