import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BUDGETS,
  HORIZONS,
  NATURES,
  TYPES_RECHERCHE,
  labelDe,
  lignesRecapProjet,
} from "../lib/projet.ts";

// Test du mapping valeur vers libellé (retours client V4, W1) : aucun
// rendu ne doit montrer de valeur brute pour un champ à choix.

const LISTES = { NATURES, BUDGETS, HORIZONS, TYPES_RECHERCHE };

test("chaque valeur de chaque liste mappe vers son libellé humain", () => {
  for (const [nom, liste] of Object.entries(LISTES)) {
    for (const option of liste) {
      assert.equal(
        labelDe(liste, option.valeur),
        option.label,
        `${nom} : ${option.valeur}`
      );
    }
  }
});

test("les libellés ne sont jamais les valeurs techniques", () => {
  for (const liste of Object.values(LISTES)) {
    for (const option of liste) {
      const { valeur, label } = option as { valeur: string; label: string };
      if (valeur !== "") {
        assert.notEqual(label, valeur);
      }
    }
  }
});

test("le récapitulatif ne contient que des libellés, jamais de valeur brute", () => {
  const recap = lignesRecapProjet({
    nature: "achat-occasion",
    type_recherche: "motor-yacht",
    budget: "100-250",
    horizon: "3-6-mois",
    nom: "Jean Testeur",
    telephone: "+33 6 00 00 00 00",
    email: "jean@exemple.fr",
    message: "Bonjour",
  }).join("\n");
  for (const liste of Object.values(LISTES)) {
    for (const option of liste) {
      const { valeur, label } = option as { valeur: string; label: string };
      if (valeur && valeur !== label) {
        assert.ok(
          !recap.includes(`: ${valeur}`),
          `valeur brute « ${valeur} » dans le récapitulatif`
        );
      }
    }
  }
  assert.ok(recap.includes("Type recherché : Motor yacht"));
  assert.ok(recap.includes("Budget : 100 000 à 250 000 €"));
  assert.ok(recap.includes("Message : Bonjour"));
});

test("les lignes optionnelles vides sont omises", () => {
  const recap = lignesRecapProjet({
    nature: "achat-neuf",
    budget: "a-definir",
    horizon: "plus-tard",
    nom: "A",
    telephone: "0",
    email: "a@b.fr",
  });
  assert.ok(!recap.some((l) => l.startsWith("Type recherché")));
  assert.ok(!recap.some((l) => l.startsWith("Message")));
  assert.ok(!recap.some((l) => l.startsWith("Annonce")));
});

test("labelDe retombe sur la valeur pour une entrée inconnue", () => {
  assert.equal(labelDe(NATURES, "inconnue"), "inconnue");
});
