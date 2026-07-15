"use client";

import { motion, useReducedMotion } from "framer-motion";
import { BriefAnim } from "@/components/landing/anim/brief-anim";
import { PasteAnim } from "@/components/landing/anim/paste-anim";
import { ReadAnim } from "@/components/landing/anim/read-anim";

const EASE = [0.16, 1, 0.3, 1] as const;

const STEPS = [
  {
    eyebrow: "01 · PASTE",
    title: "Drop in any repo URL",
    body: "Or swap github.com → gitbrief.dev.",
    Anim: PasteAnim,
  },
  {
    eyebrow: "02 · READ",
    title: "We read facts, not vibes",
    body: "Lockfiles, scripts, configs — exact versions, real commands.",
    Anim: ReadAnim,
  },
  {
    eyebrow: "03 · BRIEF",
    title: "Download your bundle",
    body: "Agent files + official, version-matched skills, in the right paths.",
    Anim: BriefAnim,
  },
];

export function HowItWorks() {
  const reduced = useReducedMotion();

  return (
    <section id="how-it-works" className="px-6 py-24 max-md:py-16">
      <div className="mx-auto max-w-[1100px]">
        <h2 className="text-center font-display text-[2rem] font-bold tracking-[-0.02em]">
          How it works
        </h2>

        <div className="mt-12 grid gap-8 md:grid-cols-3 md:max-lg:gap-4">
          {STEPS.map(({ eyebrow, title, body, Anim }, i) => (
            <motion.div
              key={eyebrow}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
              whileInView={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, ease: EASE, delay: i * 0.12 }}
              className="flex flex-col items-start"
            >
              {/* framed animation panel */}
              <div className="relative flex aspect-[16/9] w-full items-center justify-center overflow-hidden rounded-[16px] border border-border bg-gradient-to-b from-card to-background">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 opacity-[0.5]"
                  style={{
                    backgroundImage:
                      "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
                    backgroundSize: "22px 22px",
                    maskImage:
                      "radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 75%)",
                  }}
                />
                <div className="relative h-[78%] w-[86%]">
                  <Anim />
                </div>
              </div>
              <p className="mt-5 font-mono text-[0.8125rem] font-medium text-primary">
                {eyebrow}
              </p>
              <h3 className="mt-2 font-display text-xl font-medium">{title}</h3>
              <p className="mt-1 text-muted-foreground">{body}</p>
            </motion.div>
          ))}
        </div>

        <p className="mt-16 border-t border-border pt-8 text-center text-[0.9375rem] text-muted-foreground">
          Official skills first — shadcn, Supabase, Anthropic and more. We only
          generate when no official skill exists, grounded in current docs —
          and every command is verified against your repo.
        </p>
      </div>
    </section>
  );
}
