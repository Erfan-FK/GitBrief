"use client";

import { motion, useReducedMotion } from "framer-motion";

const CYCLE = 6; // 5s scene + 1s rest — 04 §4
const URL_TEXT = "github.com/owner/repo";

/** A2 — browser draws in, cursor glides, URL types, enter pulses. */
export function PasteAnim() {
  const reduced = useReducedMotion();

  if (reduced) {
    return (
      <svg viewBox="0 0 320 200" className="size-16 text-foreground" aria-hidden="true">
        <Frame />
        <text x="78" y="66" fontSize="13" fontFamily="var(--font-mono)" fill="var(--primary)">
          {URL_TEXT}
        </text>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 320 200" className="size-16 text-foreground" aria-hidden="true">
      {/* Browser frame draws in */}
      <motion.g
        style={{ stroke: "currentColor", fill: "none", strokeWidth: 1.5 }}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <motion.rect
          x="40" y="30" width="240" height="140" rx="12"
          animate={{ pathLength: [0, 1, 1, 1] }}
          transition={{ duration: CYCLE, times: [0, 0.1, 0.95, 1], repeat: Infinity }}
        />
        {/* Address bar; tints violet as cursor arrives */}
        <motion.rect
          x="64" y="50" width="192" height="24" rx="8"
          animate={{
            pathLength: [0, 1, 1, 1],
            stroke: ["currentColor", "currentColor", "var(--primary)", "var(--primary)"],
          }}
          transition={{ duration: CYCLE, times: [0.05, 0.15, 0.3, 1], repeat: Infinity }}
        />
      </motion.g>

      {/* Typed URL, char by char (real text — the reason we code this) */}
      <text x="78" y="66" fontSize="13" fontFamily="var(--font-mono)" fill="var(--primary)">
        {URL_TEXT.split("").map((char, i) => (
          <motion.tspan
            key={i}
            animate={{ opacity: [0, 0, 1, 1] }}
            transition={{
              duration: CYCLE,
              times: [0, 0.32 + i * 0.0075, 0.33 + i * 0.0075, 1],
              repeat: Infinity,
            }}
          >
            {char}
          </motion.tspan>
        ))}
      </text>

      {/* Cursor glides to the bar */}
      <motion.path
        d="M0 0 L4.5 12 L7 7.5 L12 5 Z"
        fill="currentColor"
        animate={{ x: [220, 150, 150, 150], y: [150, 66, 66, 66], opacity: [1, 1, 0, 0] }}
        transition={{ duration: CYCLE, times: [0.12, 0.27, 0.32, 1], repeat: Infinity }}
      />

      {/* Enter pulse ring radiates */}
      <motion.circle
        cx="160" cy="62" r="26"
        fill="none" stroke="var(--primary)" strokeWidth="1.5"
        animate={{ scale: [1, 1, 1.4, 1], opacity: [0, 0.8, 0, 0] }}
        style={{ transformOrigin: "160px 62px" }}
        transition={{ duration: CYCLE, times: [0.55, 0.58, 0.68, 1], repeat: Infinity }}
      />
    </svg>
  );
}

function Frame() {
  return (
    <g stroke="currentColor" fill="none" strokeWidth={1.5} strokeLinecap="round">
      <rect x="40" y="30" width="240" height="140" rx="12" />
      <rect x="64" y="50" width="192" height="24" rx="8" stroke="var(--primary)" />
    </g>
  );
}
