"use client";

import { IconMoon, IconSun } from "@tabler/icons-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";

const subscribeToNoopStore = () => () => {};

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribeToNoopStore,
    () => true,
    () => false
  );

  if (!mounted) {
    return (
      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled
        aria-label="Toggle theme"
      >
        <IconMoon className="size-5" aria-hidden />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <IconSun className="size-5" aria-hidden /> : <IconMoon className="size-5" aria-hidden />}
    </Button>
  );
}
