"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TabData {
  id: string;
  label: string;
  html: string;
  raw: string;
  tree?: string;
}

export function LiveExampleTabs({ tabs }: { tabs: TabData[] }) {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (tab: TabData) => {
    await navigator.clipboard.writeText(tab.raw);
    setCopied(tab.id);
    setTimeout(() => setCopied(null), 1200);
  };

  return (
    <Tabs
      defaultValue={tabs[0]?.id}
      className="mt-8 overflow-hidden rounded-[16px] bg-code-bg"
    >
      {/* Header bar: traffic lights (decor) + file tabs */}
      <div className="flex items-center gap-4 border-b border-white/10 px-4 pt-3">
        <div className="flex gap-1.5 opacity-40" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-[#FF5F57]" />
          <span className="size-2.5 rounded-full bg-[#FEBC2E]" />
          <span className="size-2.5 rounded-full bg-[#28C840]" />
        </div>
        <TabsList className="h-auto gap-1 overflow-x-auto rounded-none bg-transparent p-0">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="rounded-none border-0 border-b-2 border-transparent bg-transparent px-3 pb-2 pt-1 font-mono text-[0.8125rem] text-white/60 shadow-none transition-colors after:hidden hover:text-white/90 data-active:border-b-primary data-active:bg-transparent data-active:text-white data-active:shadow-none"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {tabs.map((tab) => (
        <TabsContent key={tab.id} value={tab.id} className="relative mt-0">
          <button
            type="button"
            onClick={() => void copy(tab)}
            aria-label={`Copy ${tab.label}`}
            className="absolute right-3 top-3 z-10 rounded-[8px] border border-white/15 p-2 text-white/70 transition-colors hover:text-white"
          >
            {copied === tab.id ? (
              <Check className="size-4 text-success" strokeWidth={1.5} />
            ) : (
              <Copy className="size-4" strokeWidth={1.5} />
            )}
          </button>
          <span aria-live="polite" className="sr-only">
            {copied === tab.id ? "Copied" : ""}
          </span>

          <div
            className="gb-noscroll relative max-h-[420px] overflow-auto"
            style={{
              maskImage:
                "linear-gradient(to bottom, transparent, black 24px, black calc(100% - 24px), transparent)",
            }}
          >
            {tab.tree ? (
              <div className="grid md:grid-cols-[220px_1fr]">
                <pre className="border-white/10 p-4 font-mono text-xs leading-6 text-white/70 md:border-r">
                  {tab.tree}
                </pre>
                <ExampleCode html={tab.html} />
              </div>
            ) : (
              <ExampleCode html={tab.html} />
            )}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}

function ExampleCode({ html }: { html: string }) {
  return (
    <div
      className="gb-shiki p-4 text-[0.8125rem] leading-6"
      // Shiki output is generated server-side from our own fixtures.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
