"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

/**
 * A3 · READ — file tree draws in, a violet scan line sweeps across, the two
 * manifest rows glow as it passes, and three version chips pop in with a
 * spring. Seamless loop; reduced-motion → final frame. viewBox 320×180.
 */
const ROWS = [
  { y: 40, x: 62, w: 60 },
  { y: 58, x: 78, w: 84, glow: true }, // package.json
  { y: 76, x: 78, w: 72, glow: true }, // lockfile
  { y: 94, x: 78, w: 54 },
  { y: 112, x: 62, w: 66 },
  { y: 130, x: 78, w: 80 },
];

export function ReadAnim() {
  const ref = useRef<SVGSVGElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(".gb-row", { strokeDashoffset: 0, opacity: 1 });
        gsap.set(".gb-glow", { opacity: 1 });
        gsap.set(".gb-chip", { opacity: 1, scale: 1 });
        gsap.set(".gb-scan", { opacity: 0 });
      });

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({ repeat: -1, repeatDelay: 1 });

        tl.set(".gb-glow", { opacity: 0 })
          .set(".gb-chip", { opacity: 0, scale: 0.5, transformOrigin: "center" })
          .set(".gb-scan", { opacity: 0, x: -120 })
          // rows draw in, staggered (pathLength=1 → normalized offset 1→0)
          .set(".gb-row", { strokeDashoffset: 1, opacity: 0 })
          .to(".gb-row", {
            strokeDashoffset: 0,
            opacity: 1,
            duration: 0.5,
            ease: "power2.out",
            stagger: 0.09,
          })
          // scan sweep left → right
          .to(".gb-scan", { opacity: 1, duration: 0.15 })
          .to(".gb-scan", { x: 96, duration: 1.1, ease: "power1.inOut" }, "<")
          // manifests glow as the scan passes them
          .to(".gb-glow", { opacity: 1, duration: 0.25, stagger: 0.28 }, "<+0.35")
          .to(".gb-scan", { opacity: 0, duration: 0.2 }, "-=0.1")
          // version chips pop
          .to(
            ".gb-chip",
            { opacity: 1, scale: 1, duration: 0.4, stagger: 0.12, ease: "back.out(2.2)" },
            "-=0.3",
          );
      });
    },
    { scope: ref },
  );

  return (
    <svg
      ref={ref}
      viewBox="0 0 320 180"
      className="h-full w-full text-foreground/80"
      fill="none"
      aria-hidden="true"
    >
      {/* tree spine */}
      <line
        className="gb-row"
        x1="52" y1="34" x2="52" y2="136"
        stroke="currentColor" strokeWidth="1.5" opacity="0.4"
        strokeLinecap="round" pathLength={1} strokeDasharray={1}
      />

      {/* file rows */}
      {ROWS.map((r, i) => (
        <line
          key={i}
          className="gb-row"
          x1={r.x} y1={r.y} x2={r.x + r.w} y2={r.y}
          stroke="currentColor" strokeWidth="3" strokeLinecap="round"
          pathLength={1} strokeDasharray={1}
        />
      ))}

      {/* violet glow overlays on the two manifest rows */}
      {ROWS.filter((r) => r.glow).map((r, i) => (
        <line
          key={i}
          className="gb-glow"
          x1={r.x} y1={r.y} x2={r.x + r.w} y2={r.y}
          stroke="var(--primary)" strokeWidth="3" strokeLinecap="round"
        />
      ))}

      {/* scan line */}
      <line
        className="gb-scan"
        x1="120" y1="30" x2="120" y2="140"
        stroke="var(--primary)" strokeWidth="2" strokeLinecap="round"
      />

      {/* version chips */}
      <g className="gb-chip">
        <rect x="214" y="52" width="52" height="20" rx="7" fill="none" stroke="var(--primary)" strokeWidth="2" />
        <rect x="222" y="60" width="26" height="4" rx="2" fill="var(--primary)" />
        <rect x="252" y="60" width="8" height="4" rx="2" fill="var(--primary)" />
      </g>
      <g className="gb-chip">
        <rect x="214" y="80" width="52" height="20" rx="7" fill="none" stroke="var(--primary)" strokeWidth="2" />
        <rect x="222" y="88" width="20" height="4" rx="2" fill="var(--primary)" />
        <rect x="246" y="88" width="12" height="4" rx="2" fill="var(--primary)" />
      </g>
      <g className="gb-chip">
        <rect x="214" y="108" width="52" height="20" rx="7" fill="none" stroke="var(--primary)" strokeWidth="2" />
        <rect x="222" y="116" width="30" height="4" rx="2" fill="var(--primary)" />
      </g>
    </svg>
  );
}
