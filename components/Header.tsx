"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV = [
  // Entrée Accueil en premier item, icône maison (retours client V3).
  { href: "/", label: "Accueil", maison: true },
  { href: "/a-propos", label: "À propos" },
  // Actualités : réintégrée par la prop avecActualites dès qu'une
  // actualité datée de 2026 ou plus existe dans content/actualites/.
  { href: "/actualites", label: "Actualités", optionnel: true },
  { href: "/marques", label: "Nos marques" },
  { href: "/annonces", label: "Annonces" },
  { href: "/stock-neuf", label: "Stock neuf" },
  { href: "/occasions", label: "Occasions" },
  { href: "/places-de-port", label: "Places de port" },
  { href: "/contact", label: "Contact" },
];

// Icône maison en trait sobre, cohérente avec la DA (pas d'emoji).
function IconeMaison({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M3 11.2 12 4l9 7.2" />
      <path d="M5.6 9.8V20h12.8V9.8" />
    </svg>
  );
}

export default function Header({
  avecActualites = false,
}: {
  avecActualites?: boolean;
}) {
  const [ouvert, setOuvert] = useState(false);
  const pathname = usePathname();
  const nav = NAV.filter((item) => !item.optionnel || avecActualites);

  return (
    // Fond pavillon : la couleur mesurée du fichier logo, jointure
    // invisible autour de l'image (design/DA.md, tokens).
    <header className="sticky top-0 z-40 bg-pavillon text-white shadow-affleure">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="shrink-0" aria-label="Nauticea Yachting, accueil">
          <Image
            src="/site/logos/logo-1382603607.png"
            alt="Nauticea Yachting"
            width={173}
            height={60}
            priority
          />
        </Link>
        <nav aria-label="Navigation principale" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {nav.map((item) => {
              const actif =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href + "/"));
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={actif ? "page" : undefined}
                    aria-label={item.maison ? "Accueil" : undefined}
                    className={`flex items-center rounded px-3 py-2 text-sm font-medium transition-colors hover:bg-white/10 hover:text-azur ${
                      actif ? "text-azur" : "text-white"
                    }`}
                  >
                    {item.maison ? (
                      <IconeMaison className="h-5 w-5" />
                    ) : (
                      item.label
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <button
          type="button"
          onClick={() => setOuvert(!ouvert)}
          aria-expanded={ouvert}
          aria-controls="menu-mobile"
          className="rounded border border-white/40 px-3 py-2 text-sm text-white lg:hidden"
        >
          Menu
        </button>
      </div>
      {ouvert && (
        <nav id="menu-mobile" aria-label="Navigation mobile" className="lg:hidden">
          <ul className="border-t border-white/15 bg-pavillon px-4 pb-4">
            {nav.map((item) => {
              const actif =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href + "/"));
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOuvert(false)}
                    aria-current={actif ? "page" : undefined}
                    className={`flex items-center gap-2 border-b border-white/15 py-3 text-sm font-medium hover:text-azur ${
                      actif ? "text-azur" : "text-white"
                    }`}
                  >
                    {item.maison && <IconeMaison className="h-4 w-4" />}
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </header>
  );
}
