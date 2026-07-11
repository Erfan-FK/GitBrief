"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

/** 01 §4.2 — the rotation IS the feature list. */
const WORDS = [
  "agent-ready",
  "Claude-ready",
  "Cursor-ready",
  "Copilot-ready",
  "Codex-ready",
  "Gemini-ready",
] as const;

const INTERVAL_MS = 2200;

export function WordRotator() {
  const [index, setIndex] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (timer) return;
      timer = setInterval(
        () => setIndex((i) => (i + 1) % WORDS.length),
        INTERVAL_MS,
      );
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    const onVisibility = () => (document.hidden ? stop() : start());
    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <span aria-hidden="true" aria-live="off" className="inline-grid overflow-hidden align-bottom">
      {/* Width reserver: longest word, invisible, keeps layout stable. */}
      <span className="invisible col-start-1 row-start-1 whitespace-nowrap">
        Copilot-ready.
      </span>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={WORDS[index]}
          className="col-start-1 row-start-1 whitespace-nowrap text-primary"
          initial={reduced ? { opacity: 0 } : { y: 40, opacity: 0 }}
          animate={
            reduced
              ? { opacity: 1 }
              : {
                  y: 0,
                  opacity: 1,
                  transition: { type: "spring", stiffness: 60, damping: 14 },
                }
          }
          exit={
            reduced
              ? { opacity: 0 }
              : { y: -40, opacity: 0, transition: { duration: 0.3 } }
          }
        >
          {WORDS[index]}
          <span className="text-foreground">.</span>
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
