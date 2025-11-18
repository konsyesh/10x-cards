import { type NavigationLink as NavigationLinkType } from "@/types";
import { cn } from "@/lib/utils";

interface NavigationLinksProps {
  currentPath: string;
  links: NavigationLinkType[];
}

/**
 * Komponent NavigationLinks - lista głównych linków nawigacyjnych z wyróżnianiem aktywnej zakładki
 *
 * Główne elementy: ul z li zawierającymi Link z Astro, klasy Tailwind dla stylizacji i hover/focus states
 */
export function NavigationLinks({ currentPath, links }: NavigationLinksProps) {
  return (
    <ul className="flex items-center gap-6" role="list">
      {links.map((link) => {
        const isActive = currentPath === link.path;

        return (
          <li key={link.path}>
            <a
              href={link.path}
              className={cn(
                "relative text-sm font-medium transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:rounded-sm px-2 py-1",
                isActive
                  ? "text-primary after:absolute after:bottom-[-8px] after:left-1/2 after:w-1 after:h-1 after:bg-primary after:rounded-full after:transform after:-translate-x-1/2"
                  : "text-muted-foreground"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              {link.label}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
