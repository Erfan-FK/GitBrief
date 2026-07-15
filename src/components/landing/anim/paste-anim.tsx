"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

/**
 * A2 · PASTE — GSAP-driven browser scene: window draws in, cursor glides to
 * the address bar, the bar tints violet, an abstract URL types out as blocks,
 * Enter fires a violet ripple. Seamless loop; reduced-motion → final frame.
 * viewBox 320×180, stroke = currentColor, accent = var(--primary).
 */
export function PasteAnim() {
  const ref = useRef<SVGSVGElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(".gb-draw", { strokeDashoffset: 0 });
        gsap.set([".gb-bar-fill", ".gb-char", ".gb-cursor"], { opacity: 1 });
        gsap.set(".gb-char", { scaleX: 1 });
      });

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.9 });

        tl.set(".gb-char", { transformOrigin: "left center", scaleX: 0, opacity: 0 })
          .set(".gb-bar-fill", { opacity: 0 })
          .set(".gb-ripple", { opacity: 0, scale: 0.6, transformOrigin: "center" })
          .set(".gb-cursor", { opacity: 0 })
          // window + chrome draw in (pathLength=1 → normalized offset 1→0)
          .set(".gb-draw", { strokeDashoffset: 1 })
          .to(".gb-draw", {
            strokeDashoffset: 0,
            duration: 0.7,
            ease: "power2.inOut",
            stagger: 0.08,
          })
          // cursor appears + glides to the address bar
          .to(".gb-cursor", { opacity: 1, duration: 0.15 }, "-=0.2")
          .fromTo(
            ".gb-cursor",
            { x: 96, y: 70 },
            { x: 20, y: 8, duration: 0.55, ease: "power3.inOut" },
          )
          // bar tints violet
          .to(".gb-bar-fill", { opacity: 1, duration: 0.25 }, "-=0.15")
          // URL types out as blocks
          .to(
            ".gb-char",
            { scaleX: 1, opacity: 1, duration: 0.06, stagger: 0.05, ease: "none" },
            "-=0.05",
          )
          // Enter → violet ripple
          .to(".gb-cursor", { opacity: 0, duration: 0.2 }, "+=0.1")
          .to(
            ".gb-ripple",
            { opacity: 0.6, scale: 1, duration: 0.12, ease: "power2.out" },
            "<",
          )
          .to(".gb-ripple", { opacity: 0, scale: 1.5, duration: 0.5, ease: "power2.out" });
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
      <g strokeLinecap="round" strokeLinejoin="round">
        {/* browser window */}
        <rect
          className="gb-draw"
          x="46" y="30" width="228" height="120" rx="14"
          stroke="currentColor" strokeWidth="2"
          pathLength={1} strokeDasharray={1}
        />
        {/* chrome divider */}
        <path
          className="gb-draw"
          d="M46 56 H274"
          stroke="currentColor" strokeWidth="1.5" opacity="0.5"
          pathLength={1} strokeDasharray={1}
        />
        {/* traffic dots */}
        <circle className="gb-draw" cx="60" cy="43" r="3" stroke="currentColor" strokeWidth="1.5" pathLength={1} strokeDasharray={1} />
        <circle className="gb-draw" cx="72" cy="43" r="3" stroke="currentColor" strokeWidth="1.5" pathLength={1} strokeDasharray={1} />
        <circle className="gb-draw" cx="84" cy="43" r="3" stroke="currentColor" strokeWidth="1.5" pathLength={1} strokeDasharray={1} />
        {/* address bar */}
        <rect
          className="gb-draw"
          x="104" y="37" width="150" height="12" rx="6"
          stroke="currentColor" strokeWidth="1.5"
          pathLength={1} strokeDasharray={1}
        />
      </g>

      {/* violet address-bar highlight */}
      <rect
        className="gb-bar-fill"
        x="104" y="37" width="150" height="12" rx="6"
        fill="none" stroke="var(--primary)" strokeWidth="2"
      />

      {/* typed URL as blocks */}
      <g className="gb-url" fill="var(--primary)">
        {[112, 126, 138, 152, 168, 184, 196, 210, 224].map((x, i) => (
          <rect
            key={i}
            className="gb-char"
            x={x} y="40.5" width={i % 3 === 2 ? 4 : 9} height="5" rx="2.5"
          />
        ))}
      </g>

      {/* Enter ripple centered on the bar */}
      <circle className="gb-ripple" cx="179" cy="43" r="22" stroke="var(--primary)" strokeWidth="2" />

      {/* cursor */}
      <path
        className="gb-cursor"
        d="M0 0 L0 15 L4 11 L7 17 L9 16 L6 10 L11 10 Z"
        fill="currentColor"
      />
    </svg>
  );
}
