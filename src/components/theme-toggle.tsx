"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isLight = mounted && resolvedTheme === "light";

  return (
    <button
      aria-label="Alternar tema"
      title={isLight ? "Tema escuro" : "Tema claro"}
      onClick={() => setTheme(isLight ? "dark" : "light")}
      className="grid size-9 place-items-center rounded-md border border-border bg-surface text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
    >
      {isLight ? <Moon className="size-4" /> : <Sun className="size-4" />}
    </button>
  );
}
