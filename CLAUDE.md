# gitbrief — CLAUDE.md

Web app: paste a GitHub repo URL → verified agent-readiness bundle (CLAUDE.md, AGENTS.md, rules, version-matched skills, .mcp.json, score). Specs in `plan/00-04` are authoritative — read before coding.

## Commands
- `pnpm dev` — Next.js dev server
- `pnpm build` / `pnpm start` — production build / serve
- `pnpm test` — vitest unit tests · `pnpm test:e2e` — Playwright
- `pnpm lint` / `pnpm typecheck` — must pass before commit
- `pnpm db:migrate` / `pnpm db:seed` — Supabase migrations / seed technologies+rules
- `pnpm eval` — golden-set eval (M6+), writes `eval/report.md`
- `npx inngest-cli dev` — local job runner (run beside `pnpm dev`)

## Structure
- `src/app` — routes: `page.tsx` (landing), `[owner]/[repo]` (results), `api/*` (contracts in `lib/contracts.ts`)
- `src/lib` — `github/` client · `detect/` rules+lockfiles · `resolve/` skills · `generate/` prompts+writers · `validate/` gate · `score/`
- `src/inngest` — `analysis-run.ts` step chain
- `db/` — `schema.sql`, `seed/` · `eval/` — harness + fixtures · `plan/` — specs

## Rules
- Facts from parsers only; LLM output passes `lib/validate` gate or is stripped — never bypass.
- Zod-validate ALL external payloads (GitHub, LLM, SSE). TS strict, no bare `any`.
- Never log or persist repo source contents (see plan/02 §11).
- Temp 0.2, structured outputs, model ids from `lib/generate/models.ts` only.
- Deviations from specs → one line in `DECISIONS.md`.
