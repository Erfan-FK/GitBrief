"use client";

import { motion, useReducedMotion } from "framer-motion";

const CYCLE = 6;

const PAGES = [
  { fromX: -80, fromY: -60, delay: 0 },
  { fromX: 90, fromY: -70, delay: 0.02 },
  { fromX: -70, fromY: 80, delay: 0.04 },
];

/** A4 — pages slide to center, stack to bundle, tie-line draws, check pops. */
export function BriefAnim() {
  const reduced = useReducedMotion();

  if (reduced) {
    return (
      <svg viewBox="0 0 320 200" className="size-16 text-foreground" aria-hidden="true">
        <g stroke="currentColor" fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <rect x="120" y="60" width="80" height="90" rx="10" stroke="var(--primary)" />
          <line x1="134" y1="82" x2="186" y2="82" />
          <line x1="134" y1="98" x2="176" y2="98" />
          <line x1="134" y1="114" x2="182" y2="114" />
        </g>
        <circle cx="200" cy="150" r="12" fill="var(--primary)" />
        <path d="M194 150 l4 4 l8 -8" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 320 200" className="size-16 text-foreground" aria-hidden="true">
      {/* Idle float on the whole scene after assembly */}
      <motion.g
        animate={{ y: [0, 0, -2, 2, 0] }}
        transition={{ duration: CYCLE, times: [0, 0.6, 0.75, 0.9, 1], repeat: Infinity }}
      >
        {/* Three pages slide in from corners */}
        {PAGES.map((page, i) => (
          <motion.rect
            key={i}
            x="120" y="60" width="80" height="90" rx="10"
            fill="var(--card)" stroke="currentColor" strokeWidth="1.5"
            animate={{
              x: [page.fromX, 0, 0, 0],
              y: [page.fromY, i * -3, 0, 0],
              rotate: [i * 8 - 8, i * 3 - 3, 0, 0],
              opacity: [0, 1, i === PAGES.length - 1 ? 1 : 0, i === PAGES.length - 1 ? 1 : 0],
            }}
            style={{ transformOrigin: "160px 105px" }}
            transition={{
              duration: CYCLE,
              times: [0.05 + page.delay, 0.25 + page.delay, 0.4, 1],
              repeat: Infinity,
            }}
          />
        ))}

        {/* Bundle card content lines */}
        <motion.g
          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
          animate={{ opacity: [0, 0, 1, 1] }}
          transition={{ duration: CYCLE, times: [0, 0.4, 0.45, 1], repeat: Infinity }}
        >
          <line x1="134" y1="82" x2="186" y2="82" />
          <line x1="134" y1="98" x2="176" y2="98" />
          <line x1="134" y1="114" x2="182" y2="114" />
        </motion.g>

        {/* Violet tie-line draws around the bundle */}
        <motion.rect
          x="114" y="54" width="92" height="102" rx="12"
          fill="none" stroke="var(--primary)" strokeWidth="1.5"
          animate={{ pathLength: [0, 0, 1, 1], opacity: [0, 0, 1, 1] }}
          transition={{ duration: CYCLE, times: [0, 0.42, 0.55, 1], repeat: Infinity }}
        />

        {/* Check badge scales in */}
        <motion.g
          style={{ transformOrigin: "204px 152px" }}
          animate={{ scale: [0, 0, 1, 1], opacity: [0, 0, 1, 1] }}
          transition={{
            duration: CYCLE,
            times: [0, 0.55, 0.63, 1],
            repeat: Infinity,
            scale: { type: "spring", stiffness: 300, damping: 18 },
          }}
        >
          <circle cx="204" cy="152" r="12" fill="var(--primary)" />
          <path
            d="M198 152 l4 4 l8 -8"
            stroke="#fff" strokeWidth="2" fill="none"
            strokeLinecap="round" strokeLinejoin="round"
          />
        </motion.g>
      </motion.g>
    </svg>
  );
}
