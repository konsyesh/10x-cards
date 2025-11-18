"use client";

import { User } from "@/types";
import { UserAvatar } from "./UserAvatar";
import { LoginButton } from "@/components/auth/LoginButton";
import { LogoutButton } from "@/components/auth/LogoutButton";

interface UserSectionProps {
  user: User | null;
}

/**
 * Komponent UserSection - kontener dla sekcji użytkownika, renderuje różne komponenty w zależności od statusu logowania
 *
 * Główne elementy: div warunkowo renderujący UserAvatar lub LoginButton
 */
export function UserSection({ user }: UserSectionProps) {
  // Obsługa wylogowania - przekazanie do UserAvatar
  const handleLogout = () => {
    // Logika wylogowania jest obsługiwana przez LogoutButton w UserAvatar
    console.log("Logout initiated from UserSection");
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
