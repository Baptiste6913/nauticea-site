import fs from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

// Redirections 301 depuis les anciennes URLs Joomla (.html), générées
// depuis corpus-nauticea/redirects.csv.
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

const nextConfig: NextConfig = {
  redirects: async () => lireRedirections(),
};

export default nextConfig;
