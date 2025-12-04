import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { performLogout } from "@/lib/auth/logout";

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
      await performLogout(onLogoutSuccess);
    } catch {
      // Błędy obsługuje helper, ale chcemy uniknąć unhandled rejection.
    } finally {
      setIsLoading(false);
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
