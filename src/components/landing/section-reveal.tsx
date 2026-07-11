"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Scroll-in reveal — 01 §12: opacity 0→1, y 24→0, 500ms, once. */
export function SectionReveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
      whileInView={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={
        reduced
          ? { duration: 0.15, delay }
          : { duration: 0.5, ease: EASE, delay }
      }
    >
      {children}
    </motion.div>
  );
}
