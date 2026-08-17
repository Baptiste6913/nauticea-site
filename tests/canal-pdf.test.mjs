import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import {
  PAGES_MAX_PDF,
  TAILLE_MAX_PDF,
  lirePdf,
  normaliserTexte,
} from "../lib/ingest/pdf.ts";
import {
  A_CONFIRMER,
  LIBELLES_RECONNUS,
  conditionDepuisFiche,
  lireFichePdf,
  longueurEnMetres,
  montantDepuisFiche,
  sansPiedDePage,
} from "../lib/ingest/fiche-pdf.ts";
import {
  DESSIN_MIN_POINTS,
  PIXELS_BASSE_DEF,
  PIXELS_MIN,
  trierPhotos,
} from "../lib/ingest/photos.ts";
import {
  annonceDepuisFiche,
  doublonsPossibles,
  rapprocher,
  slugDeFiche,
  slugifier,
} from "../lib/ingest/annonce.ts";

// Canal fiche PDF BoatWizard (17/08) : le canal officiel d'alimentation du
// site. Les fixtures sont de vraies fiches, gardées dans ingest-fixtures/,
// et couvrent le mono-moteur, le bi-moteur, le bateau neuf, la fiche sans
// toilettes et la fiche à description constructeur.

const FIXTURES = path.join(process.cwd(), "ingest-fixtures");

function fixture(nom) {
  return new Uint8Array(fs.readFileSync(path.join(FIXTURES, nom)));
}

const TOUTES = [
  "2010-Beneteau-Monte_Carlo_42.pdf",
  "2018-Prestige-630.pdf",
  "2019-Fountaine_Pajot-Motor_Yacht_40.pdf",
  "2021-Sealine-C335.pdf",
  "2023-RYCK-280.pdf",
];

// ---------- 1. Conversions ----------

test("longueur : « 12 m 82 cm » vaut 12,82 m", () => {
  assert.equal(longueurEnMetres("12 m 82 cm"), 12.82);
  assert.equal(longueurEnMetres("19 m 3 cm"), 19.03);
  assert.equal(longueurEnMetres("0 m 66 cm"), 0.66);
  assert.equal(longueurEnMetres("12 m"), 12);
  assert.equal(longueurEnMetres("12.8 m"), 12.8);
  assert.equal(longueurEnMetres("9 m 99 cm"), 9.99);
});

test("longueur : forme inattendue rend null plutôt qu'une approximation", () => {
  for (const brut of ["", "douze mètres", "12", "12 m 120 cm", "12 pieds", "m 82 cm"]) {
    assert.equal(longueurEnMetres(brut), null, brut);
  }
});

test("prix : « €160,000 » vaut 160000 EUR", () => {
  assert.deepEqual(montantDepuisFiche("€160,000"), { prix: 160000, devise: "EUR" });
  assert.deepEqual(montantDepuisFiche("€1,100,000"), {
    prix: 1100000,
    devise: "EUR",
  });
  assert.deepEqual(montantDepuisFiche("£95,000"), { prix: 95000, devise: "GBP" });
  assert.deepEqual(montantDepuisFiche("$250,000"), { prix: 250000, devise: "USD" });
  assert.deepEqual(montantDepuisFiche("CHF 80,000"), { prix: 80000, devise: "CHF" });
});

test("prix : devise hors liste blanche ou forme illisible neutralise le montant", () => {
  for (const brut of ["₿160,000", "160000", "", "prix sur demande", "€ zéro"]) {
    const m = montantDepuisFiche(brut);
    assert.equal(m.prix, null, brut);
    assert.equal(m.devise, "EUR");
    assert.ok(m.raison, `une raison doit accompagner le refus de « ${brut} »`);
  }
});

test("état : Occasion et Neufs reconnus, le reste à confirmer", () => {
  assert.equal(conditionDepuisFiche("Occasion"), "occasion");
  assert.equal(conditionDepuisFiche("Neufs"), "neuf");
  assert.equal(conditionDepuisFiche("Neuf"), "neuf");
  assert.equal(conditionDepuisFiche("Semi-neuf"), A_CONFIRMER);
  assert.equal(conditionDepuisFiche(""), A_CONFIRMER);
});

