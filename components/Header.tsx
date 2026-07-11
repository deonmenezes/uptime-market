"use client";

import Link from "next/link";
import { useState } from "react";

export default function Header() {
  const [connected, setConnected] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-edge bg-ink/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2.5">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-display text-3xl leading-none text-lime">pred.fun</span>
          <span className="hidden rounded-sm border border-edge2 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-fog sm:block">
            beta
          </span>
        </Link>

        <nav className="hidden items-center gap-4 font-mono text-xs uppercase tracking-wider text-fog md:flex">
          <Link href="/" className="hover:text-lime">board</Link>
          <Link href="/create" className="hover:text-lime">launch market</Link>
          <span className="cursor-not-allowed opacity-50">portfolio</span>
          <span className="cursor-not-allowed opacity-50">docs</span>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <div className="relative hidden sm:block">
            <input
              placeholder="search markets…"
              className="w-48 rounded-sm border border-edge bg-panel px-3 py-1.5 font-mono text-xs text-bone placeholder:text-fog/60 focus:border-lime focus:outline-none lg:w-64"
            />
            <kbd className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm border border-edge2 px-1 font-mono text-[10px] text-fog">/</kbd>
          </div>

          <Link
            href="/create"
            className="btn-hard hidden rounded-sm border border-lime bg-lime/10 px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-wider text-lime md:block"
          >
            + launch
          </Link>

          <button
            onClick={() => setConnected((c) => !c)}
            className="rounded-sm border border-edge2 bg-panel2 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-bone hover:border-lime hover:text-lime"
          >
            {connected ? "7xKp…3fQz" : "connect wallet"}
          </button>
        </div>
      </div>
    </header>
  );
}
