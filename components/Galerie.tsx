"use client";

import Image from "next/image";
import { useState } from "react";

export default function Galerie({
  photos,
  titre,
}: {
  photos: string[];
  titre: string;
}) {
  const [index, setIndex] = useState(0);

  if (photos.length === 0) {
    return (
      <p className="flex aspect-[4/3] items-center justify-center rounded-lg bg-ecume text-encre/70">
        Photos sur demande
      </p>
    );
  }

  return (
    <div>
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-marine">
        <Image
          key={photos[index]}
          src={photos[index]}
          alt={`${titre}, photo ${index + 1} sur ${photos.length}`}
          fill
          sizes="(max-width: 1024px) 100vw, 60vw"
          priority
          className="object-contain"
        />
        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setIndex((index - 1 + photos.length) % photos.length)}
              aria-label="Photo précédente"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-marine/70 px-3 py-1.5 text-xl text-white hover:bg-marine"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => setIndex((index + 1) % photos.length)}
              aria-label="Photo suivante"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-marine/70 px-3 py-1.5 text-xl text-white hover:bg-marine"
            >
              ›
            </button>
            <p className="absolute bottom-2 right-2 rounded bg-marine/70 px-2 py-0.5 text-xs text-white">
              {index + 1} / {photos.length}
            </p>
          </>
        )}
      </div>
      {photos.length > 1 && (
        <ul className="mt-3 grid list-none grid-cols-4 gap-2 p-0 sm:grid-cols-6 lg:grid-cols-8">
          {photos.map((p, i) => (
            <li key={p}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Afficher la photo ${i + 1}`}
                aria-current={i === index}
                className={`relative block aspect-[4/3] w-full overflow-hidden rounded border-2 ${
                  i === index ? "border-azur" : "border-transparent"
                }`}
              >
                <Image
                  src={p}
                  alt=""
                  fill
                  sizes="120px"
                  className="object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
