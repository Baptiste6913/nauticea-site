"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV = [
  { href: "/a-propos", label: "À propos" },
  { href: "/actualites", label: "Actualités" },
  { href: "/marques", label: "Nos marques" },
  { href: "/annonces", label: "Annonces" },
  { href: "/stock-neuf", label: "Stock neuf" },
  { href: "/occasions", label: "Occasions" },
  { href: "/places-de-port", label: "Places de port" },
  { href: "/contact", label: "Contact" },
];

export default function Header() {
  const [ouvert, setOuvert] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-encre/10 bg-white text-marine shadow-affleure">
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
            {NAV.map((item) => {
              const actif =
                pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={actif ? "page" : undefined}
                    className={`rounded px-3 py-2 text-sm font-medium transition-colors hover:bg-ecume hover:text-azur-2 ${
                      actif ? "text-azur-2" : "text-marine"
                    }`}
                  >
                    {item.label}
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
          className="rounded border border-encre/20 px-3 py-2 text-sm lg:hidden"
        >
          Menu
        </button>
      </div>
      {ouvert && (
        <nav id="menu-mobile" aria-label="Navigation mobile" className="lg:hidden">
          <ul className="border-t border-encre/10 bg-white px-4 pb-4">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOuvert(false)}
                  className="block border-b border-encre/10 py-3 text-sm font-medium hover:text-azur-2"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
