"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GitHubIcon, LogoMark } from "@/components/site/logo";
import { ThemeToggle } from "@/components/site/theme-toggle";

const NAV_LINKS = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#gallery", label: "Gallery" },
  { href: "/#faq", label: "FAQ" },
] as const;

export function Header() {
  const [solid, setSolid] = useState(false);

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
            <span
              aria-hidden="true"
              className="mx-2 h-5 w-px bg-border"
            />
          </nav>

          <a
            href="https://github.com/gitbrief"
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
    </header>
  );
}
