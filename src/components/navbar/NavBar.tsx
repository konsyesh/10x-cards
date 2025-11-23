import { useState } from "react";
import { type User, type NavigationLink } from "@/types";
import { Logo } from "./Logo";
import { NavigationLinks } from "./NavigationLinks";
import { ModeToggle } from "@/components/ModeToggle";
import { UserSection } from "./UserSection";
import { MobileMenu } from "./MobileMenu";
import { isFeatureEnabled } from "@/features";
import { FeatureGate } from "@/components/FeatureGate";

interface NavBarProps {
  user?: User | null;
  currentPath?: string;
}

/**
 * Główny komponent NavBar - kontener dla wszystkich elementów nawigacji. Zarządza układem desktop/mobile oraz integracją z routingiem Astro.
 *
 * Główne elementy: nav, div z klasami Tailwind dla layout'u flex, responsywność z md: breakpoint'ami
 */
export function NavBar({ user, currentPath = "/" }: NavBarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Definicja linków nawigacyjnych
  const navigationLinks: NavigationLink[] = [
    {
      label: "Home",
      path: "/",
    },
    ...(isFeatureEnabled("generations")
      ? [
          {
            label: "Generuj",
            path: "/generate",
          } as NavigationLink,
        ]
      : []),
    ...(isFeatureEnabled("flashcards")
      ? [
          {
            label: "Fiszki",
            path: "/flashcards",
          } as NavigationLink,
        ]
      : []),
  ];

  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <nav
      role="navigation"
      aria-label="Główna nawigacja"
      className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo - widoczne zawsze */}
          <div className="flex-shrink-0">
            <Logo />
          </div>

          {/* Desktop Navigation Links - ukryte na mobile */}
          <div className="hidden md:flex md:items-center md:space-x-1">
            <NavigationLinks currentPath={currentPath} links={navigationLinks} />
          </div>

          {/* Right side: Theme Toggle + User Section + Mobile Menu */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle - widoczny zawsze */}
            <ModeToggle />

            {/* User Section - widoczny tylko gdy auth feature jest włączony */}
            <FeatureGate feature="auth">
              <UserSection user={user ?? null} />
            </FeatureGate>

            {/* Mobile Menu Button - widoczny tylko na mobile */}
            <MobileMenu
              isOpen={mobileMenuOpen}
              onToggle={handleMobileMenuToggle}
              user={user ?? null}
              currentPath={currentPath}
              navigationLinks={navigationLinks}
            />
          </div>
        </div>
      </div>
    </nav>
  );
}
