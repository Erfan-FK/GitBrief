"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { GridCanvas } from "@/components/landing/grid-canvas";
import { SearchBar, type SearchBarHandle } from "@/components/landing/search-bar";
import { WordRotator } from "@/components/landing/word-rotator";

export function Hero() {
  const searchRef = useRef<SearchBarHandle>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY > 40) setScrolled(true);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-6 pb-[10vh] pt-16">
      <GridCanvas />

      {/* Readability veil: a soft radial wash of the page bg sits between the
          animated grid and the content, so hovering the grid never lowers
          text contrast. Fades to transparent at the edges. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[5]"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 42%, var(--background) 35%, color-mix(in oklab, var(--background) 55%, transparent) 62%, transparent 80%)",
        }}
      />

      <div className="relative z-10 flex w-full flex-col items-center">
        <h1
          aria-label="Make any repo agent-ready"
          className="text-center font-display text-[clamp(2.5rem,6vw,4.25rem)] font-bold leading-[1.05] tracking-[-0.02em] [text-shadow:0_1px_20px_var(--background)]"
        >
          <span className="block">Make any repo</span>
          <WordRotator />
        </h1>

        <p className="mt-6 max-w-[560px] text-center text-muted-foreground [text-shadow:0_1px_12px_var(--background)]">
          Paste a GitHub URL — get CLAUDE.md, AGENTS.md, rules and
          version-matched skill files, grounded in your actual codebase. Free,
          no signup.
        </p>

        <div className="mt-10 flex w-full justify-center">
          <SearchBar ref={searchRef} />
        </div>
      </div>

      {!scrolled && (
        <button
          type="button"
          aria-label="Scroll to preview"
          onClick={() =>
            document
              .getElementById("preview")
              ?.scrollIntoView({ behavior: "smooth" })
          }
          className="gb-bob absolute bottom-8 left-1/2 z-10 flex size-9 -translate-x-1/2 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronDown className="size-4" strokeWidth={1.5} />
        </button>
      )}
    </section>
  );
}
