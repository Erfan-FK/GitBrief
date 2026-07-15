"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
/* eslint-disable @next/next/no-img-element -- 20px avatar chip, next/image overhead not warranted */
import { useRouter } from "next/navigation";
import { Check, Loader2, Search } from "lucide-react";
import {
  problemSchema,
  resolveResponseSchema,
  type ResolveResponse,
} from "@/lib/contracts";
import { resolveRepoInput } from "@/lib/github/resolve-input";
import { track } from "@/lib/analytics";

export interface SearchBarHandle {
  fillAndSubmit: (repo: string) => void;
  focusInput: () => void;
}

type Status =
  | { kind: "idle" }
  | { kind: "validating" }
  | { kind: "valid"; resolved: ResolveResponse }
  | { kind: "invalid"; message: string }
  | { kind: "private" }
  | { kind: "submitting"; resolved: ResolveResponse };

const TYPING_REPOS = [
  "github.com/vercel/next.js",
  "github.com/supabase/supabase",
  "github.com/shadcn-ui/ui",
  "github.com/vercel/ai",
];

const NOT_FOUND_MSG = "Repo not found — check the URL or try owner/repo";

/** Quick-try repos shown inside the bar (01 §4.4). */
const EXAMPLE_CHIPS = ["vercel/ai", "shadcn-ui/ui", "supabase/supabase"];

function truncateRepo(repo: string) {
  return repo.length > 18 ? `${repo.slice(0, 18)}…` : repo;
}

