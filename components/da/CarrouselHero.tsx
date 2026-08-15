"use client";

import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useRef, useState } from "react";

// Carrousel du hero (directive finale W1) : swipe tactile, flèches,
// points, autoplay 6 s avec pause au survol et au toucher. Sous
// prefers-reduced-motion : image fixe au chargement, navigation
// manuelle intacte, aucun autoplay.

export interface DiapoHero {
  src: string;
  alt: string;
}

const DELAI_AUTOPLAY = 6000;

export default function CarrouselHero({ diapos }: { diapos: DiapoHero[] }) {
  const [emblaRef, embla] = useEmblaCarousel({ loop: true });
  const [index, setIndex] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const enPause = useRef(false);

  const arret = useCallback(() => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  }, []);

  const demarre = useCallback(() => {
    if (
      timer.current ||
      enPause.current ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    timer.current = setInterval(() => {
      embla?.scrollNext();
    }, DELAI_AUTOPLAY);
  }, [embla]);

  useEffect(() => {
    if (!embla) {
      return;
    }
    const surSelection = () => setIndex(embla.selectedScrollSnap());
    embla.on("select", surSelection);
    demarre();
    return () => {
      embla.off("select", surSelection);
      arret();
    };
  }, [embla, demarre, arret]);

  const pause = useCallback(() => {
    enPause.current = true;
    arret();
  }, [arret]);

  const reprise = useCallback(() => {
    enPause.current = false;
    demarre();
  }, [demarre]);

  return (
    <section
      aria-roledescription="carrousel"
      aria-label="Bateaux à la une"
      className="relative"
      onMouseEnter={pause}
      onMouseLeave={reprise}
      onTouchStart={pause}
      onFocus={pause}
      onBlur={reprise}
    >
      <div
        ref={emblaRef}
        className="overflow-hidden rounded-lg shadow-domine"
      >
        <div className="flex touch-pan-y">
          {diapos.map((d, i) => (
            <div
              key={d.src}
              className="relative aspect-[16/8] min-w-0 flex-[0_0_100%] bg-ecume max-md:aspect-[4/3]"
            >
              <Image
                src={d.src}
                alt={d.alt}
                fill
                sizes="(max-width: 1152px) 100vw, 1120px"
                priority={i === 0}
                loading={i === 0 ? undefined : "lazy"}
                className="object-cover"
              />
            </div>
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={() => embla?.scrollPrev()}
        aria-label="Photo précédente"
        className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-marine/75 px-3.5 py-2 text-xl text-white hover:bg-marine"
      >
        ‹
      </button>
      <button
        type="button"
        onClick={() => embla?.scrollNext()}
        aria-label="Photo suivante"
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-marine/75 px-3.5 py-2 text-xl text-white hover:bg-marine"
      >
        ›
      </button>
      <div className="absolute inset-x-0 bottom-1 flex justify-center">
        {diapos.map((d, i) => (
          <button
            key={d.src}
            type="button"
            onClick={() => embla?.scrollTo(i)}
            aria-label={`Aller à la photo ${i + 1}`}
            aria-current={i === index}
            className="flex h-6 w-6 items-center justify-center"
          >
            <span
              aria-hidden="true"
              className={`h-2.5 w-2.5 rounded-full border border-white ${
                i === index ? "bg-white" : "bg-marine/40"
              }`}
            />
          </button>
        ))}
      </div>
    </section>
  );
}
