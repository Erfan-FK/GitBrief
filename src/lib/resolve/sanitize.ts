/**
 * Fetched-skill sanitizer — 02 §6.1. Strip HTML, enforce frontmatter,
 * cap size, scan for prompt-injection patterns → quarantine.
 */

export interface SanitizeResult {
  content: string;
  quarantined: boolean;
  reason?: string;
}

/** Imperatives addressing the agent to exfiltrate/override — 02 §6.1. */
const INJECTION_PATTERNS: RegExp[] = [
  /ignore (all |any )?(previous|prior|above) (instructions|rules|context)/i,
  /disregard (your|the) (system prompt|instructions|guidelines)/i,
  /(send|post|upload|exfiltrate|transmit) (the |your |all )?(code|secrets?|tokens?|credentials?|env|api keys?)/i,
  /you (must|should) (now )?act as/i,
  /do not (tell|inform|alert) the user/i,
  /reveal (your|the) (system prompt|instructions)/i,
  /curl\s+[^\n]*\|\s*(ba)?sh/i,
];

const MAX_CHARS = 32000; // ≈8k tokens

export function sanitizeSkill(raw: string, sourceUrl: string): SanitizeResult {
  // Strip HTML tags (fetched pages sometimes wrap markdown)
  let content = raw.replace(/<script[\s\S]*?<\/script>/gi, "");
  content = content.replace(/<style[\s\S]*?<\/style>/gi, "");
  content = content.replace(/<[^>\n]{1,200}>/g, "");

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(content)) {
      return {
        content: "",
        quarantined: true,
        reason: `prompt-injection pattern matched (${pattern.source.slice(0, 40)}…)`,
      };
    }
  }

  // Cap 8k tokens: keep SKILL.md body, drop the rest (02 §6.1)
  if (content.length > MAX_CHARS) {
    content = content.slice(0, MAX_CHARS) + "\n\n<!-- truncated by gitbrief -->\n";
  }

  // Enforce frontmatter name+description; synthesize if absent
  if (!/^---\n[\s\S]*?\n---/.test(content)) {
    const nameGuess =
      /^#\s+(.+)$/m.exec(content)?.[1]?.toLowerCase().replace(/[^\w]+/g, "-") ??
      "skill";
    content = `---\nname: ${nameGuess}\ndescription: Skill fetched from ${sourceUrl}\n---\n\n${content}`;
  } else {
    const frontmatter = /^---\n([\s\S]*?)\n---/.exec(content)?.[1] ?? "";
    let patched = frontmatter;
    if (!/^name:/m.test(frontmatter)) patched = `name: skill\n${patched}`;
    if (!/^description:/m.test(patched)) {
      patched = `${patched}\ndescription: Skill fetched from ${sourceUrl}`;
    }
    if (patched !== frontmatter) {
      content = content.replace(/^---\n[\s\S]*?\n---/, `---\n${patched}\n---`);
    }
  }

  return { content, quarantined: false };
}
