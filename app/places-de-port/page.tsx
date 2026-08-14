import type { Metadata } from "next";
import Link from "next/link";
import Surface from "@/components/da/Surface";
import { typoFr } from "@/lib/format";

export const metadata: Metadata = {
  title: "Places de port à vendre à Port Fréjus",
  description:
    "Places de port à vendre à Port Fréjus, de 6 m à 22 m, dont emplacements catamaran. Contactez Nauticea Yachting pour plus d'informations.",
  alternates: { canonical: "/places-de-port" },
};

// Tableau de la page « Places de port » du site actuel (corpus).
const PLACES = [
  { dimensions: "6 m × 2,50 m", port: "Port-Fréjus", amodiation: "2025" },
  { dimensions: "8 m × 3 m", port: "Port-Fréjus", amodiation: "2025" },
  { dimensions: "10 m × 3,50 m", port: "Port-Fréjus", amodiation: "2025" },
  { dimensions: "12 m × 4 m", port: "Port-Fréjus", amodiation: "2025" },
  { dimensions: "12 m × 8 m (catamaran)", port: "Port-Fréjus", amodiation: "2025" },
  { dimensions: "15 m × 4,50 m", port: "Port-Fréjus", amodiation: "2025" },
  { dimensions: "18 m × 10,30 m (catamaran)", port: "Port-Fréjus", amodiation: "2025" },
  { dimensions: "22 m × 11,40 m (catamaran)", port: "Port-Fréjus", amodiation: "2025" },
];

export default function PlacesDePort() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-display-l font-bold text-marine md:text-display-xl">
        Places de port à vendre
      </h1>
      <p className="mt-3 text-encre/80">
        {typoFr("Dimensions en mètres (tolérance longueur 10 %).")}
      </p>
      <Surface className="mt-6 overflow-x-auto rounded-lg">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-marine text-left text-white">
              <th scope="col" className="px-4 py-3">Dimensions</th>
              <th scope="col" className="px-4 py-3">Port</th>
              <th scope="col" className="px-4 py-3">Amodiation</th>
            </tr>
          </thead>
          <tbody>
            {PLACES.map((p, i) => (
              <tr
                key={p.dimensions}
                className={i % 2 ? "bg-ecume" : "bg-white"}
              >
                <td className="sonde px-4 py-3 font-medium">{p.dimensions}</td>
                <td className="px-4 py-3">{p.port}</td>
                <td className="sonde px-4 py-3">{p.amodiation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Surface>
      <p className="mt-6 leading-relaxed text-encre/80">
        {typoFr("Pour plus d'informations, merci de nous contacter.")}
      </p>
      <p className="mt-4">
        <Link
          href="/contact"
          className="inline-block rounded bg-marine px-5 py-2.5 font-semibold text-white hover:bg-marine-2"
        >
          Nous contacter
        </Link>
      </p>
    </div>
  );
}
