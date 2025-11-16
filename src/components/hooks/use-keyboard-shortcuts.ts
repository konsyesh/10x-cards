import { useEffect } from "react";

interface KeyboardShortcutHandlers {
  onAccept?: () => void;
  onEdit?: () => void;
  onReject?: () => void;
  onSave?: () => void;
  onPrevPage?: () => void;
  onNextPage?: () => void;
  onPrevCard?: () => void;
  onNextCard?: () => void;
}

/**
 * Hook do obsługi skrótów klawiaturowych
 * A = Accept, E = Edit, R = Reject, S = Save
 * ← / → = nawigacja karty, PgUp / PgDn = zmiana strony
 */
export const useKeyboardShortcuts = (handlers: KeyboardShortcutHandlers, enabled = true) => {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignoruj jeśli focus jest na input/textarea
      const target = e.target as HTMLElement;
      const isFormElement = target.tagName === "INPUT" || target.tagName === "TEXTAREA";

      if (isFormElement) return;

      switch (e.key.toLowerCase()) {
        case "a":
          e.preventDefault();
          handlers.onAccept?.();
          break;
        case "e":
          e.preventDefault();
          handlers.onEdit?.();
          break;
        case "r":
          e.preventDefault();
          handlers.onReject?.();
          break;
        case "s":
          e.preventDefault();
          handlers.onSave?.();
          break;
        case "arrowleft":
          e.preventDefault();
          handlers.onPrevCard?.();
          break;
        case "arrowright":
          e.preventDefault();
          handlers.onNextCard?.();
          break;
        case "pageup":
          e.preventDefault();
          handlers.onPrevPage?.();
          break;
        case "pagedown":
          e.preventDefault();
          handlers.onNextPage?.();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, handlers]);
};
