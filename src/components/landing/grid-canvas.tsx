"use client";

import { useEffect, useRef } from "react";

const CELL = 48;
const CELL_MOBILE = 40;
const HOVER_RADIUS = 140;
const DECAY_MS = 600;
const PULSE_IN_MS = 280;
const PULSE_OUT_MS = 900;

interface Pulse {
  col: number;
  row: number;
  start: number;
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/** Interactive hero grid — 01 §4.1. Decorative only (aria-hidden). */
export function GridCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    const cell = window.innerWidth < 768 ? CELL_MOBILE : CELL;

    let width = 0;
    let height = 0;
    let cols = 0;
    let rows = 0;
    let dpr = 1;
    let borderRgb: [number, number, number] = [231, 228, 239];
    let primaryRgb: [number, number, number] = [109, 74, 255];

    // Per-cell energy: timestamp of last time the pointer energized it.
    let lastEnergized: Float64Array = new Float64Array(0);
    let pointer: { x: number; y: number } | null = null;
    const pulses: Pulse[] = [];

    let raf = 0;
    let running = false;
    let visible = true;
    let nextPulseAt = 0;

    const readColors = () => {
      const cs = getComputedStyle(document.documentElement);
      const parse = (v: string, fb: [number, number, number]) => {
        const value = v.trim();
        return /^#[0-9a-fA-F]{6}$/.test(value) ? hexToRgb(value) : fb;
      };
      borderRgb = parse(cs.getPropertyValue("--border"), borderRgb);
      primaryRgb = parse(cs.getPropertyValue("--primary"), primaryRgb);
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      cols = Math.ceil(width / cell) + 1;
      rows = Math.ceil(height / cell) + 1;
      lastEnergized = new Float64Array(cols * rows);
      draw(performance.now());
    };

    const cellEnergy = (col: number, row: number, now: number) => {
      let energy = 0;
      // Pointer proximity, smoothstep falloff from center.
      if (pointer) {
        const cx = col * cell;
        const cy = row * cell;
        const dist = Math.hypot(pointer.x - cx, pointer.y - cy);
        if (dist < HOVER_RADIUS) {
          energy = 1 - smoothstep(0, HOVER_RADIUS, dist);
          const idx = row * cols + col;
          if (idx >= 0 && idx < lastEnergized.length) {
            lastEnergized[idx] = now;
          }
        }
      }
      // Decay from last energized.
      const idx = row * cols + col;
      const last = idx >= 0 && idx < lastEnergized.length ? lastEnergized[idx] : 0;
      if (last !== undefined && last > 0) {
        const since = now - last;
        if (since < DECAY_MS) {
          energy = Math.max(energy, 1 - since / DECAY_MS);
        }
      }
      // Ambient pulses.
      for (const pulse of pulses) {
        if (pulse.col === col && pulse.row === row) {
          const t = now - pulse.start;
          if (t < PULSE_IN_MS) energy = Math.max(energy, t / PULSE_IN_MS);
          else if (t < PULSE_IN_MS + PULSE_OUT_MS)
            energy = Math.max(energy, 1 - (t - PULSE_IN_MS) / PULSE_OUT_MS);
        }
      }
      return energy;
    };

    const draw = (now: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineWidth = 1;

      const [br, bg, bb] = borderRgb;
      const [pr, pg, pb] = primaryRgb;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const energy = reduced ? 0 : cellEnergy(col, row, now);
          const r = br + (pr - br) * energy;
          const g = bg + (pg - bg) * energy;
          const b = bb + (pb - bb) * energy;
          const alpha = 0.55 + 0.45 * energy;
          ctx.strokeStyle = `rgba(${r | 0},${g | 0},${b | 0},${alpha})`;
          const x = col * cell + 0.5;
          const y = row * cell + 0.5;
          ctx.strokeRect(x, y, cell, cell);
        }
      }
    };

    const schedulePulse = (now: number) => {
      const interval = isTouch ? [2000, 3500] : [4000, 7000];
      const min = interval[0] ?? 4000;
      const max = interval[1] ?? 7000;
      nextPulseAt = now + min + Math.random() * (max - min);
    };

    const frame = (now: number) => {
      if (!running) return;
      if (now >= nextPulseAt && cols > 0 && rows > 0) {
        pulses.push({
          col: 1 + Math.floor(Math.random() * (cols - 2)),
          row: 1 + Math.floor(Math.random() * (rows - 2)),
          start: now,
        });
        schedulePulse(now);
      }
      for (let i = pulses.length - 1; i >= 0; i--) {
        const pulse = pulses[i];
        if (pulse && now - pulse.start > PULSE_IN_MS + PULSE_OUT_MS) {
          pulses.splice(i, 1);
        }
      }
      draw(now);
      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (running || reduced || !visible || document.hidden) return;
      running = true;
      schedulePulse(performance.now());
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer = { x: event.clientX - rect.x, y: event.clientY - rect.y };
    };
    const onPointerLeave = () => {
      pointer = null;
    };

    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? true;
        if (visible) start();
        else stop();
      },
      { threshold: 0 },
    );
    io.observe(canvas);

    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };

    const themeObserver = new MutationObserver(() => {
      readColors();
      if (!running) draw(performance.now());
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    readColors();
    resize();
    start();

    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    if (!isTouch && !reduced) {
      canvas.parentElement?.addEventListener("pointermove", onPointerMove);
      canvas.parentElement?.addEventListener("pointerleave", onPointerLeave);
    }

    return () => {
      stop();
      io.disconnect();
      themeObserver.disconnect();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.parentElement?.removeEventListener("pointermove", onPointerMove);
      canvas.parentElement?.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 size-full"
      style={{
        maskImage:
          "radial-gradient(ellipse 70% 65% at 50% 45%, black 55%, transparent 100%)",
        WebkitMaskImage:
          "radial-gradient(ellipse 70% 65% at 50% 45%, black 55%, transparent 100%)",
      }}
    />
  );
}
