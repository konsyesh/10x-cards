# Plan implementacji widoku NavBar

## 1. Przegląd

NavBar to globalny komponent nawigacyjny aplikacji 10x-Cards, umieszczony w Layout.astro i dostępny na wszystkich widokach. Jego celem jest zapewnienie intuicyjnej nawigacji między głównymi sekcjami aplikacji (Home, Generuj, Fiszki), zarządzania motywem aplikacji (jasny/ciemny/system) oraz obsługi stanów użytkownika (zalogowany/niezalogowany). Komponent zapewnia responsywność desktop/mobile oraz wyróżnianie aktywnej zakładki na podstawie aktualnej ścieżki URL.

**Istniejące komponenty do wykorzystania:**

- ✅ `ModeToggle.tsx` - już zaimplementowany, gotowy do użycia
- ✅ `LogoutButton.tsx` - już zaimplementowany, gotowy do użycia
- 🔄 `Layout.astro` - zawiera podstawową nawigację, wymaga refaktoryzacji

## 2. Routing widoku

NavBar nie posiada dedykowanej ścieżki - jest komponentem globalnym dostępnym na wszystkich trasach aplikacji poprzez Layout.astro. Komponent wewnętrznie zarządza routingiem poprzez linki do:

- `/` (Home)
- `/generate` (Generuj)
- `/flashcards` (Fiszki)
- `/auth/login` (Logowanie - dla niezalogowanych użytkowników)

## 3. Struktura komponentów

```
Layout.astro (🔄 wymaga refaktoryzacji)
└── NavBar.tsx (główny komponent - DO UTWORZENIA)
    ├── Logo.tsx (logo/nazwa aplikacji → / - DO UTWORZENIA)
    ├── NavigationLinks.tsx (główne linki nawigacji - DO UTWORZENIA)
    ├── ModeToggle.tsx (przełącznik motywu - ✅ JUŻ ISTNIEJE)
    ├── UserSection.tsx (sekcja użytkownika - DO UTWORZENIA)
    │   ├── UserAvatar.tsx (avatar/inicjały dla zalogowanych - DO UTWORZENIA)
    │   ├── LoginButton.tsx (link do logowania dla niezalogowanych - DO UTWORZENIA)
    │   └── LogoutButton.tsx (przycisk wylogowania - ✅ JUŻ ISTNIEJE)
    └── MobileMenu.tsx (menu mobilne z hamburgerem - DO UTWORZENIA)
        ├── MobileNavigationLinks.tsx (DO UTWORZENIA)
        └── MobileUserSection.tsx (DO UTWORZENIA)
```

## 4. Szczegóły komponentów

### NavBar.tsx

- **Opis komponentu**: Główny komponent NavBar, kontener dla wszystkich elementów nawigacji. Zarządza układem desktop/mobile oraz integracją z routingiem Astro.
- **Główne elementy**: `<nav>`, `<div>` z klasami Tailwind dla layout'u flex, responsywność z `md:` breakpoint'ami
- **Obsługiwane interakcje**:
  - Kliknięcia w linki nawigacyjne
  - Otwieranie/zamykanie menu mobilnego
  - Zmiana motywu przez ModeToggle
- **Obsługiwana walidacja**: Brak bezpośredniej walidacji - komponent nie przetwarza danych wejściowych
- **Typy**: `NavBarProps` (propsy komponentu), `User` (dane użytkownika z Supabase auth)
- **Propsy**:
  ```typescript
  interface NavBarProps {
    user?: User | null; // dane użytkownika z Supabase auth
    currentPath?: string; // aktualna ścieżka dla wyróżniania aktywnej zakładki
  }
  ```

### Logo.tsx

- **Opis komponentu**: Logo lub nazwa aplikacji z linkiem do strony głównej. Responsywny komponent dostosowujący rozmiar tekstu/logo.
- **Główne elementy**: `<Link>` z Astro (lub `<a>`), `<span>` lub `<img>` dla logo, klasy Tailwind dla typografii
- **Obsługiwane interakcje**: Kliknięcie przekierowujące do `/`
- **Obsługiwana walidacja**: Brak walidacji
- **Typy**: Brak specjalnych typów
- **Propsy**: Brak propsów (komponent bezstanowy)

### NavigationLinks.tsx

