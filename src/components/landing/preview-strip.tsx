"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  SiNextdotjs,
  SiReact,
  SiSupabase,
  SiTailwindcss,
  SiTypescript,
} from "@icons-pack/react-simple-icons";
import { FileText, Folder } from "lucide-react";

const STACK = [
  { Icon: SiNextdotjs, label: "Next.js" },
  { Icon: SiReact, label: "React" },
  { Icon: SiTailwindcss, label: "Tailwind" },
  { Icon: SiSupabase, label: "Supabase" },
  { Icon: SiTypescript, label: "TypeScript" },
];

const TREE = [
  "AGENTS.md",
  "CLAUDE.md",
  ".cursor/rules/gitbrief.mdc",
  ".claude/skills/nextjs-15/SKILL.md",
  ".claude/skills/react-19/SKILL.md",
  ".claude/skills/tailwind-v4/SKILL.md",
  ".claude/skills/supabase/SKILL.md",
  ".claude/skills/typescript/SKILL.md",
  ".mcp.json",
  ".cursorignore",
];

/** 01 §5 — framed results mock; auto-plays once at ≥50% in view. */
export function PreviewStrip() {
  const reduced = useReducedMotion();

  return (
    <section id="preview" className="px-6 py-24 max-md:py-16">
      <motion.div
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="mx-auto max-w-[900px] rounded-[16px] border border-border bg-card p-6"
      >
        {/* 1 — stack icons light up one by one */}
        <div className="flex items-center gap-4">
          {STACK.map(({ Icon, label }, i) => (
            <motion.span
              key={label}
              title={label}
              initial={{ opacity: reduced ? 1 : 0.25 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ delay: reduced ? 0 : 0.3 + i * 0.08 }}
              className="text-muted-foreground"
            >
              <Icon size={20} aria-label={label} />
            </motion.span>
          ))}
        </div>

        {/* 2 — file tree assembles line by line */}
        <ul className="mt-6 space-y-1.5 font-mono text-[0.8125rem]">
          {TREE.map((path, i) => (
            <motion.li
              key={path}
              initial={reduced ? { opacity: 1 } : { opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ delay: reduced ? 0 : 0.8 + i * 0.06, duration: 0.25 }}
              className="flex items-center gap-2 text-foreground/90"
            >
              {path.endsWith("/") || path.includes("/") ? (
                <Folder className="size-3.5 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
              ) : (
                <FileText className="size-3.5 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
              )}
              {path}
            </motion.li>
          ))}
        </ul>

        {/* 3 — caption */}
        <motion.p
          initial={{ opacity: reduced ? 1 : 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ delay: reduced ? 0 : 1.9 }}
          className="mt-6 text-right font-mono text-xs text-muted-foreground"
        >
          analyzed in 9.4s · 0 hallucinated commands
        </motion.p>
      </motion.div>
    </section>
  );
}
