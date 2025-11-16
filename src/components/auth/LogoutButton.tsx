"use client";

import { useState } from "react";
import { fetchJson, ApiError } from "@/lib/http/http.fetcher";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LogoutButtonProps extends React.ComponentProps<typeof Button> {
  onLogoutSuccess?: () => void;
}

/**
 * Komponent przycisku wylogowania
 *
 * Wywołuje POST /api/auth/logout i przekierowuje do /auth/login
 * Zgodny z US-004 i auth-spec-codex.md
 */
export function LogoutButton({ className, onLogoutSuccess, ...props }: LogoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);

    try {
      // Wywołaj endpoint logout (204 No Content)
      await fetchJson("/api/auth/logout", {
        method: "POST",
      });

      toast.success("Wylogowano pomyślnie");

      // Callback jeśli podany
      if (onLogoutSuccess) {
        onLogoutSuccess();
      }

      // Redirect do strony logowania
      window.location.href = "/auth/login";
    } catch (err) {
      setIsLoading(false);

      if (err instanceof ApiError) {
        toast.error("Błąd wylogowania", {
          description: err.problem.detail || err.problem.title,
        });
      } else {
        toast.error("Błąd wylogowania", {
          description: "Wystąpił nieoczekiwany błąd. Spróbuj ponownie.",
        });
      }
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleLogout}
      disabled={isLoading}
      aria-label={isLoading ? "Wylogowywanie..." : "Wyloguj się z konta"}
      className={cn(className)}
      {...props}
    >
      {isLoading ? "Wylogowywanie..." : "Wyloguj"}
    </Button>
  );
}
