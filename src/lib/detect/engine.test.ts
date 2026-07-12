import { describe, expect, it } from "vitest";
import { runDetection, findWorkspaces } from "./engine";
import type { EngineInput } from "./engine";

function input(partial: Partial<EngineInput>): EngineInput {
  return {
    treePaths: [],
    files: new Map(),
    languages: {},
    largeRepo: false,
    ...partial,
  };
}

describe("runDetection", () => {
  it("detects next/react/tailwind v4 with exact lockfile versions", () => {
    const result = runDetection(
      input({
        treePaths: [
          "package.json",
          "pnpm-lock.yaml",
          "postcss.config.mjs",
          "tsconfig.json",
          "src/app/layout.tsx",
        ],
        files: new Map([
          [
            "package.json",
            JSON.stringify({
              dependencies: { next: "^15.3.0", react: "^19.0.0" },
              devDependencies: { tailwindcss: "^4.1.0", typescript: "^5.8.0" },
            }),
          ],
          [
            "pnpm-lock.yaml",
            `lockfileVersion: '9.0'
importers:
  .:
    dependencies:
      next:
        specifier: ^15.3.0
        version: 15.3.0(react@19.0.0)
      react:
        specifier: ^19.0.0
        version: 19.0.0
    devDependencies:
      tailwindcss:
        specifier: ^4.1.0
        version: 4.1.4
      typescript:
        specifier: ^5.8.0
        version: 5.8.2
`,
          ],
          ["postcss.config.mjs", `export default { plugins: { "@tailwindcss/postcss": {} } };`],
        ]),
      }),
    );

    const bySlug = new Map(result.techs.map((t) => [t.slug, t]));
    expect(bySlug.get("nextjs")?.version).toBe("15.3.0");
    expect(bySlug.get("nextjs")?.versionConfidence).toBe("exact");
    expect(bySlug.get("nextjs")?.variant).toBe("app-router");
    expect(bySlug.get("react")?.variant).toBe("react-19");
    expect(bySlug.get("tailwind")?.version).toBe("4.1.4");
    expect(bySlug.get("tailwind")?.variant).toBe("tailwind-v4");
    expect(bySlug.get("typescript")?.version).toBe("5.8.2");
    expect(result.packageManager).toBe("pnpm");
    expect(result.techs.every((t) => t.evidence.length > 0)).toBe(true);
  });

  it("detects python fastapi via pyproject + poetry.lock", () => {
    const result = runDetection(
      input({
        treePaths: ["pyproject.toml", "poetry.lock"],
        files: new Map([
          [
            "pyproject.toml",
            `[tool.poetry.dependencies]
python = "^3.11"
fastapi = "^0.115"
`,
          ],
          [
            "poetry.lock",
            `[[package]]
name = "fastapi"
version = "0.115.8"
`,
          ],
        ]),
      }),
    );
    const fastapi = result.techs.find((t) => t.slug === "fastapi");
    expect(fastapi?.version).toBe("0.115.8");
    expect(fastapi?.versionConfidence).toBe("exact");
    expect(result.techs.some((t) => t.slug === "python")).toBe(true);
  });

  it("detects gin via go.mod with exact version", () => {
    const result = runDetection(
      input({
        treePaths: ["go.mod", "go.sum"],
        files: new Map([
          [
            "go.mod",
            `module example.com/app

require (
\tgithub.com/gin-gonic/gin v1.10.0
)
`,
          ],
        ]),
      }),
    );
    const gin = result.techs.find((t) => t.slug === "gin");
    expect(gin?.version).toBe("1.10.0");
    expect(result.techs.some((t) => t.slug === "go")).toBe(true);
  });

  it("groups monorepo workspaces per package", () => {
    const files = new Map([
      [
        "package.json",
        JSON.stringify({ workspaces: ["packages/*"] }),
      ],
      [
        "packages/web/package.json",
        JSON.stringify({ dependencies: { next: "15.0.0" } }),
      ],
      [
        "packages/db/package.json",
        JSON.stringify({ dependencies: { "drizzle-orm": "0.36.0" } }),
      ],
    ]);
    const treePaths = [
      "package.json",
      "packages/web/package.json",
      "packages/db/package.json",
    ];
    const workspaces = findWorkspaces(input({ treePaths, files }));
    expect(workspaces.map((w) => w.path).sort()).toEqual([
      "packages/db",
      "packages/web",
    ]);

    const result = runDetection(input({ treePaths, files }));
    expect(result.isMonorepo).toBe(true);
    const next = result.techs.find((t) => t.slug === "nextjs");
    expect(next?.packagePaths).toContain("packages/web");
    const drizzle = result.techs.find((t) => t.slug === "drizzle");
    expect(drizzle?.packagePaths).toContain("packages/db");
  });

  it("detects shadcn from components.json (file rule only)", () => {
    const result = runDetection(
      input({ treePaths: ["components.json"], files: new Map() }),
    );
    expect(result.techs.some((t) => t.slug === "shadcn")).toBe(true);
  });
});
