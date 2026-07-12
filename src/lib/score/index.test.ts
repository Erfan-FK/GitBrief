import { describe, expect, it } from "vitest";
import { computeScore } from "./index";
import type { FactSheet } from "@/lib/generate/factsheet";

function facts(partial: Partial<FactSheet>): FactSheet {
  return {
    repo: {
      owner: "a",
      name: "b",
      defaultBranch: "main",
      stars: 0,
      primaryLanguage: null,
    },
    techList: [],
    scriptsMap: {},
    taskTargets: [],
    structureTree: [],
    workspaceTopology: [],
    readmeExcerpt: "",
    existingConfigAudit: [],
    languages: {},
    largeRepo: false,
    ...partial,
  };
}

describe("computeScore (02 §9)", () => {
  it("well-equipped repo lands in success band", () => {
    const result = computeScore(
      facts({
        scriptsMap: { "": { dev: "d", build: "b", test: "t" } },
        techList: [
          { slug: "typescript", name: "TypeScript", category: "language", packagePaths: [] },
          { slug: "vitest", name: "Vitest", category: "testing", packagePaths: [] },
          { slug: "supabase", name: "Supabase", category: "database", packagePaths: [] },
        ],
        readmeExcerpt: Array.from({ length: 40 }, (_, i) => `line ${i}`).join("\n"),
        packageManager: "pnpm",
      }),
      [
        "AGENTS.md",
        "pnpm-lock.yaml",
        ".github/workflows/ci.yml",
        ".cursorignore",
        "LICENSE",
        "src/lib/utils.test.ts",
      ],
    );
    expect(result.total).toBeGreaterThanOrEqual(80);
    expect(result.band).toBe("success");
  });

  it("bare repo lands in destructive band with fix hints", () => {
    const result = computeScore(facts({}), ["index.js"]);
    expect(result.total).toBeLessThan(50);
    expect(result.band).toBe("destructive");
    const failed = result.items.filter((item) => !item.pass);
    expect(failed.length).toBeGreaterThan(5);
    expect(failed.every((item) => item.fixHint.length > 0)).toBe(true);
  });

  it("points sum matches total and never exceeds 100", () => {
    const result = computeScore(facts({}), []);
    const sum = result.items.reduce((acc, item) => acc + item.points, 0);
    expect(result.total).toBe(sum);
    const max = result.items.reduce((acc, item) => acc + item.maxPoints, 0);
    expect(max).toBe(100);
  });
});
