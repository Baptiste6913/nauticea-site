#!/usr/bin/env node
// Synchronise les images du corpus vers public/ (copies versionnées).
//   corpus-nauticea/photos/<slug>/NN.jpg  -> public/annonces/<slug>/NN.jpg
//   corpus-nauticea/assets/slider/*       -> public/site/slider/*
//   corpus-nauticea/assets/logos/*        -> public/site/logos/*
//   corpus-nauticea/assets/news/*         -> public/actualites/images/*
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const corpus = path.join(root, "corpus-nauticea");

const mappings = [
  [path.join(corpus, "photos"), path.join(root, "public", "annonces")],
  [path.join(corpus, "assets", "slider"), path.join(root, "public", "site", "slider")],
  [path.join(corpus, "assets", "logos"), path.join(root, "public", "site", "logos")],
  [path.join(corpus, "assets", "news"), path.join(root, "public", "actualites", "images")],
];

let copied = 0;
let skipped = 0;

function syncDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`absent, ignoré : ${path.relative(root, src)}`);
    return;
  }
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      syncDir(s, d);
    } else {
      const same =
        fs.existsSync(d) && fs.statSync(d).size === fs.statSync(s).size;
      if (same) {
        skipped += 1;
      } else {
        fs.copyFileSync(s, d);
        copied += 1;
      }
    }
  }
}

for (const [src, dest] of mappings) {
  syncDir(src, dest);
}
console.log(`sync-images : ${copied} copiées, ${skipped} déjà à jour`);
