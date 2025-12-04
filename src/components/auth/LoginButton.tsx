import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Komponent LoginButton - przycisk/link do strony logowania dla niezalogowanych użytkowników
 *
 * Główne elementy: Link z Astro lub button, klasy Tailwind dla stylizacji
 */
export function LoginButton({ className, ...props }: React.ComponentProps<typeof Button>) {
  return (
    <Button
      asChild
      variant="outline"
      className={cn("text-sm", className)}
      {...props}
    >
      <a
        href="/auth/login"
        aria-label="Przejdź do strony logowania"
      >
        Zaloguj się
      </a>
    </Button>
  );
}
