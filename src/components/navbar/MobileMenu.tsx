import { useEffect } from "react";
import { type User, type NavigationLink as NavigationLinkType } from "@/types";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, X } from "lucide-react";
import { MobileNavigationLinks } from "./MobileNavigationLinks";
import { MobileUserSection } from "./MobileUserSection";

interface MobileMenuProps {
  isOpen: boolean;
  onToggle: () => void;
  user: User | null;
  currentPath: string;
  navigationLinks: NavigationLinkType[];
}

/**
 * Komponent MobileMenu - menu mobilne otwierane przez przycisk hamburger, zawiera linki nawigacyjne i sekcję użytkownika
 *
 * Główne elementy: button hamburger, div z animacją slide-in, komponenty dzieci dla linków i użytkownika
 */
export function MobileMenu({ isOpen, onToggle, user, currentPath, navigationLinks }: MobileMenuProps) {
  const handleLinkClick = () => {
    onToggle(); // Zamknij menu po kliknięciu w link
  };

  // Blokuj scroll strony gdy menu jest otwarte
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    // Cleanup przy odmontowaniu komponentu
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <Sheet open={isOpen} onOpenChange={onToggle}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label={isOpen ? "Zamknij menu nawigacji" : "Otwórz menu nawigacji"}
          aria-expanded={isOpen}
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80 p-0">
        <div className="flex flex-col h-full">
          {/* Logo w menu mobilnym */}
          <div className="flex items-center justify-center py-6 border-b">
            <a href="/" className="flex items-center gap-2 text-xl font-bold text-foreground" onClick={handleLinkClick}>
              <span className="bg-primary text-primary-foreground px-2 py-1 rounded text-sm font-mono">10x</span>
              <span>Cards</span>
            </a>
          </div>

          {/* Linki nawigacyjne */}
          <div className="flex-1 px-4 py-6">
            <MobileNavigationLinks currentPath={currentPath} links={navigationLinks} onLinkClick={handleLinkClick} />
          </div>

          {/* Sekcja użytkownika */}
          <MobileUserSection user={user} onLinkClick={handleLinkClick} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
