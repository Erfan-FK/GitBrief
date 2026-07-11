import { codeToHtml } from "shiki";
import {
  AGENTS_MD,
  CLAUDE_MD,
  MCP_JSON,
  SKILL_MD,
  SKILLS_TREE,
} from "@/fixtures/live-example";
import { LiveExampleTabs } from "@/components/landing/live-example-tabs";

const THEME = "one-dark-pro"; // one dark theme, both modes — 01 §7

/** Server component: pre-highlights fixture content with Shiki. */
export async function LiveExample() {
  const [agents, claude, skill, mcp] = await Promise.all([
    codeToHtml(AGENTS_MD, { lang: "markdown", theme: THEME }),
    codeToHtml(CLAUDE_MD, { lang: "markdown", theme: THEME }),
    codeToHtml(SKILL_MD, { lang: "markdown", theme: THEME }),
    codeToHtml(MCP_JSON, { lang: "json", theme: THEME }),
  ]);

  return (
    <section className="px-6 py-24 max-md:py-16">
      <div className="mx-auto max-w-[900px]">
        <h2 className="text-center font-display text-[2rem] font-bold tracking-[-0.02em]">
          This is a real brief.
        </h2>
        <p className="mt-2 text-center text-muted-foreground">
          Generated for vercel/ai — untouched.
        </p>

        <LiveExampleTabs
          tabs={[
            { id: "agents", label: "AGENTS.md", html: agents, raw: AGENTS_MD },
            { id: "claude", label: "CLAUDE.md", html: claude, raw: CLAUDE_MD },
            {
              id: "skills",
              label: "skills/",
              html: skill,
              raw: SKILL_MD,
              tree: SKILLS_TREE,
            },
            { id: "mcp", label: ".mcp.json", html: mcp, raw: MCP_JSON },
          ]}
        />

        <div className="mt-4 flex flex-wrap justify-center gap-2 font-mono text-xs text-muted-foreground">
          <span className="rounded-full border border-border px-3 py-1">⏱ 9.4s</span>
          <span className="rounded-full border border-border px-3 py-1">📦 6 files</span>
          <span className="rounded-full border border-border px-3 py-1">✓ 14 commands verified</span>
        </div>
      </div>
    </section>
  );
}
