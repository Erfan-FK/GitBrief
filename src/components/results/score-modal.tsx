"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ScoreEvent } from "@/lib/analyze/events";
import { track } from "@/lib/analytics";

/** Score breakdown modal — 01 §20: pass/fail rows, fix hints, copy list. */
export function ScoreModal({ score }: { score: ScoreEvent }) {
  const [copied, setCopied] = useState(false);

  const bandClass =
    score.band === "success"
      ? "border-success/40 text-success"
      : score.band === "warning"
        ? "border-warning/40 text-warning"
        : "border-destructive/40 text-destructive";

  const copyFixList = async () => {
    const fixes = score.items
      .filter((item) => !item.pass)
      .map((item) => `- ${item.label} (+${item.maxPoints}): ${item.fixHint}`)
      .join("\n");
    await navigator.clipboard.writeText(
      `Readiness score ${score.total}/100 — fixes:\n${fixes}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <Dialog onOpenChange={(open) => open && track("score_viewed")}>
      <DialogTrigger
        render={
          <button
            type="button"
            className={`flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-sm transition-colors hover:bg-primary-soft ${bandClass}`}
          />
        }
      >
        score {score.total}
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">
            Readiness score: {score.total}/100
          </DialogTitle>
        </DialogHeader>
        <ul className="mt-2 space-y-2">
          {score.items.map((item) => (
            <li key={item.key} className="flex items-start gap-2 text-sm">
              <span
                className={`mt-0.5 shrink-0 font-mono ${item.pass ? "text-success" : "text-destructive"}`}
              >
                {item.pass ? "✓" : "✗"}
              </span>
              <span className="flex-1">
                {item.label}
                {!item.pass && (
                  <span className="block text-xs text-muted-foreground">
                    {item.fixHint}
                  </span>
                )}
              </span>
              <span className="shrink-0 font-mono text-xs text-muted-foreground">
                {item.points}/{item.maxPoints}
              </span>
            </li>
          ))}
        </ul>
        {score.items.some((item) => !item.pass) && (
          <button
            type="button"
            onClick={() => void copyFixList()}
            className="mt-4 flex h-9 items-center justify-center gap-2 rounded-[12px] border border-primary px-4 text-sm font-medium text-primary transition-colors hover:bg-primary-soft"
          >
            {copied ? (
              <Check className="size-4" strokeWidth={1.5} />
            ) : (
              <Copy className="size-4" strokeWidth={1.5} />
            )}
            Copy fix list
          </button>
        )}
        <span aria-live="polite" className="sr-only">
          {copied ? "Copied" : ""}
        </span>
      </DialogContent>
    </Dialog>
  );
}
