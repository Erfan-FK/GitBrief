"use client";

import { useEffect, useMemo, useState } from "react";
/* eslint-disable @next/next/no-img-element -- avatars from GitHub CDN */
import { motion, useReducedMotion } from "framer-motion";
import { Check, GitBranch, Star } from "lucide-react";
import type {
  DetectionCompleteEvent,
  ErrorEvent,
  RepoEvent,
  TechEvent,
} from "@/lib/analyze/events";
import { CATEGORY_ORDER } from "@/lib/detect/types";
import type { TechCategory } from "@/lib/detect/registry";

/** Results Phase 1 — "Reading" panel per 01 §19, fed by the SSE stream. */
export function DetectionPanel({
  owner,
  repo,
}: {
  owner: string;
  repo: string;
}) {
  const reduced = useReducedMotion();
  const [repoMeta, setRepoMeta] = useState<RepoEvent | null>(null);
  const [manifests, setManifests] = useState<string[]>([]);
  const [techs, setTechs] = useState<TechEvent[]>([]);
  const [complete, setComplete] = useState<DetectionCompleteEvent | null>(null);
  const [error, setError] = useState<ErrorEvent | null>(null);

  useEffect(() => {
    const source = new EventSource(
      `/api/analyses/stream?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`,
    );
    const on = <T,>(event: string, handler: (data: T) => void) => {
      source.addEventListener(event, (e) => {
        try {
          handler(JSON.parse((e as MessageEvent).data as string) as T);
        } catch {
          // malformed event — skip
        }
      });
    };
    on<RepoEvent>("repo", setRepoMeta);
    on<{ path: string }>("manifest", (d) =>
      setManifests((prev) => (prev.includes(d.path) ? prev : [...prev, d.path])),
    );
    on<TechEvent>("tech", (d) =>
      setTechs((prev) =>
        prev.some((t) => t.slug === d.slug) ? prev : [...prev, d],
      ),
    );
    on<DetectionCompleteEvent>("detection_complete", (d) => {
      setComplete(d);
      source.close();
    });
    on<ErrorEvent>("error", (d) => {
      setError(d);
      source.close();
    });
    source.onerror = () => {
      source.close();
      setError((prev) =>
        prev ?? { code: "internal", message: "Connection lost — reload to retry." },
      );
    };
    return () => source.close();
  }, [owner, repo]);

  const grouped = useMemo(() => {
    const byCategory = new Map<TechCategory, TechEvent[]>();
    for (const tech of techs) {
      const category = tech.category as TechCategory;
      const list = byCategory.get(category) ?? [];
      list.push(tech);
      byCategory.set(category, list);
    }
    return CATEGORY_ORDER.filter((c) => byCategory.has(c)).map((c) => ({
      category: c,
      techs: byCategory.get(c) ?? [],
    }));
  }, [techs]);

  return (
    <div className="mx-auto w-full max-w-[760px] px-6">
      {/* Repo header — instant */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="flex items-center gap-4"
      >
        {repoMeta ? (
          <img
            src={repoMeta.avatarUrl}
            alt=""
            width={48}
            height={48}
            className="rounded-full"
          />
        ) : (
          <div className="size-12 animate-pulse rounded-full bg-primary-soft" />
        )}
        <div>
          <h1 className="font-display text-2xl font-medium">
            {owner}/{repo}
          </h1>
          {repoMeta && (
            <div className="mt-1 flex flex-wrap gap-3 font-mono text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Star className="size-3" strokeWidth={1.5} aria-hidden="true" />
                {repoMeta.stars.toLocaleString()}
              </span>
              {repoMeta.language && <span>{repoMeta.language}</span>}
              <span className="flex items-center gap-1">
                <GitBranch className="size-3" strokeWidth={1.5} aria-hidden="true" />
                {repoMeta.defaultBranch}
              </span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Detection panel */}
      <div className="mt-8 rounded-[16px] border border-border bg-card p-6">
        <h2 className="font-display text-base font-medium" aria-live="polite">
          {error
            ? "Couldn't read this repo"
            : complete
              ? `${complete.techCount} technologies · ${complete.manifestCount} manifests read · ${(complete.durationMs / 1000).toFixed(1)}s${complete.cached ? " · cached" : ""}`
              : "Reading facts…"}
        </h2>

        {error ? (
          <p className="mt-3 text-sm text-destructive">{error.message}</p>
        ) : (
          <>
            <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[0.8125rem] text-muted-foreground">
              {manifests.map((path, i) => (
                <motion.li
                  key={path}
                  initial={{ opacity: reduced ? 1 : 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: reduced ? 0 : Math.min(i * 0.06, 1.2) }}
                  className="flex items-center gap-1"
                >
                  <Check
                    className="size-3 text-success"
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                  {path}
                </motion.li>
              ))}
            </ul>

            {grouped.map(({ category, techs: categoryTechs }) => (
              <div key={category} className="mt-5">
                <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                  {category}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {categoryTechs.map((tech) => (
                    <motion.span
                      key={tech.slug}
                      initial={reduced ? { opacity: 0 } : { scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.15 }}
                      className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-sm"
                    >
                      {tech.name}
                      {tech.version && (
                        <span
                          className={`font-mono text-xs ${tech.versionConfidence === "exact" ? "text-primary" : "text-muted-foreground"}`}
                        >
                          {tech.version}
                        </span>
                      )}
                    </motion.span>
                  ))}
                </div>
              </div>
            ))}

            {complete?.isMonorepo && (
              <p className="mt-5 font-mono text-xs text-muted-foreground">
                monorepo · workspace packages grouped
              </p>
            )}
            {complete?.largeRepo && (
              <p className="mt-2 font-mono text-xs text-warning">
                Large repo — analyzed from manifests only.
              </p>
            )}
          </>
        )}
      </div>

      {complete && !error && (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Bundle generation (CLAUDE.md, AGENTS.md, skills) ships in the next
          milestone.
        </p>
      )}
    </div>
  );
}
