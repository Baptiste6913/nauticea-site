import Link from "next/link";

// 404 au niveau de la DA : une seule courbe, ton carte marine, sobre.
export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      <p className="sonde text-sm uppercase tracking-[0.25em] text-azur-2">
        404
      </p>
      <h1 className="mt-3 text-display-l font-bold text-marine">
        Hors des sondes
      </h1>
      <p className="mt-4 leading-relaxed text-encre/80">
        La page demandée n&apos;existe pas ou n&apos;est plus à flot.
      </p>
      <svg
        viewBox="0 0 240 24"
        aria-hidden="true"
        className="mt-6 h-6 w-56"
        preserveAspectRatio="none"
      >
        <path
          d="M0 12 Q30 6 60 11 T120 10 T180 14 T240 8"
          fill="none"
          stroke="var(--color-azur-2)"
          strokeWidth="1.6"
          opacity="0.5"
        />
      </svg>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="rounded bg-marine px-5 py-2.5 font-semibold text-white hover:bg-marine-2"
        >
          Revenir au mouillage
        </Link>
        <Link
          href="/annonces"
          className="rounded border border-marine px-5 py-2.5 font-semibold text-marine hover:bg-ecume"
        >
          Voir les annonces
        </Link>
      </div>
    </div>
  );
}
