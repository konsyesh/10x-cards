import { type User } from "@/types";
import { UserAvatar } from "./UserAvatar";
import { LoginButton } from "@/components/auth/LoginButton";
import { performLogout } from "@/lib/auth/logout";

interface UserSectionProps {
  user: User | null;
}

/**
 * Komponent UserSection - kontener dla sekcji użytkownika, renderuje różne komponenty w zależności od statusu logowania
 *
 * Główne elementy: div warunkowo renderujący UserAvatar lub LoginButton
 */
export function UserSection({ user }: UserSectionProps) {
  const handleLogout = async () => {
    try {
      await performLogout();
    } catch {
      // Errory są już obsłużone w helperze (toast, opis), nie trzeba nic robić.
    }
  };

  return (
    <div className="flex items-center gap-2">
      {user ? (
        // Użytkownik zalogowany - pokaż UserAvatar
        <UserAvatar user={user} onLogout={handleLogout} />
      ) : (
        // Użytkownik niezalogowany - pokaż LoginButton
        <LoginButton />
      )}
    </div>
  );
}
