#!/usr/bin/env node
// Mesure le poids JS (gzip) réellement servi sur une page : somme des
// scripts référencés par le HTML. Usage : node scripts/mesure-js.mjs <url>
import { gzipSync } from "node:zlib";

const url = process.argv[2] ?? "http://localhost:3100/";
const html = await (await fetch(url)).text();
const sources = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);
let total = 0;
for (const src of [...new Set(sources)]) {
  const abs = src.startsWith("http") ? src : new URL(src, url).href;
  const corps = Buffer.from(await (await fetch(abs)).arrayBuffer());
  const gz = gzipSync(corps).length;
  total += gz;
  console.log(`${(gz / 1024).toFixed(1).padStart(7)} Ko gz  ${src.split("/").pop()}`);
}
console.log(`TOTAL ${(total / 1024).toFixed(1)} Ko gzip pour ${url}`);
