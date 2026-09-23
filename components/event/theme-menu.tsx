"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

const subscribeMounted = () => () => {};

export function ThemeMenu() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribeMounted, () => true, () => false);
  const selected = mounted && theme === "dark" ? "dark" : "light";
  const nextTheme = selected === "dark" ? "light" : "dark";
  const label = nextTheme === "dark" ? "تغییر به حالت تیره" : "تغییر به حالت روشن";

  return (
    <button
      type="button"
      className="icon-button theme-trigger"
      aria-label={label}
      title={label}
      disabled={!mounted}
      onClick={() => setTheme(nextTheme)}
    >
      {selected === "dark" ? (
        <Moon size={20} aria-hidden="true" />
      ) : (
        <Sun size={20} aria-hidden="true" />
      )}
    </button>
  );
}
