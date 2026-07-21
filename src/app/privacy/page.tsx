import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy — gitbrief",
  description: "What gitbrief stores, what it never stores, and why.",
};

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "What gitbrief does",
    body: [
      "You paste a public GitHub repository URL. gitbrief reads the repository's public metadata, manifests, and a small sample of source files to generate an agent-readiness bundle (AGENTS.md, CLAUDE.md, rules, skills, and a score). That's the whole product.",
    ],
  },
  {
    title: "What we store",
    body: [
      "Repository metadata (owner, name, default branch, stars, primary language) and the head commit SHA of the analysis.",
      "Detected technologies with versions, and the generated bundle files themselves (the markdown we produced, not your code).",
      "The readiness score and analysis timing, so a repeat visit can load a cached result instead of re-running the analysis.",
      "Anonymous, cookie-free usage analytics (page views and button clicks via Umami). No user accounts exist, so there is nothing to tie analytics to.",
    ],
  },
  {
    title: "What we never store",
    body: [
      "Your repository's source code. Sampled file excerpts are used in-memory to ground the generation and are discarded when the analysis ends — they are never written to our database or logs.",
      "Secrets. Sampled content is scrubbed for token- and key-shaped strings before it is used at all.",
      "Personal data. No accounts, no emails, no cookies for tracking.",
    ],
  },
  {
    title: "Third parties",
    body: [
      "GitHub — we call the public GitHub API to read public repositories. Their terms apply to that data.",
      "Anthropic — sampled excerpts and repository facts are sent to the Claude API to generate the bundle, subject to Anthropic's API data policies (inputs are not used to train models).",
      "Supabase — hosts our database (the stored items listed above).",
      "Context7 and vendor documentation sites — consulted for library documentation only; nothing about your repository is sent to them beyond the library name being looked up.",
    ],
  },
  {
    title: "Removal",
    body: [
      "Want a cached analysis of your repository removed? Email us and it will be deleted.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-[720px] px-6 pb-24 pt-32">
      <h1 className="font-display text-4xl font-bold tracking-[-0.02em]">
        Privacy
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Last updated July 2026 · The short version: we analyze public repos,
        keep the generated files, and never keep your code.
      </p>

      <div className="mt-12 space-y-10">
        {SECTIONS.map((section) => (
          <section key={section.title}>
            <h2 className="font-display text-xl font-semibold tracking-tight">
              {section.title}
            </h2>
            <ul className="mt-3 space-y-2.5">
              {section.body.map((line) => (
                <li
                  key={line.slice(0, 40)}
                  className="text-[0.9375rem] leading-relaxed text-muted-foreground"
                >
                  {line}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="mt-14 border-t border-border pt-6 text-sm text-muted-foreground">
        Questions?{" "}
        <a
          href="https://mail.google.com/mail/?view=cm&fs=1&to=erfanfarhangkia@gmail.com&su=gitbrief%20privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          Email us
        </a>{" "}
        or open an issue on{" "}
        <Link href="https://github.com/Erfan-FK/GitBrief" className="text-primary hover:underline">
          GitHub
        </Link>
        .
      </p>
    </main>
  );
}
