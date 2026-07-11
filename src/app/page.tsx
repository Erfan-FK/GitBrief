export default function Home() {
  return (
    <div className="flex min-h-[100svh] flex-col items-center justify-center px-6 pb-[10vh] pt-16">
      <h1
        aria-label="Make any repo agent-ready"
        className="max-w-[720px] text-center font-display text-[clamp(2.5rem,6vw,4.25rem)] font-bold leading-[1.05] tracking-[-0.02em]"
      >
        Make any repo <span className="text-primary">agent-ready</span>.
      </h1>
      <p className="mt-6 max-w-[560px] text-center text-muted-foreground">
        Paste a GitHub URL — get CLAUDE.md, AGENTS.md, rules and
        version-matched skill files, grounded in your actual codebase. Free, no
        signup.
      </p>
      <p className="mt-10 font-mono text-sm text-muted-foreground">
        Landing page under construction — M2.
      </p>
    </div>
  );
}
