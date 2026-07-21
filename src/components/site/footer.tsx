import Link from "next/link";
import { Heart } from "lucide-react";
import { GitHubIcon, LogoMark } from "@/components/site/logo";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { LINKS } from "@/lib/links";

const FOOTER_LINKS = [
  { href: LINKS.github, label: "GitHub", external: true },
  { href: LINKS.x, label: "X", external: true },
  { href: "/privacy", label: "Privacy", external: false },
  { href: LINKS.contact, label: "Contact", external: true },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-[1100px] px-6 py-8">
        {/* Top row: brand · links · actions — collapses to stack on mobile */}
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <Link href="/" className="flex items-center gap-2.5 rounded-[8px]">
            <LogoMark size={28} />
            <div className="flex flex-col leading-tight">
              <span className="font-display text-lg font-medium tracking-tight">
                gitbrief
              </span>
              <span className="text-xs text-muted-foreground">
                Briefings for AI coding agents.
              </span>
            </div>
          </Link>

          <nav
            aria-label="Footer"
            className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm"
          >
            {FOOTER_LINKS.map((link) =>
              link.external ? (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              ),
            )}
          </nav>

          <div className="flex items-center gap-2">
            <a
              href={LINKS.donate}
              target="_blank"
              rel="noopener noreferrer"
              data-umami-event="donate_clicked"
              data-umami-event-source="footer"
              className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-primary-soft px-3 text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-white"
            >
              <Heart className="size-4" strokeWidth={2} aria-hidden="true" />
              Donate
            </a>
            <a
              href={LINKS.github}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="gitbrief on GitHub"
              className="inline-flex size-9 items-center justify-center rounded-[8px] text-muted-foreground transition-colors hover:text-foreground"
            >
              <GitHubIcon className="size-5" />
            </a>
            <ThemeToggle />
          </div>
        </div>

        {/* Bottom row: legal + credit */}
        <div className="mt-6 flex flex-col gap-1 border-t border-border pt-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 gitbrief · Not affiliated with GitHub, Inc.</p>
          <p>
            Built by{" "}
            <a
              href={LINKS.githubOwner}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground transition-colors hover:text-primary"
            >
              Erfan
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
