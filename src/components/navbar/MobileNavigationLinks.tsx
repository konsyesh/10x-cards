import { type NavigationLink as NavigationLinkType } from "@/types";
import { cn } from "@/lib/utils";

interface MobileNavigationLinksProps {
  currentPath: string;
  links: NavigationLinkType[];
  onLinkClick?: () => void;
}

/**
 * Komponent MobileNavigationLinks - mobilna wersja linków nawigacyjnych
 *
 * Główne elementy: ul z li zawierającymi a, klasy Tailwind dla mobilnego layout'u
 */
export function MobileNavigationLinks({ currentPath, links, onLinkClick }: MobileNavigationLinksProps) {
  return (
    <ul className="space-y-2" role="list">
      {links.map((link) => {
        const isActive = currentPath === link.path;

        return (
          <li key={link.path}>
            <a
              href={link.path}
              onClick={onLinkClick}
              className={cn(
                "flex items-center gap-3 px-4 py-3 text-base font-medium rounded-md transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                isActive ? "bg-accent text-accent-foreground" : "text-foreground"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              {link.icon && (
                <span className="text-lg" aria-hidden="true">
                  {link.icon}
                </span>
              )}
              <span>{link.label}</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
