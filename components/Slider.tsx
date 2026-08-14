"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

export interface Diapo {
  src: string;
  alt: string;
}

export default function Slider({ diapos }: { diapos: Diapo[] }) {
  const [index, setIndex] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const suivant = useCallback(
    () => setIndex((i) => (i + 1) % diapos.length),
    [diapos.length]
  );
  const precedent = () =>
    setIndex((i) => (i - 1 + diapos.length) % diapos.length);

  useEffect(() => {
    const reduit = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduit.matches) {
      return;
    }
    timer.current = setInterval(suivant, 6000);
    return () => {
      if (timer.current) {
        clearInterval(timer.current);
      }
    };
  }, [suivant]);

  return (
    <section
      aria-roledescription="carrousel"
      aria-label="Bateaux à la une"
      className="relative aspect-[16/7] w-full overflow-hidden bg-marine max-md:aspect-[4/3]"
    >
      {diapos.map((d, i) => (
        <div
          key={d.src}
          className={`absolute inset-0 transition-opacity duration-700 ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden={i !== index}
        >
          <Image
            src={d.src}
            alt={d.alt}
            fill
            sizes="100vw"
            priority={i === 0}
            className="object-cover"
          />
        </div>
      ))}
      <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={precedent}
          aria-label="Diapositive précédente"
          className="rounded-full bg-marine/70 px-3 py-1 text-white hover:bg-marine"
        >
          ‹
        </button>
        {diapos.map((d, i) => (
          <button
            key={d.src}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Diapositive ${i + 1}`}
            aria-current={i === index}
            className={`h-2.5 w-2.5 rounded-full border border-white ${
              i === index ? "bg-white" : "bg-transparent"
            }`}
          />
        ))}
        <button
          type="button"
          onClick={suivant}
          aria-label="Diapositive suivante"
          className="rounded-full bg-marine/70 px-3 py-1 text-white hover:bg-marine"
        >
          ›
        </button>
      </div>
    </section>
  );
}
