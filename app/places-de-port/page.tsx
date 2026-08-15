import type { Metadata } from "next";
import Link from "next/link";
import Surface from "@/components/da/Surface";
import { lireContenu } from "@/lib/contenu";
import { typoFr } from "@/lib/format";

export const metadata: Metadata = {
  title: "Places de port à vendre à Port Fréjus",
  description:
    "Places de port à vendre à Port Fréjus, de 6 m à 22 m, dont emplacements catamaran. Contactez Nauticea Yachting pour plus d'informations.",
  alternates: { canonical: "/places-de-port" },
};

// Tableau et textes éditables dans content/places-de-port.md.
export default function PlacesDePort() {
  const contenu = lireContenu("places-de-port.md");
  const places = (contenu.listes.place ?? []).map((ligne) => {
    const [dimensions, port, amodiation] = ligne.split("|").map((c) => c.trim());
    return { dimensions, port, amodiation };
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-display-l font-bold text-marine md:text-display-xl">
        {contenu.meta.titre}
      </h1>
      <p className="mt-3 text-encre/80">{typoFr(contenu.meta.intro ?? "")}</p>
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
            {places.map((p, i) => (
              <tr key={p.dimensions} className={i % 2 ? "bg-ecume" : "bg-white"}>
                <td className="sonde px-4 py-3 font-semibold">{p.dimensions}</td>
                <td className="px-4 py-3">{p.port}</td>
                <td className="sonde px-4 py-3">{p.amodiation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Surface>
      {contenu.paragraphes.map((p) => (
        <p key={p.slice(0, 32)} className="mt-6 leading-relaxed text-encre/80">
          {typoFr(p)}
        </p>
      ))}
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
