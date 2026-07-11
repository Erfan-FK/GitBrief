"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={
        !mounted
          ? "Toggle theme"
          : isDark
            ? "Switch to light theme"
            : "Switch to dark theme"
      }
      className="inline-flex size-9 items-center justify-center rounded-[8px] text-muted-foreground transition-colors hover:text-foreground"
    >
      {mounted ? (
        isDark ? (
          <Sun className="size-5" strokeWidth={1.5} />
        ) : (
          <Moon className="size-5" strokeWidth={1.5} />
        )
      ) : (
        <span className="size-5" />
      )}
    </button>
  );
}
