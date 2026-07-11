"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Replace } from "lucide-react";
import { GridCanvas } from "@/components/landing/grid-canvas";
import { SearchBar, type SearchBarHandle } from "@/components/landing/search-bar";
import { WordRotator } from "@/components/landing/word-rotator";

const EXAMPLE_CHIPS = ["vercel/ai", "shadcn-ui/ui", "supabase/supabase"];

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

      <div className="relative z-10 flex w-full flex-col items-center">
        <h1
          aria-label="Make any repo agent-ready"
          className="text-center font-display text-[clamp(2.5rem,6vw,4.25rem)] font-bold leading-[1.05] tracking-[-0.02em]"
        >
          <span className="block">Make any repo</span>
          <WordRotator />
        </h1>

        <p className="mt-6 max-w-[560px] text-center text-muted-foreground">
          Paste a GitHub URL — get CLAUDE.md, AGENTS.md, rules and
          version-matched skill files, grounded in your actual codebase. Free,
          no signup.
        </p>

        <div className="mt-10 flex w-full justify-center">
          <SearchBar ref={searchRef} />
        </div>

        <div className="mt-6 flex max-w-full items-center gap-2 overflow-x-auto px-2">
          <span className="shrink-0 font-mono text-[0.8125rem] text-muted-foreground">
            try:
          </span>
          {EXAMPLE_CHIPS.map((repo) => (
            <button
              key={repo}
              type="button"
              onClick={() => searchRef.current?.fillAndSubmit(repo)}
              className="shrink-0 rounded-full border border-border px-3 py-1 font-mono text-[0.8125rem] text-muted-foreground transition-colors hover:bg-primary-soft hover:text-primary"
            >
              {repo}
            </button>
          ))}
        </div>

        <p className="mt-4 flex items-center gap-2 text-center font-mono text-[0.8125rem] text-muted-foreground max-[380px]:max-w-[260px]">
          <Replace
            className="size-5 shrink-0"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <span>
            or change <span className="text-foreground">github.com</span> →{" "}
            <span className="text-foreground">gitbrief.dev</span> in any repo
            URL
          </span>
        </p>
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
