import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_IMAGES_PAR_ANNONCE,
  filtrerImages,
  hotesAutorises,
  parseOpenMarine,
  verdictImage,
} from "../lib/sources/boatsgroup.ts";
import { DEVISES_AUTORISEES, deviseAutorisee, formatPrix } from "../lib/format.ts";
import { telechargerBorne } from "../scripts/telechargement.mts";

// Durcissement du flux (17/08) : devise en liste blanche, images en liste
// blanche de domaines, téléchargements bornés. Un flux hostile ne doit ni
// faire lever d'exception au rendu, ni faire échouer la synchronisation.

function annonce(champs) {
  const balises = Object.entries(champs)
    .map(([k, v]) => `<${k}>${v}</${k}>`)
    .join("");
  return `<OpenMarine><Vehicle>${balises}</Vehicle></OpenMarine>`;
}

// ---------- 1. Devise ----------

test("devise hors liste blanche : prix en Prix sur demande et anomalie signalée", () => {
  const vues = [];
  const [b] = parseOpenMarine(
    annonce({
      VehicleID: "1",
      MakeString: "SEALINE",
      Model: "C390",
      Price: "700000",
      Currency: "HOSTILE",
    }),
    { signaler: (a) => vues.push(a) }
  );
  assert.equal(b.prix, null, "le prix doit être neutralisé");
  assert.equal(formatPrix(b.prix, b.devise), "Prix sur demande");
  assert.equal(vues.length, 1);
  assert.equal(vues[0].type, "devise-inconnue");
  assert.equal(vues[0].detail, "HOSTILE");
  assert.ok(deviseAutorisee(b.devise), "la devise stockée reste dans la liste");
});

test("les quatre devises autorisées passent et gardent leur prix", () => {
  for (const devise of DEVISES_AUTORISEES) {
    const vues = [];
    const [b] = parseOpenMarine(
      annonce({ VehicleID: "1", MakeString: "M", Model: "X", Price: "1000", Currency: devise }),
      { signaler: (a) => vues.push(a) }
    );
    assert.equal(b.prix, 1000, devise);
    assert.equal(b.devise, devise);
    assert.equal(vues.length, 0, `aucune anomalie attendue pour ${devise}`);
    assert.notEqual(formatPrix(b.prix, b.devise), "Prix sur demande");
  }
});

test("formatPrix ne lève jamais, quelle que soit l'entrée", () => {
  const entrees = [
    [1000, "HOSTILE"],
    [1000, ""],
    [1000, "eur"],
    [1000, "€€€"],
    [1000, "12"],
    [Number.NaN, "EUR"],
    [Number.POSITIVE_INFINITY, "EUR"],
    [-5000, "EUR"],
    [0, "EUR"],
    [null, "EUR"],
  ];
  for (const [prix, devise] of entrees) {
    let rendu;
    assert.doesNotThrow(() => {
      rendu = formatPrix(prix, devise);
    }, `formatPrix(${prix}, ${devise}) a levé`);
    assert.equal(rendu, "Prix sur demande");
  }
});

test("une devise inconnue ferait lever Intl : la garde est donc nécessaire", () => {
  // Vérifie l'hypothèse du durcissement plutôt que de la supposer.
  assert.throws(
    () => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "HOSTILE" }),
    RangeError
  );
});

// ---------- 2. Liste blanche de domaines ----------

test("hotesAutorises analyse la variable, tolère espaces et casse", () => {
  assert.deepEqual(hotesAutorises(undefined), []);
  assert.deepEqual(hotesAutorises(""), []);
  assert.deepEqual(hotesAutorises("  "), []);
  assert.deepEqual(
    hotesAutorises(" Images.BoatsGroup.com , cdn.example.net ,"),
    ["images.boatsgroup.com", "cdn.example.net"]
  );
});

test("hôte autorisé accepté, casse de l'URL indifférente", () => {
  const hotes = ["images.boatsgroup.com"];
  const v = verdictImage("https://Images.BoatsGroup.com/a/photo.jpg", hotes);
  assert.equal(v.retenue, true);
  assert.equal(v.url, "https://images.boatsgroup.com/a/photo.jpg");
});

test("hôte hors liste refusé, avec l'hôte en détail pour le rapport", () => {
  const v = verdictImage("https://pirate.invalid/photo.jpg", ["images.boatsgroup.com"]);
  assert.equal(v.retenue, false);
  assert.equal(v.type, "image-hote-refuse");
  assert.equal(v.detail, "pirate.invalid");
});

test("liste blanche vide : tout est refusé (mode découverte du premier run)", () => {
  const v = verdictImage("https://images.boatsgroup.com/photo.jpg", []);
  assert.equal(v.retenue, false);
  assert.equal(v.type, "image-hote-refuse");
});

test("schémas dangereux refusés même si le domaine est autorisé", () => {
  for (const brut of [
    "javascript:alert(1)",
    "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=",
    "file:///etc/passwd",
    "ftp://images.boatsgroup.com/photo.jpg",
  ]) {
    const v = verdictImage(brut, ["images.boatsgroup.com", ""]);
    assert.equal(v.retenue, false, brut);
    assert.ok(
      v.type === "image-schema-refuse" || v.type === "image-url-illisible",
      `${brut} -> ${v.type}`
    );
  }
});

