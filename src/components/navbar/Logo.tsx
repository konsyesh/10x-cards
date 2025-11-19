/**
 * Komponent Logo - logo lub nazwa aplikacji z linkiem do strony głównej
 *
 * Responsywny komponent dostosowujący rozmiar tekstu/logo.
 * Główne elementy: Link z Astro, span dla logo, klasy Tailwind dla typografii
 */
export function Logo() {
  return (
    <a
      href="/"
      className="flex items-center gap-2 text-xl font-bold text-foreground hover:text-primary transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:rounded-sm"
      aria-label="10xCards - strona główna"
    >
      <span className="bg-primary text-primary-foreground px-2 py-1 rounded text-sm font-mono">
        10x
      </span>
      <span className="hidden sm:inline">Cards</span>
    </a>
  );
}