test("ligatures typographiques normalisées, sinon aucun libellé ne se retrouve", () => {
  assert.equal(normaliserTexte("vériﬁées"), "vérifiées");
  assert.equal(normaliserTexte("eﬀectué"), "effectué");
  assert.equal(normaliserTexte("Statut ﬁscal"), "Statut fiscal");
});

test("tiret cadratin ramené au demi-cadratin, mots intacts", () => {
  // Le harnais refuse le cadratin jusque dans le rendu : sans cette
  // normalisation, une description légitime bloquerait l'ingestion.
  assert.equal(
    normaliserTexte("Bateau pr\u00eat \u2014 sans d\u00e9lai"),
    "Bateau pr\u00eat \u2013 sans d\u00e9lai"
  );
  for (const nom of TOUTES) {
    const r = lireFichePdf(fixture(nom));
    const tout = `${r.fiche.description}${r.fiche.description_constructeur}${JSON.stringify(
      r.fiche.caracteristiques
    )}${JSON.stringify(r.fiche.equipements)}`;
    assert.ok(!tout.includes("\u2014"), `${nom} contient un tiret cadratin`);
  }
});

// ---------- 2. Lecture des cinq fiches ----------

test("les cinq fiches se lisent sans avertissement de lecture", () => {
  for (const nom of TOUTES) {
    const r = lirePdf(fixture(nom));
    assert.equal(r.ok, true, nom);
    assert.deepEqual(r.document.avertissements, [], nom);
    assert.ok(r.document.lignes.length > 80, `${nom} : ${r.document.lignes.length} lignes`);
    assert.ok(r.document.images.length > 10, nom);
  }
});

test("chaque fiche rend les champs structurants, sans libellé non reconnu", () => {
  const attendus = {
    "2010-Beneteau-Monte_Carlo_42.pdf": {
      marque: "Beneteau",
      modele: "Monte Carlo 42",
      annee: "2010",
      longueur: 12.82,
      largeur: 3.93,
      prix: 160000,
      condition: "occasion",
      moteurs: 2,
    },
    "2018-Prestige-630.pdf": {
      marque: "Prestige",
      modele: "630",
      annee: "2018",
      longueur: 19.03,
      largeur: 5.13,
      prix: 1100000,
      condition: "occasion",
      moteurs: 2,
    },
    "2019-Fountaine_Pajot-Motor_Yacht_40.pdf": {
      marque: "Fountaine Pajot",
      modele: "Motor Yacht 40",
      annee: "2019",
      longueur: 12.25,
      largeur: 5.96,
      prix: 490000,
      condition: "occasion",
      moteurs: 2,
    },
    "2021-Sealine-C335.pdf": {
      marque: "Sealine",
      modele: "C335",
      annee: "2021",
      longueur: 9.99,
      largeur: 3.5,
      prix: 325000,
      condition: "occasion",
      moteurs: 2,
    },
    "2023-RYCK-280.pdf": {
      marque: "RYCK",
      modele: "280",
      annee: "2023",
      longueur: 8.79,
      largeur: 2.82,
      prix: 130000,
      condition: "neuf",
      moteurs: 1,
    },
  };
  for (const [nom, attendu] of Object.entries(attendus)) {
    const r = lireFichePdf(fixture(nom));
    assert.equal(r.ok, true, nom);
    const f = r.fiche;
    assert.equal(f.marque, attendu.marque, nom);
    assert.equal(f.modele, attendu.modele, nom);
    assert.equal(f.annee, attendu.annee, nom);
    assert.equal(f.longueur, attendu.longueur, nom);
    assert.equal(f.largeur, attendu.largeur, nom);
    assert.equal(f.prix, attendu.prix, nom);
    assert.equal(f.devise, "EUR", nom);
    assert.equal(f.condition, attendu.condition, nom);
    assert.equal(f.moteurs.length, attendu.moteurs, nom);
    assert.deepEqual(f.avertissements, [], `${nom} : libellés non reconnus`);
    assert.ok(f.equipements.length >= 2, nom);
    assert.ok(f.description.length > 200, nom);
  }
});

