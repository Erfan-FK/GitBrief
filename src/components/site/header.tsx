"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, Star } from "lucide-react";
import { GitHubIcon, LogoMark } from "@/components/site/logo";
import { ThemeToggle } from "@/components/site/theme-toggle";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const NAV_LINKS = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#gallery", label: "Gallery" },
  { href: "/#faq", label: "FAQ" },
] as const;

const GITHUB_URL = "https://github.com/Erfan-FK/GitBrief";

export function Header({ stars }: { stars: number | null }) {
  const [solid, setSolid] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 h-16 transition-[background-color,border-color,backdrop-filter] duration-200 ease-out ${
        solid
          ? "border-b border-border bg-background/80 backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-full max-w-[1100px] items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 rounded-[8px]">
          <LogoMark size={24} />
          <span className="font-display text-lg font-medium">gitbrief</span>
        </Link>

        <div className="flex items-center gap-1">
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-[8px] px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
            <span aria-hidden="true" className="mx-2 h-5 w-px bg-border" />
          </nav>

          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="gitbrief on GitHub"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[8px] px-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <GitHubIcon className="size-5" />
            {stars !== null && (
              <span className="flex items-center gap-0.5 font-mono text-xs max-md:hidden">
                <Star className="size-3" strokeWidth={1.5} aria-hidden="true" />
                {stars >= 1000 ? `${(stars / 1000).toFixed(1)}k` : stars}
              </span>
            )}
          </a>
          <ThemeToggle />

          {/* Mobile: sheet menu — 01 §3 */}
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger
              aria-label="Open menu"
              render={
                <button
                  type="button"
                  className="inline-flex size-9 items-center justify-center rounded-[8px] text-muted-foreground transition-colors hover:text-foreground md:hidden"
                />
              }
            >
              <Menu className="size-5" strokeWidth={1.5} />
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <nav aria-label="Mobile" className="mt-8 flex flex-col gap-1 px-2">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="rounded-[8px] px-3 py-2.5 font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