test("URL illisible refusée sans lever", () => {
  const v = verdictImage("pas une url", ["images.boatsgroup.com"]);
  assert.equal(v.retenue, false);
  assert.equal(v.type, "image-url-illisible");
});

// ---------- 3. Plafond d'images par annonce ----------

test("plafond d'images respecté, troncature signalée", () => {
  const hotes = ["images.boatsgroup.com"];
  const urls = Array.from(
    { length: MAX_IMAGES_PAR_ANNONCE + 12 },
    (_, i) => `https://images.boatsgroup.com/p${i}.jpg`
  );
  const { retenues, refus } = filtrerImages(urls, hotes);
  assert.equal(retenues.length, MAX_IMAGES_PAR_ANNONCE);
  assert.ok(refus.some((r) => r.type === "images-tronquees"));
});

test("mélange d'URLs saines et hostiles : les saines passent, les autres sont listées", () => {
  const { retenues, refus } = filtrerImages(
    [
      "https://images.boatsgroup.com/ok-1.jpg",
      "javascript:alert(1)",
      "https://pirate.invalid/vol.jpg",
      "https://images.boatsgroup.com/ok-2.jpg",
    ],
    ["images.boatsgroup.com"]
  );
  assert.equal(retenues.length, 2);
  assert.equal(refus.length, 2);
});

// ---------- 4. Téléchargements bornés ----------

function reponse(octets, entetes = {}) {
  return new Response(octets, { status: 200, headers: entetes });
}

test("téléchargement nominal : octets rendus", async () => {
  const charge = new Uint8Array([1, 2, 3, 4]);
  const r = await telechargerBorne("https://h/ok.jpg", {
    fetchImpl: async () => reponse(charge, { "content-length": "4" }),
  });
  assert.equal(r.ok, true);
  assert.equal(r.octets.byteLength, 4);
});

test("taille annoncée au-dessus de la borne : refus sans lire le corps", async () => {
  let corpsLu = false;
  const r = await telechargerBorne("https://h/gros.jpg", {
    tailleMax: 100,
    fetchImpl: async () => {
      // Stratégie de file à zéro : pull() n'est alors appelé qu'à la
      // première lecture réelle du consommateur, alors que start(), ou
      // pull() avec la file par défaut, s'exécute dès la construction.
      const flux = new ReadableStream(
        {
          pull(c) {
            corpsLu = true;
            c.enqueue(new Uint8Array(500));
            c.close();
          },
        },
        { highWaterMark: 0 }
      );
      return new Response(flux, {
        status: 200,
        headers: { "content-length": "500" },
      });
    },
  });
  assert.equal(r.ok, false);
  assert.match(r.erreur, /taille annoncée/);
  assert.equal(corpsLu, false, "le corps ne doit pas être lu");
});

test("taille annoncée mensongère : la lecture est coupée au dépassement", async () => {
  const r = await telechargerBorne("https://h/menteur.jpg", {
    tailleMax: 100,
    fetchImpl: async () => {
      const flux = new ReadableStream({
        start(c) {
          c.enqueue(new Uint8Array(80));
          c.enqueue(new Uint8Array(80));
          c.close();
        },
      });
      return new Response(flux, { status: 200, headers: { "content-length": "10" } });
    },
  });
  assert.equal(r.ok, false);
  assert.match(r.erreur, /flux au-dessus de la borne/);
});

test("délai dépassé : erreur rendue, aucune exception", async () => {
  const r = await telechargerBorne("https://h/lent.jpg", {
    delaiMs: 20,
    fetchImpl: (_url, options) =>
      new Promise((_resoudre, rejeter) => {
        // Le minuteur d'AbortSignal.timeout ne retient pas la boucle
        // d'événements : cette garde évite que le test soit annulé avant
        // le déclenchement de l'abandon.
        const garde = setTimeout(() => {}, 1000);
        options.signal.addEventListener("abort", () => {
          clearTimeout(garde);
          rejeter(new DOMException("aborted", "TimeoutError"));
        });
      }),
  });
  assert.equal(r.ok, false);
  assert.match(r.erreur, /délai de 20 ms dépassé/);
});

test("statut non 2xx et panne réseau : erreurs rendues, jamais levées", async () => {
  const r404 = await telechargerBorne("https://h/absent.jpg", {
    fetchImpl: async () => new Response("", { status: 404 }),
  });
  assert.equal(r404.ok, false);
  assert.match(r404.erreur, /statut 404/);

  const rPanne = await telechargerBorne("https://h/panne.jpg", {
    fetchImpl: async () => {
      throw new TypeError("fetch failed");
    },
  });
  assert.equal(rPanne.ok, false);
  assert.match(rPanne.erreur, /TypeError/);
});

test("réponse vide traitée comme un échec", async () => {
  const r = await telechargerBorne("https://h/vide.jpg", {
    fetchImpl: async () => reponse(new Uint8Array(0), { "content-length": "0" }),
  });
  assert.equal(r.ok, false);
  assert.match(r.erreur, /vide/);
});
