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

  useImperativeHandle(ref, () => ({
    fillAndSubmit(repo: string) {
      typingStopped.current = true;
      setValue(repo);
      // Chips are known-good repos: resolve then submit.
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

  const borderClass = isInvalid
    ? "border-destructive"
    : focused || isValid
      ? "border-primary"
      : "border-border";
  const shadowStyle =
    focused && !isInvalid
      ? { boxShadow: "var(--shadow-search-focus)" }
      : { boxShadow: "var(--shadow-search)" };

  return (
    <div className="w-full max-w-[640px]">
      <div
        role="search"
        aria-busy={isSubmitting}
        onAnimationEnd={() => setShake(false)}
        className={`flex h-16 items-center gap-3 rounded-[16px] border bg-card pl-5 pr-2 transition-[border-color,box-shadow] duration-[180ms] ease-out max-md:h-14 ${borderClass} ${shake ? "gb-shake" : ""}`}
        style={shadowStyle}
      >
        {status.kind === "validating" ? (
          <Loader2
            className="size-4 shrink-0 animate-spin text-muted-foreground"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        ) : (
          <Search
            className="size-4 shrink-0 text-muted-foreground"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        )}

        {resolved?.avatarUrl ? (
          <span className="flex shrink-0 items-center gap-1.5 font-mono text-sm">
            <img
              src={resolved.avatarUrl}
              alt=""
              width={20}
              height={20}
              className="rounded"
            />
            <span className="max-w-[180px] truncate max-md:hidden">
              {resolved.owner}/{resolved.repo}
            </span>
            <Check
              className="size-4 text-success"
              strokeWidth={2}
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
          className="min-w-0 flex-1 bg-transparent font-mono text-[0.9375rem] outline-none placeholder:text-muted-foreground/70 focus-visible:outline-none"
        />

        {!focused && !value && (
          <kbd
            aria-hidden="true"
            className="hidden shrink-0 rounded border border-border px-1.5 py-0.5 font-mono text-xs text-muted-foreground md:block"
          >
            /
          </kbd>
        )}

        <button
          type="button"
          disabled={!isValid || isSubmitting}
          onClick={() => resolved && submit(resolved)}
          className="h-11 shrink-0 rounded-[12px] bg-primary px-4 font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-70 max-md:px-3"
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

      <div aria-live="polite">
        {isInvalid && (
          <p id="search-error" className="mt-2 text-sm text-destructive">
            {status.kind === "invalid" ? status.message : null}
          </p>
        )}
        {status.kind === "private" && (
          <p className="mt-2 text-sm text-muted-foreground">
            Private repos are coming soon — public repos only for now.
          </p>
        )}
      </div>
    </div>
  );
});