test("bi-moteur : les deux blocs sont lus, avec leurs heures", () => {
  const r = lireFichePdf(fixture("2010-Beneteau-Monte_Carlo_42.pdf"));
  assert.equal(r.ok, true);
  const [un, deux] = r.fiche.moteurs;
  assert.equal(un.numero, 1);
  assert.equal(deux.numero, 2);
  for (const m of [un, deux]) {
    assert.equal(m.marque, "Volvo");
    assert.equal(m.modele, "D6-370");
    assert.equal(m.heures, "700");
    assert.equal(m.carburant, "Diesel");
    assert.equal(m.entrainement, "Stern Drive");
  }
});

test("mono-moteur neuf : puissance lue, heures absentes donc à confirmer", () => {
  const r = lireFichePdf(fixture("2023-RYCK-280.pdf"));
  assert.equal(r.ok, true);
  const [moteur] = r.fiche.moteurs;
  assert.equal(moteur.marque, "MERCURY");
  assert.equal(moteur.puissance, "300 hp");
  assert.equal(moteur.heures, A_CONFIRMER);
  assert.ok(
    r.fiche.a_confirmer.some((m) => m.includes("heures")),
    "l'absence doit figurer au rapport"
  );
});

test("champ absent : jamais deviné, toujours au rapport", () => {
  // La fiche Sealine C335 ne porte pas de nombre de toilettes.
  const r = lireFichePdf(fixture("2021-Sealine-C335.pdf"));
  assert.equal(r.ok, true);
  assert.equal(r.fiche.toilettes, A_CONFIRMER);
  assert.ok(
    r.fiche.a_confirmer.some((m) => m.includes("toilettes")),
    `attendu une entrée sur les toilettes, obtenu ${JSON.stringify(r.fiche.a_confirmer)}`
  );
});

test("statut fiscal : lu tel quel, y compris « Non payé »", () => {
  const paye = lireFichePdf(fixture("2010-Beneteau-Monte_Carlo_42.pdf"));
  assert.equal(paye.fiche.statut_fiscal, "Payé");
  const nonPaye = lireFichePdf(fixture("2019-Fountaine_Pajot-Motor_Yacht_40.pdf"));
  assert.equal(nonPaye.fiche.statut_fiscal, "Non payé");
  // Le pavillon accolé au statut en tête de fiche est retiré, mais
  // seulement parce que la grille le confirme.
  const avecPavillon = lireFichePdf(fixture("2018-Prestige-630.pdf"));
  assert.equal(avecPavillon.fiche.statut_fiscal, "Payé");
  assert.equal(
    avecPavillon.fiche.caracteristiques["Pavillon d'immatriculation"],
    "France"
  );
});

test("chaque libellé reconnu est bien présent dans au moins une fiche", () => {
  // Garde contre un libellé fantôme : la table de correspondance ne doit
  // décrire que des libellés réellement produits par le générateur.
  const vus = new Set();
  for (const nom of TOUTES) {
    for (const cle of Object.keys(lireFichePdf(fixture(nom)).fiche.caracteristiques)) {
      vus.add(cle);
    }
  }
  for (const libelle of LIBELLES_RECONNUS) {
    assert.ok(vus.has(libelle), `libellé « ${libelle} » absent des cinq fiches`);
  }
});

// ---------- 3. Ce qui ne doit jamais être importé ----------

test("pied de page vendeur jamais importé", () => {
  for (const nom of TOUTES) {
    const r = lireFichePdf(fixture(nom));
    const tout = [
      r.fiche.description,
      r.fiche.description_constructeur,
      JSON.stringify(r.fiche.caracteristiques),
      JSON.stringify(r.fiche.equipements),
      r.fiche.titre,
    ].join("\n");
    assert.ok(!tout.includes("contact@nauticeayachting.fr"), nom);
    assert.ok(!tout.includes("06 12 98 86 61"), nom);
    assert.ok(!tout.includes("http://nauticeayachting.fr/"), nom);
    assert.ok(!tout.includes("Residence l Amiraute"), nom);
  }
});

