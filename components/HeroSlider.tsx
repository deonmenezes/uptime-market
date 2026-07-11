"use client";

import { useEffect, useState } from "react";

const SLIDES = [
  { src: "/art/slides/slide-1.png", caption: "Live probability, priced by the people on call" },
  { src: "/art/slides/slide-2.png", caption: "Every service, every region, one market" },
  { src: "/art/slides/slide-3.png", caption: "Telemetry is the oracle — no committee, no dispute" },
  { src: "/art/slides/slide-4.png", caption: "Runs where you run: AWS, Google Cloud, Cloudflare" },
  { src: "/art/slides/slide-5.png", caption: "Settlement in seconds, straight from the pulse" },
];

const INTERVAL_MS = 5000;

export default function HeroSlider() {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % SLIDES.length), INTERVAL_MS);
    return () => clearInterval(t);
  }, [paused]);

  return (
    <div
      className="group relative overflow-hidden rounded-xl border border-edge bg-panel shadow-[0_16px_48px_rgba(22,33,27,0.10)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative aspect-[16/9]">
        {SLIDES.map((s, i) => (
          <div
            key={s.src}
            className={[
              "absolute inset-0 transition-opacity duration-700",
              i === idx ? "slide-active opacity-100" : "opacity-0",
            ].join(" ")}
          >
            {/* plain img: static export-friendly, no next/image loader needed */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={s.src}
              alt={s.caption}
              className="slide-img h-full w-full object-cover"
              loading={i === 0 ? "eager" : "lazy"}
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-white/95 via-white/60 to-transparent px-5 pb-4 pt-10">
              <p className="text-sm font-medium text-bone">{s.caption}</p>
            </div>
          </div>
        ))}

        {/* arrows */}
        <button
          aria-label="previous slide"
          onClick={() => setIdx((idx - 1 + SLIDES.length) % SLIDES.length)}
          className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-edge bg-white/85 p-2 text-fog opacity-0 backdrop-blur-sm transition-opacity hover:text-bone group-hover:opacity-100"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <button
          aria-label="next slide"
          onClick={() => setIdx((idx + 1) % SLIDES.length)}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-edge bg-white/85 p-2 text-fog opacity-0 backdrop-blur-sm transition-opacity hover:text-bone group-hover:opacity-100"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>

      {/* dots */}
      <div className="absolute bottom-3 right-4 flex gap-1.5">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            aria-label={`slide ${i + 1}`}
            onClick={() => setIdx(i)}
            className={[
              "h-1.5 rounded-full transition-all",
              i === idx ? "w-5 bg-up" : "w-1.5 bg-edge2 hover:bg-fog",
            ].join(" ")}
          />
        ))}
      </div>
    </div>
  );
}
