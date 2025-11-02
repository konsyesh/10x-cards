import * as React from "react";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Mode = "light" | "dark" | "system";

export function ModeToggle() {
  const [mode, setModeState] = React.useState<Mode>("light");

  React.useEffect(() => {
    // Get the current mode from data-mode attribute
    const currentMode = document.documentElement.getAttribute("data-mode");

    // Try to get saved preference from localStorage
    if (typeof localStorage !== "undefined") {
      const savedMode = localStorage.getItem("mode") as Mode | null;
      if (savedMode && ["light", "dark", "system"].includes(savedMode)) {
        setModeState(savedMode);
        return;
      }
    }

    // Fallback to current attribute value
    if (currentMode && ["light", "dark"].includes(currentMode)) {
      setModeState(currentMode as "light" | "dark");
    }
  }, []);

  React.useEffect(() => {
    // Persist mode to localStorage
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("mode", mode);
    }

    // Determine actual mode (resolve 'system' to 'light' or 'dark')
    let actualMode: "light" | "dark" = mode as "light" | "dark";
    if (mode === "system") {
      actualMode = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }

    // Update data-mode attribute
    document.documentElement.setAttribute("data-mode", actualMode);
    document.documentElement.style.colorScheme = actualMode === "dark" ? "dark" : "light";
  }, [mode]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          <span className="sr-only">Toggle mode</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setModeState("light")}>Light</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setModeState("dark")}>Dark</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setModeState("system")}>System</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
