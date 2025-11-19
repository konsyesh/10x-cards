import { useState } from "react";
import { type User, type UserMenuItem } from "@/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserIcon, LogOut } from "lucide-react";

interface UserAvatarProps {
  user: User;
  onLogout?: () => void;
}

/**
 * Komponent UserAvatar - avatar użytkownika z inicjałami lub zdjęciem profilowym, z opcjonalnym dropdown menu
 *
 * Główne elementy: button lub div, img dla zdjęcia, span dla inicjałów, dropdown z Shadcn/ui
 */
export function UserAvatar({ user, onLogout }: UserAvatarProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Generowanie inicjałów z email
  const getInitials = (email: string): string => {
    const parts = email.split("@")[0].split(".");
    return parts
      .map((part) => part.charAt(0).toUpperCase())
      .join("")
      .slice(0, 2);
  };

  const initials = user.email ? getInitials(user.email) : "U";

  const menuItems: UserMenuItem[] = [
    {
      label: "Profil",
      action: () => {
        // TODO: Implementacja profilu użytkownika
        console.log("Navigate to profile");
      },
      icon: "UserIcon",
    },
    {
      label: "Wyloguj się",
      action: () => {
        onLogout?.();
      },
      icon: "LogOut",
      danger: true,
    },
  ];

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-8 w-8 rounded-full hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="Menu użytkownika"
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <div className="flex items-center justify-start gap-2 p-2">
          <div className="flex flex-col space-y-1 leading-none">
            {user.email && <p className="font-medium text-sm">{user.email}</p>}
          </div>
        </div>
        <DropdownMenuSeparator />
        {menuItems.map((item, index) => (
          <DropdownMenuItem
            key={index}
            onClick={item.action}
            className={item.danger ? "text-destructive focus:text-destructive" : ""}
          >
            {item.icon === "UserIcon" && <UserIcon className="mr-2 h-4 w-4" />}
            {item.icon === "LogOut" && <LogOut className="mr-2 h-4 w-4" />}
            <span>{item.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
