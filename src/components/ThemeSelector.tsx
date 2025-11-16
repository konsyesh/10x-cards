import * as React from "react";
import { Palette } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Theme = "default" | "tangerine";

const AVAILABLE_THEMES: { id: Theme; label: string }[] = [
  { id: "default", label: "Default" },
  { id: "tangerine", label: "Tangerine" },
];

export function ThemeSelector() {
  const [theme, setThemeState] = React.useState<Theme>("default");

  React.useEffect(() => {
    // Get the current theme from data-theme attribute
    const currentTheme = document.documentElement.getAttribute("data-theme");

    // Try to get saved preference from localStorage
    if (typeof localStorage !== "undefined") {
      const savedTheme = localStorage.getItem("theme") as Theme | null;
      if (savedTheme && AVAILABLE_THEMES.some((t) => t.id === savedTheme)) {
        setThemeState(savedTheme);
        return;
      }
    }

    // Fallback to current attribute value
    if (currentTheme && AVAILABLE_THEMES.some((t) => t.id === currentTheme)) {
      setThemeState(currentTheme as Theme);
    }
  }, []);

  React.useEffect(() => {
    // Persist theme to localStorage
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("theme", theme);
    }

    // Update data-theme attribute
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" title="Change theme">
          <Palette className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Change theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {AVAILABLE_THEMES.map((t) => (
          <DropdownMenuItem
            key={t.id}
            onClick={() => setThemeState(t.id)}
            className={theme === t.id ? "font-semibold" : ""}
          >
            {t.label}
            {theme === t.id && " ✓"}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
