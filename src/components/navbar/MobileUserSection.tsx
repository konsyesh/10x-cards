import { type User } from "@/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LogOut, User as UserIcon } from "lucide-react";

interface MobileUserSectionProps {
  user: User | null;
  onLinkClick?: () => void;
}

/**
 * Komponent MobileUserSection - mobilna wersja sekcji użytkownika dla menu mobilnego
 */
export function MobileUserSection({ user, onLinkClick }: MobileUserSectionProps) {
  // Generowanie inicjałów z email
  const getInitials = (email: string): string => {
    const parts = email.split("@")[0].split(".");
    return parts
      .map((part) => part.charAt(0).toUpperCase())
      .join("")
      .slice(0, 2);
  };

  const handleLogout = () => {
    // Wywołanie POST /api/auth/logout - przekierowanie jest obsługiwane automatycznie
    const logoutForm = document.createElement("form");
    logoutForm.method = "POST";
    logoutForm.action = "/api/auth/logout";
    document.body.appendChild(logoutForm);
    logoutForm.submit();
  };

  if (!user) {
    return (
      <div className="px-4 py-3">
        <Button asChild variant="outline" className="w-full justify-start gap-3">
          <a href="/auth/login" onClick={onLinkClick} aria-label="Przejdź do strony logowania">
            <UserIcon className="h-4 w-4" />
            Zaloguj się
          </a>
        </Button>
      </div>
    );
  }

  const initials = user.email ? getInitials(user.email) : "U";

  return (
    <>
      <Separator />
      <div className="px-4 py-3">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary text-primary-foreground">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            {user.email && <span className="text-sm font-medium text-foreground">{user.email}</span>}
          </div>
        </div>

        <div className="space-y-1">
          <Button variant="ghost" className="w-full justify-start gap-3 h-auto py-2 px-3" onClick={onLinkClick}>
            <UserIcon className="h-4 w-4" />
            <span>Profil</span>
          </Button>

          <Button
            variant="ghost"
            className="w-full justify-start gap-3 h-auto py-2 px-3 text-destructive hover:text-destructive"
            onClick={() => {
              onLinkClick?.();
              handleLogout();
            }}
          >
            <LogOut className="h-4 w-4" />
            <span>Wyloguj się</span>
          </Button>
        </div>
      </div>
    </>
  );
}