- **Opis komponentu**: Lista głównych linków nawigacyjnych z wyróżnianiem aktywnej zakładki.
- **Główne elementy**: `<ul>` z `<li>` zawierającymi `<Link>` z Astro, klasy Tailwind dla stylizacji i hover/focus states
- **Obsługiwane interakcje**: Kliknięcia w linki powodujące nawigację
- **Obsługiwana walidacja**: Walidacja czy `currentPath` odpowiada jednej z dostępnych tras
- **Typy**: `NavigationLink` (definicja pojedynczego linku)
- **Propsy**:
  ```typescript
  interface NavigationLinksProps {
    currentPath: string;
    links: NavigationLink[];
  }
  ```

### ModeToggle.tsx

- **Status**: ✅ JUŻ ZIMPLEMENTOWANY - można użyć bez zmian
- **Opis komponentu**: Przełącznik motywu aplikacji (jasny/ciemny/system) z persystencją ustawień.
- **Główne elementy**: `<button>` z ikoną, dropdown menu z Shadcn/ui, klasy Tailwind
- **Obsługiwane interakcje**:
  - Kliknięcie otwierające menu
  - Wybór opcji motywu
- **Obsługiwana walidacja**: Walidacja dostępności `localStorage` dla persystencji
- **Typy**: `Mode` ("light" | "dark" | "system")
- **Propsy**: Brak propsów (stan zarządzany wewnętrznie)

### UserSection.tsx

- **Opis komponentu**: Kontener dla sekcji użytkownika, renderuje różne komponenty w zależności od statusu logowania.
- **Główne elementy**: `<div>` warunkowo renderujący `UserAvatar` lub `LoginButton`
- **Obsługiwane interakcje**: Delegowane do komponentów dzieci
- **Obsługiwana walidacja**: Sprawdzanie obecności i poprawności danych użytkownika
- **Typy**: `User` z Supabase auth
- **Propsy**:
  ```typescript
  interface UserSectionProps {
    user: User | null;
  }
  ```

### UserAvatar.tsx

- **Opis komponentu**: Avatar użytkownika z inicjałami lub zdjęciem profilowym, z opcjonalnym dropdown menu.
- **Główne elementy**: `<button>` lub `<div>`, `<img>` dla zdjęcia, `<span>` dla inicjałów, dropdown z Shadcn/ui
- **Obsługiwane interakcje**:
  - Kliknięcie otwierające menu użytkownika
  - Wybór opcji z menu (np. wylogowanie)
- **Obsługiwana walidacja**: Walidacja obecności danych użytkownika (email dla inicjałów)
- **Typy**: `User` z Supabase auth, `UserMenuItem`
- **Propsy**:
  ```typescript
  interface UserAvatarProps {
    user: User;
    onLogout?: () => void;
  }
  ```

### LoginButton.tsx

- **Opis komponentu**: Przycisk/link do strony logowania dla niezalogowanych użytkowników.
- **Główne elementy**: `<Link>` z Astro lub `<button>`, klasy Tailwind dla stylizacji
- **Obsługiwane interakcje**: Kliknięcie przekierowujące do `/auth/login`
- **Obsługiwana walidacja**: Brak walidacji
- **Typy**: Brak specjalnych typów
- **Propsy**: Brak propsów (komponent bezstanowy)

### LogoutButton.tsx

- **Status**: ✅ JUŻ ZIMPLEMENTOWANY - można użyć bez zmian
- **Opis komponentu**: Przycisk wylogowania użytkownika z pełną obsługą API, błędów i redirect.
- **Główne elementy**: `<Button>` z Shadcn/ui, toast notifications
- **Obsługiwane interakcje**:
  - Kliknięcie wywołujące POST /api/auth/logout
  - Obsługa błędów z toast
  - Automatyczny redirect do /auth/login
- **Obsługiwana walidacja**: Sprawdzanie statusu użytkownika przed wylogowaniem
- **Typy**: `LogoutButtonProps` (rozszerza Button props)
- **Propsy**:
  ```typescript
  interface LogoutButtonProps extends React.ComponentProps<typeof Button> {
    onLogoutSuccess?: () => void;
  }
  ```

### MobileMenu.tsx

- **Opis komponentu**: Menu mobilne otwierane przez przycisk hamburger, zawiera linki nawigacyjne i sekcję użytkownika.
- **Główne elementy**: `<button>` hamburger, `<div>` z animacją slide-in, komponenty dzieci dla linków i użytkownika
- **Obsługiwane interakcje**:
  - Otwieranie/zamykanie menu
  - Delegowane interakcje z komponentów dzieci
- **Obsługiwana walidacja**: Brak walidacji
- **Typy**: `MobileMenuState` ("open" | "closed")
- **Propsy**:
  ```typescript
  interface MobileMenuProps {
    isOpen: boolean;
    onToggle: () => void;
    user: User | null;
    currentPath: string;
  }
  ```

