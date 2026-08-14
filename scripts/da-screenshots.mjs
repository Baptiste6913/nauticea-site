#!/usr/bin/env node
// QA DA : screenshots desktop et mobile des pages de la tranche verticale.
// Usage : node scripts/da-screenshots.mjs <dossier-sortie>
import { chromium } from "playwright-core";
import fs from "node:fs";

const OUT = process.argv[2] ?? "design/qa/session-a/apres";
fs.mkdirSync(OUT, { recursive: true });

const LOCAL = "http://localhost:3100";
const PAGES = [
  ["accueil", "/"],
  ["detail", "/annonces/sealine-c390-539"],
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
    // Déclenche reveals et images lazy avant la capture pleine page.
    await page.evaluate(async () => {
      const pas = window.innerHeight * 0.7;
      for (let y = 0; y < document.body.scrollHeight; y += pas) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 180));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT}/${nom}-${vue}.png`, fullPage: true });
    await page.close();
    console.log(`${nom}-${vue} ok`);
  }
  await ctx.close();
}
await browser.close();