test("avis de non-responsabilité jamais importé, sous ses deux intitulés", () => {
  for (const nom of TOUTES) {
    const r = lireFichePdf(fixture(nom));
    const tout = `${r.fiche.description}\n${r.fiche.description_constructeur}`;
    assert.ok(!tout.includes("sous réserve d'une vente préalable"), nom);
    assert.ok(!tout.includes("de bonne foi mais"), nom);
  }
});

test("le retrait du pied de page ne mange pas la grille", () => {
  // Les libellés qui se poursuivent en petit corps, comme « coque: », sont
  // dans le corps de page : les retirer casserait la grille.
  const r = lirePdf(fixture("2010-Beneteau-Monte_Carlo_42.pdf"));
  const gardees = sansPiedDePage(r.document.lignes);
  assert.ok(gardees.some((l) => l.texte === "coque:"));
  assert.ok(!gardees.some((l) => l.texte.includes("contact@")));
});

// ---------- 4. Photos ----------

test("logo écarté, photos gardées dans l'ordre de la fiche", () => {
  const r = lirePdf(fixture("2010-Beneteau-Monte_Carlo_42.pdf"));
  const tri = trierPhotos(r.document.images);
  const logos = tri.rejetees.filter((p) => p.motif === "logo-ou-pictogramme");
  assert.equal(logos.length, 1, "un seul logo sur la fiche");
  assert.ok(logos[0].image.largeurDessin < DESSIN_MIN_POINTS);
  assert.equal(tri.retenues.length, 24);
  assert.deepEqual(
    tri.retenues.map((p) => p.rang),
    Array.from({ length: 24 }, (_, i) => i + 1)
  );
  // L'ordre de publication suit l'ordre de dessin de la fiche.
  const rangsSource = tri.retenues.map((p) => p.image.rang);
  assert.deepEqual(rangsSource, [...rangsSource].sort((a, b) => a - b));
});

test("photos sous le seuil écartées, photos basse définition signalées", () => {
  const r = lirePdf(fixture("2010-Beneteau-Monte_Carlo_42.pdf"));
  const tri = trierPhotos(r.document.images);
  const petites = tri.rejetees.filter((p) => p.motif === "resolution-insuffisante");
  assert.equal(petites.length, 4, "les quatre vignettes de tête sont trop petites");
  for (const p of petites) {
    assert.ok(Math.max(p.image.largeur, p.image.hauteur) < PIXELS_MIN);
  }
  const basseDef = tri.retenues.filter((p) => p.basseDef);
  assert.equal(basseDef.length, 23);
  for (const p of basseDef) {
    assert.ok(Math.max(p.image.largeur, p.image.hauteur) < PIXELS_BASSE_DEF);
  }
});

test("les cinq fiches donnent au moins dix photos exploitables", () => {
  for (const nom of TOUTES) {
    const r = lirePdf(fixture(nom));
    const tri = trierPhotos(r.document.images);
    assert.ok(tri.retenues.length >= 10, `${nom} : ${tri.retenues.length} photos`);
    assert.equal(
      tri.rejetees.filter((p) => p.motif === "logo-ou-pictogramme").length,
      1,
      nom
    );
  }
});

// ---------- 5. Annonce ----------

test("slug d'un bateau nouveau : marque, modèle, année", () => {
  const r = lireFichePdf(fixture("2023-RYCK-280.pdf"));
  assert.equal(slugDeFiche(r.fiche), "ryck-280-2023");
  const fp = lireFichePdf(fixture("2019-Fountaine_Pajot-Motor_Yacht_40.pdf"));
  assert.equal(slugDeFiche(fp.fiche), "fountaine-pajot-motor-yacht-40-2019");
});