## 5. Typy

### Istniejące typy z types.ts

- `User` - typ użytkownika z Supabase auth (email, id, etc.)
- `ApiErrorResponse` - standardowa struktura błędów API

### Nowe typy dla NavBar

```typescript
// Definicja pojedynczego linku nawigacyjnego
export interface NavigationLink {
  label: string; // etykieta wyświetlana
  path: string; // ścieżka URL
  icon?: string; // opcjonalna ikona (dla mobile)
}

// Stan menu mobilnego
export type MobileMenuState = "open" | "closed";

// Typ motywu aplikacji
export type Theme = "light" | "dark" | "system";

// Propsy głównego komponentu NavBar
export interface NavBarProps {
  user?: User | null; // dane użytkownika z Supabase auth
  currentPath?: string; // aktualna ścieżka dla wyróżniania aktywnej zakładki
}

// Element menu użytkownika
export interface UserMenuItem {
  label: string;
  action: () => void;
  icon?: string;
  danger?: boolean; // czy element jest destrukcyjny (np. wylogowanie)
}
```

## 6. Zarządzanie stanem

NavBar wymaga zarządzania następującymi stanami:

1. **Stan użytkownika**: Pobierany z `Astro.locals.user` w Layout.astro (już dostępne)
2. **Aktualna ścieżka**: Pobierana z `Astro.url.pathname` w Layout.astro
3. **Stan menu mobilnego**: Lokalny stan `useState<boolean>` dla otwierania/zamykania menu
4. **Motyw aplikacji**: ✅ JUŻ ZARZĄDZANY przez istniejący `ModeToggle` komponent

**Istniejące rozwiązanie motywu:**

- `ModeToggle.tsx` już obsługuje pełną logikę motywu z persystencją w localStorage
- Nie potrzeba dodatkowych hook'ów - można użyć istniejącego komponentu

**Stan użytkownika:**

- W Layout.astro już dostępne: `const user = Astro.locals.user;`
- Nie potrzeba dodatkowych hook'ów React - stan dostępny po stronie serwera

**Custom hooks** (jeśli potrzebne dla komponentów React):

- `useCurrentPath()` - hook do pobierania aktualnej ścieżki w Astro (jeśli potrzebny w komponentach React)

Stan nie wymaga złożonego zarządzania - większość to stan lokalny komponentów lub dane z Astro locals.

## 7. Integracja API

NavBar nie integruje się bezpośrednio z API dla większości funkcji - korzysta z istniejących rozwiązań:

**Stan użytkownika:**

- Pobierany z `Astro.locals.user` w Layout.astro (serwer-side)
- Nie wymaga dodatkowych wywołań API

**Wylogowanie:**

- ✅ JUŻ ZREALIZOWANE przez istniejący `LogoutButton` komponent
- Wywołuje POST /api/auth/logout
- Obsługuje błędy i redirect automatycznie

**Motyw aplikacji:**

- ✅ JUŻ ZREALIZOWANY przez istniejący `ModeToggle` komponent
- Zarządza stanem lokalnie z localStorage

```typescript
// Przykład użycia istniejących komponentów
// W Layout.astro
const user = Astro.locals.user; // już dostępne

// W NavBar.tsx
<ModeToggle />  {/* już gotowy */}
<LogoutButton />  {/* już gotowy z pełną logiką API */}
```

Żadne dodatkowe wywołania API nie są wymagane - komponent korzysta z istniejących rozwiązań.

## 8. Interakcje użytkownika

1. **Nawigacja desktop**: Kliknięcie w linki Home/Generuj/Fiszki → przekierowanie do odpowiedniej ścieżki
2. **Nawigacja mobile**:
   - Kliknięcie hamburgera → otwarcie/zamykanie menu
   - Kliknięcie w link menu → nawigacja + zamknięcie menu
3. **Zarządzanie motywem**: Kliknięcie ModeToggle → wybór motywu z dropdown → zastosowanie motywu
4. **Logowanie**: Kliknięcie "Login" → przekierowanie do `/auth/login`
5. **Wylogowanie**: Kliknięcie avatara → wybór "Wyloguj" z menu → wywołanie akcji wylogowania
6. **Responsywność**: Automatyczne dostosowanie layout'u przy zmianie szerokości ekranu

## 9. Warunki i walidacja

1. **Stan użytkownika**:
   - Jeśli `user !== null` → pokaż UserAvatar
   - Jeśli `user === null` → pokaż LoginButton
   - Walidacja: sprawdzenie obecności wymaganych pól (email dla inicjałów)

