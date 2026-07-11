/**
 * Normalize any user input to {owner, repo, branch?} — 02 §1 /api/repos/resolve.
 * Accepts: full URLs, owner/repo shorthand, /tree|/blob deep links (strip,
 * keep branch), trailing .git, www., gitbrief.dev swaps.
 */
export interface ResolvedRepoInput {
  owner: string;
  repo: string;
  branch?: string;
}

const OWNER_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38})$/;
const REPO_RE = /^[a-zA-Z0-9._-]{1,100}$/;

const ACCEPTED_HOSTS = new Set(["github.com", "gitbrief.dev"]);

export function resolveRepoInput(raw: string): ResolvedRepoInput | null {
  let input = raw.trim();
  if (input.length === 0 || input.length > 500) return null;

  // Strip protocol and www.
  input = input.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, "");
  input = input.replace(/^www\./, "");

  // Host-prefixed forms → strip accepted host.
  const firstSlash = input.indexOf("/");
  if (firstSlash > 0) {
    const head = input.slice(0, firstSlash).toLowerCase();
    if (head.includes(".")) {
      if (!ACCEPTED_HOSTS.has(head)) return null;
      input = input.slice(firstSlash + 1);
    }
  }

  // Drop query/hash.
  input = input.replace(/[?#].*$/, "");
  // Trim slashes.
  input = input.replace(/^\/+|\/+$/g, "");

  const segments = input.split("/").filter(Boolean);
  if (segments.length < 2) return null;

  const owner = segments[0];
  let repo = segments[1];
  if (owner === undefined || repo === undefined) return null;
  repo = repo.replace(/\.git$/, "");

  let branch: string | undefined;
  const deepKind = segments[2];
  if (
    segments.length >= 4 &&
    (deepKind === "tree" || deepKind === "blob" || deepKind === "commits")
  ) {
    branch = segments[3];
  }

  if (!OWNER_RE.test(owner) || !REPO_RE.test(repo)) return null;
  if (repo === "." || repo === "..") return null;

  const result: ResolvedRepoInput = { owner, repo };
  if (branch) result.branch = branch;
  return result;
}