test("bateau déjà en ligne : son slug est conservé, jamais dupliqué", () => {
  const r = lireFichePdf(fixture("2010-Beneteau-Monte_Carlo_42.pdf"));
  const corpus = JSON.parse(
    fs.readFileSync(
      path.join(process.cwd(), "corpus-nauticea", "bateaux.json"),
      "utf-8"
    )
  );
  const { annonce: existante } = rapprocher(r.fiche, corpus);
  assert.ok(existante, "l'annonce du corpus doit être reconnue");
  assert.equal(existante.slug, "beneteau-monte-carlo-42-543");
  const { annonce } = annonceDepuisFiche(r.fiche, {
    photos: ["/annonces/beneteau-monte-carlo-42-543/01.jpg"],
    photosBasseDef: 1,
    date: "2026-08-17",
    existante,
  });
  assert.equal(annonce.slug, "beneteau-monte-carlo-42-543");
  assert.notEqual(annonce.slug, slugDeFiche(r.fiche));
  assert.equal(annonce.source, "fiche-pdf");
  assert.equal(annonce.ancienne_url, existante.ancienne_url);
});

test("mise à jour : une spécification que la fiche ne donne pas est conservée", () => {
  const r = lireFichePdf(fixture("2010-Beneteau-Monte_Carlo_42.pdf"));
  const existante = {
    id: "543",
    slug: "beneteau-monte-carlo-42-543",
    titre: "BENETEAU MONTE CARLO 42",
    marque: "BENETEAU",
    modele: "MONTE CARLO 42",
    categorie: "bateaux-moteur",
    sous_categorie: "vedette",
    etat: "occasion",
    prix: 160000,
    devise: "EUR",
    specs: { "Puissance CV": "370" },
    equipements: [],
    photos: ["/annonces/beneteau-monte-carlo-42-543/01.jpg"],
    description: "ancienne",
    contact: "Bruno BOUAULT",
    ancienne_url: "/annonces-bateaux-occasion/29-vedette/543-monte-carlo-42.html",
    updated_at: "2026-08-14",
    source: "corpus",
  };
  const { annonce, notes } = annonceDepuisFiche(r.fiche, {
    photos: [],
    photosBasseDef: 0,
    date: "2026-08-17",
    existante,
  });
  assert.equal(annonce.specs["Puissance CV"], "370");
  assert.ok(notes.some((n) => n.includes("Puissance CV")));
  assert.equal(annonce.contact, "Bruno BOUAULT");
  // Sans photo retenue, celles en ligne sont gardées plutôt qu'effacées.
  assert.deepEqual(annonce.photos, existante.photos);
});

test("classement incertain : catégorie par défaut mais réserve au rapport", () => {
  const r = lireFichePdf(fixture("2019-Fountaine_Pajot-Motor_Yacht_40.pdf"));
  const { annonce, notes } = annonceDepuisFiche(r.fiche, {
    photos: [],
    photosBasseDef: 0,
    date: "2026-08-17",
  });
  assert.equal(annonce.categorie, "bateaux-moteur");
  assert.ok(
    notes.some((n) => n.includes("catégorie")),
    "la fiche ne dit pas que ce Fountaine Pajot est un catamaran"
  );
});

test("deux annonces du même modèle : l'année tranche", () => {
  // Le catalogue porte deux Sealine C335, un neuf de 2026 et une occasion
  // de 2021. Confondre les deux écraserait la mauvaise annonce.
  const r = lireFichePdf(fixture("2021-Sealine-C335.pdf"));
  const corpus = JSON.parse(
    fs.readFileSync(
      path.join(process.cwd(), "corpus-nauticea", "bateaux.json"),
      "utf-8"
    )
  );
  const candidates = corpus.filter(
    (b) => slugifier(`${b.marque} ${b.modele}`) === "sealine-c335"
  );
  assert.equal(candidates.length, 2, "le piège doit bien être présent");
  const { annonce, note } = rapprocher(r.fiche, corpus);
  assert.equal(annonce.slug, "sealine-c335-520");
  assert.equal(annonce.specs["Année"], "2021");
  assert.ok(note, "le rapprochement par l'année doit être signalé");
});

