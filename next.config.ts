import fs from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

// Redirections 301 depuis les anciennes URLs .html du site historique,
// générées depuis corpus-nauticea/redirects.csv.
function lireRedirections() {
  const csv = fs.readFileSync(
    path.join(__dirname, "corpus-nauticea", "redirects.csv"),
    "utf-8"
  );
  return csv
    .trim()
    .split("\n")
    .slice(1)
    .map((ligne) => {
      const [source, destination] = ligne.split(",");
      return { source, destination, statusCode: 301 };
    })
    .filter((r) => r.source && r.destination && r.source !== r.destination);
}

// CSP la plus stricte compatible avec Next en SSG (directive finale W5).
// Compromis documenté : 'unsafe-inline' sur script-src car les pages
// statiques ne peuvent pas porter de nonce par requête (les scripts
// d'amorçage de Next sont inline) ; aucune source externe autorisée.
// Activer Turnstile impose d'ajouter https://challenges.cloudflare.com
// à script-src et frame-src.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const ENTETES_SECURITE = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  { key: "Content-Security-Policy", value: CSP },
];

const nextConfig: NextConfig = {
  redirects: async () => lireRedirections(),
  headers: async () => [
    {
      source: "/(.*)",
      headers: ENTETES_SECURITE,
    },
  ],
};

export default nextConfig;
