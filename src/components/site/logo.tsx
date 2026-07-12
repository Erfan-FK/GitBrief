/** GitHub mark (simple-icons path) — lucide dropped brand icons. */
export function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

/**
 * Logo mark — hand-traced SVG of the Higgsfield L2 winner (04 §2:
 * "the shipped logo is ALWAYS the SVG, AI raster is reference only").
 * A solid violet lowercase b whose counter is a briefing document with
 * three lines. Raster masters live in public/assets/logo/.
 */
export function LogoMark({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
    >
      {/* b: rounded stem + full bowl, single solid shape */}
      <path
        d="M12 8
           a4 4 0 0 1 8 0
           v10.5
           a15 15 0 1 1 -8 13.5
           Z"
        fill="var(--primary)"
      />
      {/* briefing-document counter knocked out of the bowl */}
      <rect x="19" y="22" width="14" height="17" rx="4" fill="var(--background)" />
      {/* three briefing lines, decreasing width */}
      <rect x="22" y="26" width="8.5" height="2.4" rx="1.2" fill="var(--primary)" />
      <rect x="22" y="30.3" width="8.5" height="2.4" rx="1.2" fill="var(--primary)" />
      <rect x="22" y="34.6" width="5.5" height="2.4" rx="1.2" fill="var(--primary)" />
    </svg>
  );
}