test("aucune année pour trancher : refus de choisir, candidates rendues", () => {
  const r = lireFichePdf(fixture("2021-Sealine-C335.pdf"));
  const sansAnnee = [
    {
      slug: "sealine-c335-a",
      marque: "SEALINE",
      modele: "C335",
      etat: "occasion",
      prix: 1,
      devise: "EUR",
      specs: {},
    },
    {
      slug: "sealine-c335-b",
      marque: "Sealine",
      modele: "c335",
      etat: "neuf",
      prix: 2,
      devise: "EUR",
      specs: { "Année": "2019" },
    },
  ];
  const resultat = rapprocher(r.fiche, sansAnnee);
  assert.equal(resultat.annonce, undefined);
  assert.equal(resultat.ambigues.length, 2);
});

test("modèle nommé autrement sur le site : doublon possible signalé", () => {
  // La fiche dit « Motor Yacht 40 », le site dit « MY40 » : le
  // rapprochement échoue, et sans garde une seconde annonce naîtrait pour
  // le même bateau.
  const r = lireFichePdf(fixture("2019-Fountaine_Pajot-Motor_Yacht_40.pdf"));
  const corpus = JSON.parse(
    fs.readFileSync(
      path.join(process.cwd(), "corpus-nauticea", "bateaux.json"),
      "utf-8"
    )
  );
  assert.deepEqual(rapprocher(r.fiche, corpus), {}, "aucun rapprochement attendu");
  const doublons = doublonsPossibles(r.fiche, corpus);
  assert.equal(doublons.length, 1);
  assert.equal(doublons[0].slug, "fountaine-pajot-my40-532");
});

test("doublon possible : aucun faux positif sur une marque à plusieurs bateaux", () => {
  // Le catalogue porte de nombreux Sealine : le rapprochement de la fiche
  // C335 réussit, et rien ne doit alors être signalé en doublon.
  const r = lireFichePdf(fixture("2021-Sealine-C335.pdf"));
  const corpus = JSON.parse(
    fs.readFileSync(
      path.join(process.cwd(), "corpus-nauticea", "bateaux.json"),
      "utf-8"
    )
  );
  const doublons = doublonsPossibles(r.fiche, corpus);
  for (const d of doublons) {
    assert.notEqual(
      slugifier(`${d.marque} ${d.modele}`),
      "sealine-c335",
      "l'annonce rapprochée ne doit pas être comptée en doublon"
    );
  }
});

test("bateau inconnu du catalogue : aucun rapprochement, donc annonce nouvelle", () => {
  const r = lireFichePdf(fixture("2023-RYCK-280.pdf"));
  const resultat = rapprocher(r.fiche, []);
  assert.deepEqual(resultat, {});
});

test("slugifier : accents et ponctuation ramenés à des tirets", () => {
  assert.equal(slugifier("Fountaine Pajot"), "fountaine-pajot");
  assert.equal(slugifier("Vedettes de croisière"), "vedettes-de-croisiere");
  assert.equal(slugifier("  --SEALINE  C335V-- "), "sealine-c335v");
});

// ---------- 6. Fiches hostiles ----------

function pdfSynthetique(nombrePages) {
  const objets = [];
  const enfants = [];
  for (let i = 0; i < nombrePages; i += 1) {
    const numero = 3 + i;
    enfants.push(`${numero} 0 R`);
    objets.push(
      `${numero} 0 obj\n<</Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 595 842]>>\nendobj\n`
    );
  }
  return new Uint8Array(
    Buffer.from(
      `%PDF-1.4\n` +
        `1 0 obj\n<</Type /Catalog\n/Pages 2 0 R>>\nendobj\n` +
        `2 0 obj\n<</Type /Pages\n/Kids [${enfants.join(" ")}]\n/Count ${nombrePages}>>\nendobj\n` +
        objets.join("") +
        `trailer\n<</Size ${nombrePages + 3}\n/Root 1 0 R>>\n%%EOF\n`,
      "latin1"
    )
  );
}

