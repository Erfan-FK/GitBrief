"use client";

import { motion, useReducedMotion } from "framer-motion";

const CYCLE = 6;

const TREE_LINES = [
  { x: 60, y: 48, w: 90 },
  { x: 76, y: 66, w: 110, glow: true }, // package.json
  { x: 76, y: 84, w: 96, glow: true }, // lockfile
  { x: 76, y: 102, w: 70 },
  { x: 60, y: 120, w: 84 },
  { x: 76, y: 138, w: 100 },
  { x: 76, y: 156, w: 64 },
  { x: 60, y: 174, w: 76 },
];

const CHIPS = [
  { label: "next 15", x: 196 },
  { label: "tw 4.1", x: 238 },
  { label: "sb 2.48", x: 276 },
];

/** A3 — file tree draws, scan line sweeps, manifests glow, version chips pop. */
export function ReadAnim() {
  const reduced = useReducedMotion();

  return (
    <svg viewBox="0 0 320 200" className="size-16 text-foreground" aria-hidden="true">
      {TREE_LINES.map((line, i) =>
        reduced ? (
          <line
            key={i}
            x1={line.x} y1={line.y} x2={line.x + line.w} y2={line.y}
            stroke={line.glow ? "var(--primary)" : "currentColor"}
            strokeWidth={1.5} strokeLinecap="round"
          />
        ) : (
          <motion.line
            key={i}
            x1={line.x} y1={line.y} x2={line.x + line.w} y2={line.y}
            strokeWidth={1.5} strokeLinecap="round"
            animate={{
              pathLength: [0, 1, 1, 1],
              stroke: line.glow
                ? ["currentColor", "currentColor", "var(--primary)", "var(--primary)"]
                : ["currentColor", "currentColor", "currentColor", "currentColor"],
              opacity: [0, 1, 1, 1],
            }}
            transition={{
              duration: CYCLE,
              times: [0.02 + i * 0.025, 0.1 + i * 0.025, 0.45 + i * 0.02, 1],
              repeat: Infinity,
            }}
          />
        ),
      )}

      {/* Scan line sweeps left → right */}
      {!reduced && (
        <motion.line
          x1="0" y1="36" x2="0" y2="186"
          stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round"
          animate={{ x: [48, 48, 200, 200], opacity: [0, 0.9, 0.9, 0] }}
          transition={{ duration: CYCLE, times: [0.3, 0.32, 0.52, 0.56], repeat: Infinity }}
        />
      )}

      {/* Version chips pop above */}
      {CHIPS.map((chip, i) => (
        <motion.g
          key={chip.label}
          style={{ transformOrigin: `${chip.x}px 80px` }}
          animate={
            reduced
              ? undefined
              : { scale: [0.8, 0.8, 1, 1], opacity: [0, 0, 1, 1] }
          }
          transition={{
            duration: CYCLE,
            times: [0, 0.52 + i * 0.05, 0.6 + i * 0.05, 1],
            repeat: Infinity,
          }}
        >
          <rect
            x={chip.x - 20} y="68" width="40" height="18" rx="6"
            fill="none" stroke="var(--primary)" strokeWidth="1.5"
          />
          <text
            x={chip.x} y="80.5" textAnchor="middle"
            fontSize="9" fontFamily="var(--font-mono)" fill="var(--primary)"
          >
            {chip.label}
          </text>
        </motion.g>
      ))}
    </svg>
  );
}
