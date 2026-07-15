"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

/**
 * A4 · BRIEF — three pages fly in from the corners, stack into one bundle,
 * a violet tie-line draws around it, a check badge springs in, then the
 * whole bundle floats gently. Seamless loop; reduced-motion → final frame.
 * viewBox 320×180.
 */
export function BriefAnim() {
  const ref = useRef<SVGSVGElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(".gb-page", { x: 0, y: 0, rotation: 0, opacity: 1 });
        gsap.set(".gb-tie", { strokeDashoffset: 0, opacity: 1 });
        gsap.set(".gb-check", { scale: 1, opacity: 1 });
      });

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({ repeat: -1, repeatDelay: 1 });

        tl.set(".gb-tie", { opacity: 0 })
          .set(".gb-check", { scale: 0, opacity: 0, transformOrigin: "center" })
          .set("#gb-p1", { x: -70, y: -46, rotation: -14, opacity: 0 })
          .set("#gb-p2", { x: 72, y: -34, rotation: 12, opacity: 0 })
          .set("#gb-p3", { x: -8, y: 60, rotation: 6, opacity: 0 })
          // pages fly to center + stack
          .to("#gb-p1", { x: -6, y: -4, rotation: -4, opacity: 1, duration: 0.55, ease: "power3.out" })
          .to("#gb-p2", { x: 6, y: -2, rotation: 4, opacity: 1, duration: 0.55, ease: "power3.out" }, "-=0.4")
          .to("#gb-p3", { x: 0, y: 0, rotation: 0, opacity: 1, duration: 0.55, ease: "power3.out" }, "-=0.4")
          // tie-line draws around the stack (pathLength=1 → offset 1→0)
          .set(".gb-tie", { opacity: 1, strokeDashoffset: 1 })
          .to(".gb-tie", {
            strokeDashoffset: 0,
            duration: 0.6,
            ease: "power2.inOut",
          }, "-=0.1")
          // check badge springs in
          .to(".gb-check", { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(2.4)" }, "-=0.15")
          // gentle float
          .to(".gb-bundle", { y: -4, duration: 1.1, ease: "sine.inOut", yoyo: true, repeat: 1 }, "+=0.2");
      });
    },
    { scope: ref },
  );

  const page = (id: string, x: number) => (
    <g id={id} className="gb-page">
      <rect
        x={x} y="54" width="72" height="80" rx="10"
        fill="var(--card)" stroke="currentColor" strokeWidth="2"
      />
      <rect x={x + 14} y="70" width="44" height="4" rx="2" fill="currentColor" opacity="0.55" />
      <rect x={x + 14} y="82" width="34" height="4" rx="2" fill="currentColor" opacity="0.55" />
      <rect x={x + 14} y="94" width="40" height="4" rx="2" fill="currentColor" opacity="0.55" />
    </g>
  );

  return (
    <svg
      ref={ref}
      viewBox="0 0 320 180"
      className="h-full w-full text-foreground/80"
      fill="none"
      aria-hidden="true"
    >
      <g className="gb-bundle" style={{ transformOrigin: "160px 94px" }}>
        {page("gb-p1", 124)}
        {page("gb-p2", 124)}
        {page("gb-p3", 124)}

        {/* violet tie-line around the bundle */}
        <rect
          className="gb-tie"
          x="118" y="48" width="84" height="92" rx="14"
          stroke="var(--primary)" strokeWidth="2.5"
          strokeLinecap="round" pathLength={1} strokeDasharray={1}
        />

        {/* check badge */}
        <g className="gb-check">
          <circle cx="196" cy="130" r="15" fill="var(--primary)" />
          <path
            d="M189 130 l5 5 l9 -10"
            stroke="#fff" strokeWidth="2.6" fill="none"
            strokeLinecap="round" strokeLinejoin="round"
          />
        </g>
      </g>
    </svg>
  );
}