test("fiche vide, fichier qui n'est pas un PDF, contenu binaire : refus propre", () => {
  const cas = [
    [new Uint8Array(0), /vide/],
    [new Uint8Array(Buffer.from("bonjour", "latin1")), /%PDF/],
    [new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]), /%PDF/],
    [new Uint8Array(Buffer.from("%PDF-1.4\nn'importe quoi\n", "latin1")), /page/],
  ];
  for (const [octets, motif] of cas) {
    const r = lirePdf(octets);
    assert.equal(r.ok, false);
    assert.match(r.erreur, motif);
    // La même entrée passée au parseur métier ne lève pas davantage.
    const f = lireFichePdf(octets);
    assert.equal(f.ok, false);
  }
});

test("fiche trop lourde : refusée sur la borne, sans lecture", () => {
  const gros = new Uint8Array(TAILLE_MAX_PDF + 1);
  gros.set(Buffer.from("%PDF-1.4\n", "latin1"), 0);
  const r = lirePdf(gros);
  assert.equal(r.ok, false);
  assert.match(r.erreur, /au-dessus de la borne/);
});

test("fiche trop longue : refusée sur le nombre de pages", () => {
  const juste = lirePdf(pdfSynthetique(PAGES_MAX_PDF));
  assert.equal(juste.ok, true, "la borne elle-même reste acceptée");
  assert.equal(juste.document.pages, PAGES_MAX_PDF);

  const trop = lirePdf(pdfSynthetique(PAGES_MAX_PDF + 1));
  assert.equal(trop.ok, false);
  assert.match(trop.erreur, /pages, au-dessus de la borne/);
});

test("flux compressé corrompu : avertissement, jamais d'exception", () => {
  // Objet de contenu dont le flux annonce du Flate sans en être.
  const brut =
    `%PDF-1.4\n` +
    `1 0 obj\n<</Type /Catalog\n/Pages 2 0 R>>\nendobj\n` +
    `2 0 obj\n<</Type /Pages\n/Kids [3 0 R]\n/Count 1>>\nendobj\n` +
    `3 0 obj\n<</Type /Page\n/Parent 2 0 R\n/Contents 4 0 R\n/MediaBox [0 0 595 842]>>\nendobj\n` +
    `4 0 obj\n<</Length 9\n/Filter /FlateDecode>>\nstream\nPAS ZLIB!\nendstream\nendobj\n` +
    `trailer\n<</Size 5\n/Root 1 0 R>>\n%%EOF\n`;
  const r = lirePdf(new Uint8Array(Buffer.from(brut, "latin1")));
  assert.equal(r.ok, true, "le document reste lisible, seul le flux est perdu");
  assert.equal(r.document.lignes.length, 0);
  assert.ok(r.document.avertissements.some((a) => a.includes("illisible")));
});

test("bombe de décompression : bornée par la taille maximale de flux", () => {
  // Un flux qui se déplierait au-delà de la borne doit être signalé, pas
  // décompressé en mémoire.
  const charge = zlib.deflateSync(Buffer.alloc(96 * 1024 * 1024));
  const entete =
    `%PDF-1.4\n` +
    `1 0 obj\n<</Type /Catalog\n/Pages 2 0 R>>\nendobj\n` +
    `2 0 obj\n<</Type /Pages\n/Kids [3 0 R]\n/Count 1>>\nendobj\n` +
    `3 0 obj\n<</Type /Page\n/Parent 2 0 R\n/Contents 4 0 R\n/MediaBox [0 0 595 842]>>\nendobj\n` +
    `4 0 obj\n<</Length ${charge.byteLength}\n/Filter /FlateDecode>>\nstream\n`;
  const fin = `\nendstream\nendobj\ntrailer\n<</Size 5\n/Root 1 0 R>>\n%%EOF\n`;
  const octets = Buffer.concat([
    Buffer.from(entete, "latin1"),
    charge,
    Buffer.from(fin, "latin1"),
  ]);
  const r = lirePdf(new Uint8Array(octets));
  assert.equal(r.ok, true);
  assert.ok(r.document.avertissements.some((a) => a.includes("illisible")));
});

test("fiche valide mais sans texte exploitable : refus explicite", () => {
  const r = lireFichePdf(pdfSynthetique(2));
  assert.equal(r.ok, false);
  assert.match(r.erreur, /aucun texte exploitable/);
});
