/** Umami custom events — 02 §12. No-ops when Umami isn't loaded. */

type EventData = Record<string, string | number | boolean>;

declare global {
  interface Window {
    umami?: { track: (event: string, data?: EventData) => void };
  }
}

export function track(event: string, data?: EventData): void {
  if (typeof window !== "undefined" && window.umami) {
    window.umami.track(event, data);
  }
}