2. **Aktywna zakładka**:
   - Porównanie `currentPath` z ścieżkami linków
   - Wyróżnienie klasy CSS dla dopasowanej ścieżki

3. **Menu mobilne**:
   - Przy szerokości < 768px → ukryj desktop links, pokaż hamburger
   - Przy otwarciu menu → zablokuj scroll strony (opcjonalne)

4. **Motyw**:
   - Dostępność `localStorage` dla persystencji ustawień
   - Fallback do systemowego motywu przy braku wsparcia

## 10. Obsługa błędów

1. **Błąd ładowania danych użytkownika**: Fallback do stanu niezalogowanego, logowanie błędu do konsoli
2. **Błąd wylogowania**: Wyświetlenie toast z błędem, pozostanie w stanie zalogowanym
3. **Brak wsparcia dla motywu**: Fallback do motywu jasnego, informacja w konsoli dev
4. **Błąd nawigacji**: Fallback do strony głównej, logowanie błędu
5. **Responsywność**: Graceful degradation przy problemach z CSS/media queries

## 11. Kroki implementacji

1. **Analiza istniejących komponentów**:
   - ✅ `ModeToggle.tsx` - już gotowy, sprawdzić kompatybilność
   - ✅ `LogoutButton.tsx` - już gotowy, sprawdzić API
   - 🔄 `Layout.astro` - przeanalizować obecną nawigację

2. **Przygotowanie struktury katalogów**:
   - Utworzenie `src/components/navbar/`
   - Sprawdzenie istniejących katalogów auth

3. **Implementacja typów**:
   - Dodanie nowych typów do `src/types.ts`
   - Zaktualizowanie istniejących typów jeśli potrzebne

4. **Implementacja Logo**:
   - `src/components/navbar/Logo.tsx`
   - Stylizacja z Tailwind

5. **Implementacja NavigationLinks**:
   - `src/components/navbar/NavigationLinks.tsx`
   - Logika wyróżniania aktywnej zakładki

6. **Implementacja komponentów auth**:
   - `src/components/auth/LoginButton.tsx` (nowy)
   - ✅ `LogoutButton.tsx` już istnieje

7. **Implementacja UserAvatar**:
   - `src/components/navbar/UserAvatar.tsx`
   - Generowanie inicjałów z email
   - Dropdown menu z Shadcn/ui

8. **Implementacja UserSection**:
   - `src/components/navbar/UserSection.tsx`
   - Warunkowe renderowanie UserAvatar/LoginButton

9. **Implementacja MobileMenu**:
   - `src/components/navbar/MobileMenu.tsx`
   - Animacje i stan otwarcia/zamknięcia

10. **Implementacja głównego NavBar**:
    - `src/components/navbar/NavBar.tsx`
    - Integracja wszystkich komponentów dzieci (w tym istniejących ModeToggle i LogoutButton)
    - Logika responsywności

11. **Refaktoryzacja Layout.astro**:
    - Zastąpienie obecnej nawigacji komponentem NavBar
    - Przekazanie propsów (user, currentPath)
    - Zachowanie istniejących funkcjonalności (ModeToggle, Toaster, etc.)

12. **Testowanie i stylowanie**:
    - Testy responsywności desktop/mobile
    - Testy stanów użytkownika
    - Dostrojenie stylizacji Tailwind
    - Weryfikacja kompatybilności z istniejącymi komponentami

13. **Optymalizacja i refaktor**:
    - Code review i optymalizacja wydajności
    - Dodanie komentarzy i dokumentacji

## Podsumowanie wykorzystania istniejących komponentów

**Komponenty już dostępne (✅ można użyć bez zmian):**

- `ModeToggle.tsx` - kompletny przełącznik motywu z persystencją
- `LogoutButton.tsx` - kompletny przycisk wylogowania z API i obsługą błędów

**Komponenty do wykorzystania z modyfikacjami (🔄):**

- `Layout.astro` - zawiera podstawową nawigację, wymaga refaktoryzacji na nowy NavBar

**Komponenty do utworzenia od podstaw:**

- `NavBar.tsx` - główny kontener
- `Logo.tsx` - logo aplikacji
- `NavigationLinks.tsx` - linki z wyróżnianiem aktywnej zakładki
- `UserSection.tsx` - kontener sekcji użytkownika
- `UserAvatar.tsx` - avatar z inicjałami i dropdown
- `LoginButton.tsx` - przycisk do logowania
- `MobileMenu.tsx` - menu mobilne z hamburgerem

**Szacowany czas implementacji:** 6-8 godzin (znacznie mniej dzięki istniejącym komponentom)