export const SearchBar = forwardRef<SearchBarHandle>(function SearchBar(
  _props,
  ref,
) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [focused, setFocused] = useState(false);
  const [shake, setShake] = useState(false);
  const [placeholder, setPlaceholder] = useState("github.com/owner/repo");

  const typingStopped = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestSeq = useRef(0);

  // Self-typing placeholder — stops permanently on first focus (01 §4.4).
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let repoIdx = 0;
    let charIdx = 0;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      if (typingStopped.current) {
        setPlaceholder("github.com/owner/repo");
        return;
      }
      const target = TYPING_REPOS[repoIdx % TYPING_REPOS.length] ?? "";
      if (!deleting) {
        charIdx++;
        setPlaceholder(target.slice(0, charIdx));
        if (charIdx >= target.length) {
          deleting = true;
          timer = setTimeout(tick, 1600);
          return;
        }
        timer = setTimeout(tick, 45);
      } else {
        charIdx--;
        setPlaceholder(target.slice(0, charIdx));
        if (charIdx <= 0) {
          deleting = false;
          repoIdx++;
        }
        timer = setTimeout(tick, 25);
      }
    };
    timer = setTimeout(tick, 600);
    return () => clearTimeout(timer);
  }, []);

  // `/` focuses the bar anywhere on the page; Esc clears (01 §4.4).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        event.key === "/" &&
        !event.metaKey &&
        !event.ctrlKey &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Score-teaser CTA scrolls here and focuses (01 §8).
  useEffect(() => {
    const onFocusRequest = () => inputRef.current?.focus();
    window.addEventListener("gitbrief:focus-search", onFocusRequest);
    return () =>
      window.removeEventListener("gitbrief:focus-search", onFocusRequest);
  }, []);

  const validate = useCallback(async (input: string) => {
    const seq = ++requestSeq.current;
    const parsed = resolveRepoInput(input);
    if (!parsed) {
      setStatus({ kind: "invalid", message: NOT_FOUND_MSG });
      setShake(true);
      return;
    }
    setStatus({ kind: "validating" });
    try {
      const res = await fetch("/api/repos/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });
      if (seq !== requestSeq.current) return; // stale response
      if (res.ok) {
        const data = resolveResponseSchema.safeParse(await res.json());
        if (data.success) {
          setStatus({ kind: "valid", resolved: data.data });
          return;
        }
      } else {
        const body = problemSchema.safeParse(await res.json().catch(() => null));
        const detail = body.success ? body.data.detail : NOT_FOUND_MSG;
        setStatus({ kind: "invalid", message: detail });
        setShake(true);
        return;
      }
      setStatus({ kind: "invalid", message: NOT_FOUND_MSG });
      setShake(true);
    } catch {
      if (seq !== requestSeq.current) return;
      setStatus({
        kind: "invalid",
        message: "Could not reach GitHub — try again shortly.",
      });
      setShake(true);
    }
  }, []);

  const scheduleValidate = useCallback(
    (input: string, immediate = false) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      requestSeq.current++;
      if (input.trim() === "") {
        setStatus({ kind: "idle" });
        return;
      }
      debounceRef.current = setTimeout(
        () => void validate(input),
        immediate ? 0 : 350,
      );
    },
    [validate],
  );

  const submit = useCallback(
    (resolved: ResolveResponse, source: "bar" | "chip" = "bar") => {
      track("analyze_submitted", { source });
      setStatus({ kind: "submitting", resolved });
      router.push(`/${resolved.owner}/${resolved.repo}`);
    },
    [router],
  );

  // Chip / ref entry point: fill the bar with a known-good repo and submit.
  const fillAndSubmit = useCallback(
    (repo: string) => {
      typingStopped.current = true;
      setValue(repo);
      void (async () => {
        setStatus({ kind: "validating" });
        try {
          const res = await fetch("/api/repos/resolve", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ input: repo }),
          });
          const data = resolveResponseSchema.safeParse(await res.json());
          if (res.ok && data.success) submit(data.data, "chip");
          else {
            setStatus({ kind: "invalid", message: NOT_FOUND_MSG });
            setShake(true);
          }
        } catch {
          setStatus({
            kind: "invalid",
            message: "Could not reach GitHub — try again shortly.",
          });
          setShake(true);
        }
      })();
    },
    [submit],
  );

  useImperativeHandle(ref, () => ({
    fillAndSubmit,
    focusInput() {
      inputRef.current?.focus();
    },
  }));

  const isValid = status.kind === "valid";
  const isInvalid = status.kind === "invalid";
  const isSubmitting = status.kind === "submitting";
  const resolved =
    status.kind === "valid" || status.kind === "submitting"
      ? status.resolved
      : null;

  // Focus affordance = a single soft glow ring + faint violet border tint.
  // No hard 1px primary border (that read as a "border inside the bar").
  const ringClass = isInvalid
    ? "border-destructive/60 shadow-[0_1px_2px_rgb(26_21_35_/0.05)]"
    : focused || isValid
      ? "border-primary/35 shadow-[0_0_0_4px_rgb(109_74_255_/0.12),0_10px_30px_-8px_rgb(109_74_255_/0.25)]"
      : "border-border shadow-[0_1px_2px_rgb(26_21_35_/0.05)]";

  return (
    <div className="w-full max-w-[640px]">
      <div
        role="search"
        aria-busy={isSubmitting}
        onAnimationEnd={() => setShake(false)}
        className={`overflow-hidden rounded-[20px] border bg-card/95 backdrop-blur-sm transition-[border-color,box-shadow] duration-200 ease-out ${ringClass} ${shake ? "gb-shake" : ""}`}
      >
        {/* Input row */}
        <div className="flex h-16 items-center gap-3 pl-5 pr-2 max-md:h-14">
          {status.kind === "validating" ? (
            <Loader2
              className="size-[18px] shrink-0 animate-spin text-primary"
              strokeWidth={1.75}
              aria-hidden="true"
            />
          ) : (
            <Search
              className={`size-[18px] shrink-0 transition-colors ${focused ? "text-primary" : "text-muted-foreground"}`}
              strokeWidth={1.75}
              aria-hidden="true"
            />
          )}

          {resolved?.avatarUrl ? (
            <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary-soft py-1 pl-1 pr-2.5 font-mono text-sm">
              <img
                src={resolved.avatarUrl}
                alt=""
                width={20}
                height={20}
                className="rounded-full"
              />
              <span className="max-w-[180px] truncate max-md:hidden">
                {resolved.owner}/{resolved.repo}
              </span>
              <Check
                className="size-4 text-success"
                strokeWidth={2.5}
                aria-hidden="true"
              />
            </span>
          ) : null}

          <input
            ref={inputRef}
            type="text"
            aria-label="GitHub repository URL"
            aria-invalid={isInvalid}
            aria-describedby={isInvalid ? "search-error" : undefined}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            disabled={isSubmitting}
            value={value}
            placeholder={resolved ? "" : placeholder}
            onFocus={() => {
              setFocused(true);
              typingStopped.current = true;
              window.dispatchEvent(new CustomEvent("gitbrief:search-focus"));
            }}
            onBlur={() => setFocused(false)}
            onChange={(event) => {
              setValue(event.target.value);
              scheduleValidate(event.target.value);
            }}
            onPaste={(event) => {
              const text = event.clipboardData.getData("text");
              if (text) scheduleValidate(text, true);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && isValid && resolved) {
                submit(resolved);
              }
              if (event.key === "Escape") {
                setValue("");
                setStatus({ kind: "idle" });
              }
            }}
            className="min-w-0 flex-1 bg-transparent font-mono text-[0.9375rem] outline-none placeholder:text-muted-foreground/60 focus-visible:outline-none"
          />

          {!focused && !value && (
            <kbd
              aria-hidden="true"
              className="hidden shrink-0 rounded-md border border-border bg-background px-1.5 py-0.5 font-mono text-xs text-muted-foreground md:block"
            >
              /
            </kbd>
          )}

          <button
            type="button"
            disabled={!isValid || isSubmitting}
            onClick={() => resolved && submit(resolved)}
            className="h-11 shrink-0 rounded-[14px] bg-primary px-4 font-medium text-white shadow-sm transition-all hover:bg-primary-hover disabled:opacity-60 max-md:px-3"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Reading repo…
              </span>
            ) : resolved ? (
              <span className="max-md:hidden">
                Brief {resolved.owner}/{truncateRepo(resolved.repo)} →
              </span>
            ) : (
              <span className="max-md:hidden">Brief it →</span>
            )}
            {!isSubmitting && <span className="md:hidden">→</span>}
          </button>
        </div>

        {/* Try-these chips, inside the island (hidden once a repo resolves) */}
        {!resolved && !isSubmitting && (
          <div className="gb-noscroll flex items-center gap-2 overflow-x-auto border-t border-border/70 bg-background/40 px-5 py-2.5">
            <span className="shrink-0 font-mono text-xs text-muted-foreground">
              Try
            </span>
            {EXAMPLE_CHIPS.map((repo) => (
              <button
                key={repo}
                type="button"
                onClick={() => fillAndSubmit(repo)}
                className="shrink-0 rounded-full border border-border bg-card px-2.5 py-1 font-mono text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary-soft hover:text-primary"
              >
                {repo}
              </button>
            ))}
          </div>
        )}
      </div>

      <div aria-live="polite">
        {isInvalid && (
          <p id="search-error" className="mt-2.5 text-center text-sm text-destructive">
            {status.kind === "invalid" ? status.message : null}
          </p>
        )}
        {status.kind === "private" && (
          <p className="mt-2.5 text-center text-sm text-muted-foreground">
            Private repos are coming soon — public repos only for now.
          </p>
        )}
      </div>
    </div>
  );
});
