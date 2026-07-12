import { describe, expect, it } from "vitest";
import { validateFile, validateSkillFrontmatter } from "./index";
import type { FactSheet } from "@/lib/generate/factsheet";

const FACTS: FactSheet = {
  repo: {
    owner: "acme",
    name: "app",
    defaultBranch: "main",
    stars: 10,
    primaryLanguage: "TypeScript",
  },
  techList: [
    {
      slug: "nextjs",
      name: "Next.js",
      category: "framework",
      version: "15.3.0",
      versionConfidence: "exact",
      packagePaths: [""],
    },
  ],
  scriptsMap: { "": { dev: "next dev", build: "next build", test: "vitest" } },
  taskTargets: [{ file: "Makefile", targets: ["deploy"] }],
  structureTree: ["src/", "src/app/"],
  workspaceTopology: [],
  packageManager: "pnpm",
  readmeExcerpt: "",
  existingConfigAudit: [],
  languages: {},
  largeRepo: false,
};

const TREE = ["package.json", "src/app/page.tsx", "src/lib/utils.ts", "Makefile"];

describe("validateFile — the gate (02 §8)", () => {
  it("strips a planted hallucinated command, keeps real ones", () => {
    const input = [
      "## Commands",
      "- `pnpm dev` — start dev server",
      "- `pnpm deploy:production` — ship to prod", // PLANTED: no such script
      "- `make deploy` — deploy",
      "- `pnpm build` — build",
    ].join("\n");
    const result = validateFile(input, FACTS, TREE);
    expect(result.content).toContain("pnpm dev");
    expect(result.content).toContain("pnpm build");
    expect(result.content).toContain("make deploy");
    expect(result.content).not.toContain("deploy:production");
    expect(result.strippedClaims).toBe(1);
    expect(result.verifiedCommands).toBe(3);
    expect(result.checks[0]).toContain("deploy:production");
  });

  it("strips invented paths, keeps real ones", () => {
    const input = [
      "- `src/app/page.tsx` is the entry",
      "- `src/services/api/client.ts` holds the client", // PLANTED
    ].join("\n");
    const result = validateFile(input, FACTS, TREE);
    expect(result.content).toContain("src/app/page.tsx");
    expect(result.content).not.toContain("src/services");
    expect(result.strippedClaims).toBe(1);
  });

  it("strips wrong version claims", () => {
    const input = "Uses next.js@14.2 for routing.";
    const result = validateFile(input, FACTS, TREE);
    expect(result.content).not.toContain("next.js@14");
    expect(result.strippedClaims).toBe(1);
  });

  it("strips links outside the domain allowlist", () => {
    const input = [
      "[repo](https://github.com/acme/app)",
      "[evil](https://evil.example.com/x)",
    ].join("\n");
    const result = validateFile(input, FACTS, TREE);
    expect(result.content).toContain("github.com/acme/app");
    expect(result.content).not.toContain("evil.example.com");
  });

  it("allows vendor domains passed as extra", () => {
    const input = "[docs](https://nextjs.org/docs)";
    const result = validateFile(input, FACTS, TREE, ["nextjs.org"]);
    expect(result.content).toContain("nextjs.org/docs");
    expect(result.strippedClaims).toBe(0);
  });

  it("leaves fenced code blocks untouched", () => {
    const input = ["```bash", "pnpm not-a-script", "```"].join("\n");
    const result = validateFile(input, FACTS, TREE);
    expect(result.content).toContain("pnpm not-a-script");
    expect(result.strippedClaims).toBe(0);
  });
});

describe("validateSkillFrontmatter", () => {
  it("requires name and description", () => {
    expect(
      validateSkillFrontmatter("---\nname: x\ndescription: y\n---\nbody"),
    ).toBe(true);
    expect(validateSkillFrontmatter("---\nname: x\n---\nbody")).toBe(false);
    expect(validateSkillFrontmatter("no frontmatter")).toBe(false);
  });
});
