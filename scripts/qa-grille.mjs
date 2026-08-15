#!/usr/bin/env node
// Grille QA session B : screenshots desktop et mobile de toutes les
// pages cibles du rollout. Usage : node scripts/qa-grille.mjs <dossier>
import { chromium } from "playwright-core";
import fs from "node:fs";

const OUT = process.argv[2] ?? "design/qa/session-b/apres";
fs.mkdirSync(OUT, { recursive: true });

const LOCAL = "http://localhost:3100";
const PAGES = [
  ["accueil", "/"],
  ["annonces", "/annonces"],
  ["detail", "/annonces/sealine-c390-539"],
  ["stock-neuf", "/stock-neuf"],
  ["occasions", "/occasions"],
  ["actualites", "/actualites"],
  ["actu-detail", "/actualites/nouveau-sealine-s390"],
  ["a-propos", "/a-propos"],
  ["marques", "/marques"],
  ["places-de-port", "/places-de-port"],
  ["contact", "/contact"],
  ["mentions-legales", "/mentions-legales"],
  ["carte", "/carte"],
  ["404", "/page-inexistante"],
];
const VUES = [
  ["desktop", { width: 1440, height: 900 }],
  ["mobile", { width: 390, height: 844 }],
];

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: ["--no-sandbox"],
});

for (const [vue, viewport] of VUES) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  for (const [nom, chemin] of PAGES) {
    const page = await ctx.newPage();
    await page.goto(LOCAL + chemin, { waitUntil: "networkidle", timeout: 30000 });
    await page.evaluate(async () => {
      const pas = window.innerHeight * 0.7;
      for (let y = 0; y < document.body.scrollHeight; y += pas) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 150));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${OUT}/${nom}-${vue}.png`, fullPage: true });
    await page.close();
    console.log(`${nom}-${vue} ok`);
  }
  await ctx.close();
}
await browser.close();
