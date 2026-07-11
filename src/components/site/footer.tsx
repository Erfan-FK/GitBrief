import Link from "next/link";
import { Heart } from "lucide-react";
import { LogoMark } from "@/components/site/logo";
import { ThemeToggle } from "@/components/site/theme-toggle";

export function Footer() {
  return (
    <footer className="border-t border-border py-12">
      <div className="mx-auto grid max-w-[1100px] gap-10 px-6 md:grid-cols-3">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <LogoMark size={24} />
            <span className="font-display text-lg font-medium">gitbrief</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Briefings for AI coding agents.
          </p>
        </div>

        <nav aria-label="Footer" className="flex flex-col gap-2 text-sm">
          <a
            href="https://github.com/Erfan-FK/GitBrief"
            target="_blank"
            rel="noopener noreferrer"
            className="w-fit text-muted-foreground transition-colors hover:text-foreground"
          >
            GitHub
          </a>
          <a
            href="https://x.com/gitbrief"
            target="_blank"
            rel="noopener noreferrer"
            className="w-fit text-muted-foreground transition-colors hover:text-foreground"
          >
            X
          </a>
          <Link
            href="/privacy"
            className="w-fit text-muted-foreground transition-colors hover:text-foreground"
          >
            Privacy
          </Link>
          <a
            href="mailto:hello@gitbrief.dev"
            className="w-fit text-muted-foreground transition-colors hover:text-foreground"
          >
            Contact
          </a>
        </nav>

        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-muted-foreground">
            Built by{" "}
            <a
              href="https://github.com/erfanfarhangkia"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground transition-colors hover:text-primary"
            >
              Erfan
            </a>
          </p>
          <a
            href="https://github.com/sponsors/gitbrief"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-[12px] border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <Heart className="size-4" strokeWidth={1.5} />
            Donate
          </a>
          <ThemeToggle />
        </div>
      </div>
      <div className="mx-auto mt-10 max-w-[1100px] px-6">
        <p className="text-xs text-muted-foreground">
          © 2026 gitbrief · Not affiliated with GitHub, Inc.
        </p>
      </div>
    </footer>
  );
}
