import type { TechCategory } from "@/lib/detect/registry";

export interface Evidence {
  file: string;
  kind: "dependency" | "file" | "config-pattern" | "lockfile";
  /** ≤120 chars — 02 §3; never raw source beyond this. */
  excerpt: string;
}

export interface DetectedTech {
  slug: string;
  name: string;
  category: TechCategory;
  iconRef?: string;
  /** Exact from lockfile, or range with confidence:'range' — 02 §3 L3. */
  version?: string;
  versionConfidence?: "exact" | "range";
  /** Versioned variant from disambiguators, e.g. 'tailwind-v4'. */
  variant?: string;
  evidence: Evidence[];
  /** Monorepo: workspace package paths this tech appears in ('' = root). */
  packagePaths: string[];
}

export interface WorkspacePackage {
  path: string; // '' = root
  name?: string;
}

export interface DetectionResult {
  techs: DetectedTech[];
  /** Manifest/config files actually read, in read order. */
  manifestsRead: string[];
  languages: Record<string, number>;
  isMonorepo: boolean;
  workspaces: WorkspacePackage[];
  packageManager?: "pnpm" | "yarn" | "npm" | "bun";
  largeRepo: boolean;
  durationMs: number;
}

/** Category display order — 01 §19. */
export const CATEGORY_ORDER: TechCategory[] = [
  "framework",
  "language",
  "styling",
  "database",
  "auth",
  "testing",
  "infra",
  "tooling",
  "ai",
  "uncategorized",
];
