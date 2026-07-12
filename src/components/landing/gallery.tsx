"use client";

/* eslint-disable @next/next/no-img-element -- 28px avatars from GitHub CDN */
import Link from "next/link";
import {
  SiDocker,
  SiGo,
  SiNextdotjs,
  SiPostgresql,
  SiPydantic,
  SiPython,
  SiRadixui,
  SiReact,
  SiRust,
  SiTailwindcss,
  SiTypescript,
  SiVite,
  SiVitest,
  type IconType,
} from "@icons-pack/react-simple-icons";
import { GALLERY_FIXTURE, type GalleryEntry } from "@/fixtures/live-example";
import { SectionReveal } from "@/components/landing/section-reveal";

const ICONS: Record<string, IconType> = {
  typescript: SiTypescript,
  react: SiReact,
  nextdotjs: SiNextdotjs,
  vitest: SiVitest,
  tailwindcss: SiTailwindcss,
  radixui: SiRadixui,
  postgresql: SiPostgresql,
  docker: SiDocker,
  python: SiPython,
  pydantic: SiPydantic,
  go: SiGo,
  rust: SiRust,
  vite: SiVite,
  starlette: SiPython, // no simple-icons mark; nearest ecosystem icon
  turbo: SiVite, // placeholder until icon map is DB-driven (M5)
};

function scoreBand(score: number) {
  if (score >= 80)
    return "text-success border-success/30 bg-success/10";
  if (score >= 50)
    return "text-warning border-warning/30 bg-warning/10";
  return "text-destructive border-destructive/30 bg-destructive/10";
}

/** 01 §9 — DB-backed when analyses exist; fixture fallback (never broken). */
export function Gallery({ entries }: { entries?: GalleryEntry[] }) {
  const list = entries && entries.length >= 4 ? entries : GALLERY_FIXTURE;
  return (
    <section id="gallery" className="px-6 py-24 max-md:py-16">
      <div className="mx-auto max-w-[1100px]">
        <h2 className="text-center font-display text-[2rem] font-bold tracking-[-0.02em]">
          Fresh briefs.
        </h2>

        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {list.map((entry, i) => {
            const owner = entry.repo.split("/")[0] ?? "";
            return (
              <SectionReveal key={entry.repo} delay={i * 0.05}>
                <Link
                  href={`/${entry.repo}`}
                  className="group block rounded-[12px] border border-border bg-card p-4 transition-[border-color,transform] duration-150 hover:-translate-y-0.5 hover:border-primary/40"
                >
                  <div className="flex items-center gap-2">
                    <img
                      src={`https://github.com/${owner}.png?size=56`}
                      alt=""
                      width={28}
                      height={28}
                      loading="lazy"
                      className="rounded-full"
                    />
                    <span className="truncate font-mono text-sm">
                      {entry.repo}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex gap-2 text-muted-foreground">
                      {entry.stack.slice(0, 5).map((slug) => {
                        const Icon = ICONS[slug];
                        return Icon ? (
                          <Icon
                            key={slug}
                            size={16}
                            aria-label={slug}
                            className="transition-colors group-hover:text-primary"
                          />
                        ) : null;
                      })}
                    </div>
                    <span
                      className={`rounded-full border px-2 py-0.5 font-mono text-xs ${scoreBand(entry.score)}`}
                    >
                      {entry.score}
                    </span>
                  </div>
                </Link>
              </SectionReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
