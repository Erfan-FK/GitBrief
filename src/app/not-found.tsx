/* eslint-disable @next/next/no-img-element -- decorative SVG illustration */
import Link from "next/link";

/** 404 — I5 art per 01 §21 (Higgsfield asset, 04 §3). */
export default function NotFound() {
  return (
    <div className="flex min-h-[100svh] flex-col items-center justify-center px-6 pt-16 text-center">
      {/* transparent vector; invert+hue-rotate keeps brand violet on dark */}
      <img
        src="/assets/illus/i5.svg"
        alt=""
        width={220}
        height={220}
        className="dark:invert dark:hue-rotate-180"
      />
      <h1 className="mt-6 font-display text-2xl font-medium">
        This page tore off somewhere.
      </h1>
      <p className="mt-2 max-w-[420px] text-muted-foreground">
        The repo or page you&apos;re after isn&apos;t here. Paste a GitHub URL
        on the homepage to brief a repo.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-[12px] bg-primary px-5 py-2.5 font-medium text-white transition-colors hover:bg-primary-hover"
      >
        Back to gitbrief
      </Link>
    </div>
  );
}
