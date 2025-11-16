import { useEffect } from "react";

/**
 * Simple link click interceptor
 * Pokazuje custom modal jeśli są unsaved changes
 * Obsługuje tylko wewnętrzne linki (plain left click)
 */
export const useNavigationInterceptor = (onNavigationAttempt: (href: string) => void, hasUnsaved: boolean) => {
  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest("a[href]") as HTMLAnchorElement | null;

      if (!link) return;

      // Ignoruj: nowa karta/okno
      if (link.target === "_blank" || link.target === "_parent" || link.target === "_top") {
        return;
      }

      // Ignoruj: data-astro-reload
      if (link.hasAttribute("data-astro-reload")) {
        return;
      }

      const href = link.getAttribute("href");
      if (!href) return;

      // Ignoruj: same-page
      const currentUrl = new URL(window.location.href);
      const targetUrl = new URL(href, window.location.href);
      if (currentUrl.pathname === targetUrl.pathname && currentUrl.search === targetUrl.search) {
        return;
      }

      // Ignoruj: external
      if (href.startsWith("http") || href.startsWith("https") || href.startsWith("//")) {
        return;
      }

      // Ignoruj: nie plain left click
      const isPlainLeftClick = e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
      if (!isPlainLeftClick) return;

      // Jeśli unsaved changes → intercept
      if (hasUnsaved) {
        e.preventDefault();
        onNavigationAttempt(href);
      }
    };

    document.addEventListener("click", handleLinkClick);
    return () => document.removeEventListener("click", handleLinkClick);
  }, [hasUnsaved, onNavigationAttempt]);
};
