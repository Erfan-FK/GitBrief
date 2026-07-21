"use client";

/* eslint-disable @next/next/no-img-element -- 28px avatars from GitHub CDN */
import Link from "next/link";
import {
  SiAstro,
  SiDocker,
  SiFlask,
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
  SiZod,
  type IconType,
} from "@icons-pack/react-simple-icons";
import { GALLERY_FIXTURE, type GalleryEntry } from "@/fixtures/live-example";

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
  zod: SiZod,
  astro: SiAstro,
  flask: SiFlask,
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

function GalleryCard({ entry }: { entry: GalleryEntry }) {
  const owner = entry.repo.split("/")[0] ?? "";
  return (
    <Link
      href={`/${entry.repo}`}
      className="group block w-[250px] shrink-0 rounded-[12px] border border-border bg-card p-4 transition-[border-color,transform] duration-150 hover:-translate-y-0.5 hover:border-primary/40"
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
        <span className="truncate font-mono text-sm">{entry.repo}</span>
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
  );
}

/** One infinitely-scrolling row: content duplicated, translated 0 → -50%. */
function MarqueeRow({
  entries,
  duration,
}: {
  entries: GalleryEntry[];
  duration: number;
}) {
  return (
    <div className="gb-marquee" style={{ ["--gb-marquee-duration" as string]: `${duration}s` }}>
      <div className="gb-marquee-track">
        {[...entries, ...entries].map((entry, i) => (
          <GalleryCard key={`${entry.repo}-${i}`} entry={entry} />
        ))}
      </div>
    </div>
  );
}

/** 01 §9 — DB-backed when analyses exist; fixture fallback (never broken). */
export function Gallery({ entries }: { entries?: GalleryEntry[] }) {
  const list = entries && entries.length >= 8 ? entries : GALLERY_FIXTURE;
  const mid = Math.ceil(list.length / 2);
  const rowA = list.slice(0, mid);
  const rowB = list.slice(mid);
  return (
    <section id="gallery" className="overflow-hidden py-24 max-md:py-16">
      <div className="mx-auto max-w-[1100px] px-6">
        <h2 className="text-center font-display text-[2rem] font-bold tracking-[-0.02em]">
          Fresh briefs.
        </h2>
      </div>

      <div className="mt-12 space-y-4">
        <MarqueeRow entries={rowA} duration={48} />
        <MarqueeRow entries={rowB.length ? rowB : rowA} duration={62} />
      </div>
    </section>
  );
}
