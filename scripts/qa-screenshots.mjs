#!/usr/bin/env node
// QA visuelle W5 : screenshots desktop et mobile du nouveau site
// et du site actuel (référence), rangés dans rapports/screenshots/.
import { chromium } from "playwright-core";
import fs from "node:fs";

const OUT = "rapports/screenshots";
fs.mkdirSync(OUT, { recursive: true });

const LOCAL = "http://localhost:3100";
// Référence : miroir local du site actuel (corpus-nauticea/raw-mirror servi
// sur le port 3200), le site live n'étant pas joignable depuis Chromium ici.
const LIVE = "http://localhost:3200";

const PAGES = [
  ["accueil", "/", "/index.html"],
  ["annonces", "/annonces", "/annonces-bateaux-occasion.html"],
  ["detail", "/annonces/sealine-c390-539", "/annonces-bateaux-occasion/29-vedette/539-c390.html"],
  ["contact", "/contact", "/contact.html"],
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
  for (const [nom, cheminLocal, cheminLive] of PAGES) {
    const page = await ctx.newPage();
    await page.goto(LOCAL + cheminLocal, { waitUntil: "networkidle", timeout: 30000 });
    await page.screenshot({ path: `${OUT}/${nom}-${vue}-nouveau.png`, fullPage: true });
    try {
      await page.goto(LIVE + cheminLive, { waitUntil: "domcontentloaded", timeout: 45000 });
      await page.waitForTimeout(2500);
      await page.screenshot({ path: `${OUT}/${nom}-${vue}-actuel.png`, fullPage: true });
    } catch (e) {
      console.error(`référence live ${nom}-${vue} : ${e.message.split("\n")[0]}`);
    }
    await page.close();
    console.log(`${nom}-${vue} ok`);
  }
  await ctx.close();
}
await browser.close();
