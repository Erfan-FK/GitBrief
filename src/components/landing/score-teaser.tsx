"use client";

import { motion, useReducedMotion } from "framer-motion";
import { SectionReveal } from "@/components/landing/section-reveal";

const SCORE = 86;
const RING_R = 34;
const RING_C = 2 * Math.PI * RING_R;

const CHECKS = [
  { pass: true, label: "AGENTS.md present" },
  { pass: true, label: "scripts documented" },
  { pass: true, label: "lockfile pinned" },
  { pass: false, label: "no .cursorignore" },
];

/** 01 §8 — score teaser; card layout doubles as the /api/og template. */
export function ScoreTeaser() {
  const reduced = useReducedMotion();

  return (
    <section className="px-6 py-24 max-md:py-16">
      <div className="mx-auto grid max-w-[1100px] items-center gap-12 md:grid-cols-2">
        <SectionReveal>
          <h2 className="font-display text-[2rem] font-bold tracking-[-0.02em]">
            How agent-ready is your repo?
          </h2>
          <p className="mt-4 max-w-[440px] text-muted-foreground">
            We check for agent files, documented commands, pinned versions and
            ignore rules. Get a shareable score card — and the fix list to
            raise it.
          </p>
          <button
            type="button"
            onClick={() => {
              window.scrollTo({ top: 0, behavior: "smooth" });
              window.dispatchEvent(new CustomEvent("gitbrief:focus-search"));
            }}
            className="mt-6 rounded-[12px] border border-primary px-5 py-2.5 font-medium text-primary transition-colors hover:bg-primary-soft"
          >
            Score my repo
          </button>
        </SectionReveal>

        <SectionReveal delay={0.1}>
          <div className="relative mx-auto flex h-[260px] w-full max-w-[420px] flex-col justify-between rounded-[16px] border border-border bg-card p-6 max-[380px]:scale-[0.85]">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm text-foreground">
                vercel/ai
              </span>
              <svg width="88" height="88" viewBox="0 0 88 88" role="img" aria-label={`Readiness score ${SCORE} out of 100`}>
                <circle
                  cx="44" cy="44" r={RING_R}
                  fill="none" stroke="var(--border)" strokeWidth="6"
                />
                <motion.circle
                  cx="44" cy="44" r={RING_R}
                  fill="none" stroke="var(--success)" strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={RING_C}
                  transform="rotate(-90 44 44)"
                  initial={{
                    strokeDashoffset: reduced
                      ? RING_C * (1 - SCORE / 100)
                      : RING_C,
                  }}
                  whileInView={{
                    strokeDashoffset: RING_C * (1 - SCORE / 100),
                  }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: reduced ? 0 : 0.9, ease: "easeOut" }}
                />
                <text
                  x="44" y="52"
                  textAnchor="middle"
                  fontSize="26" fontWeight="700"
                  fontFamily="var(--font-space-grotesk)"
                  fill="var(--success)"
                >
                  {SCORE}
                </text>
              </svg>
            </div>

            <ul className="space-y-1 font-mono text-xs">
              {CHECKS.map(({ pass, label }) => (
                <li
                  key={label}
                  className={pass ? "text-foreground/80" : "text-muted-foreground"}
                >
                  <span className={pass ? "text-success" : "text-destructive"}>
                    {pass ? "✓" : "✗"}
                  </span>{" "}
                  {label}
                </li>
              ))}
            </ul>

            <span className="absolute bottom-4 right-5 font-display text-sm font-medium opacity-40">
              gitbrief
            </span>
          </div>
        </SectionReveal>
      </div>
    </section>
  );
}
