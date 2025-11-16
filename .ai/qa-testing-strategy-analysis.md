# Analiza QA: Strategia testów jednostkowych - Hooks & Components

## Kluczowe wytyczne selekcji elementów do testowania

### 1. **Kryterium złożoności biznesowej (Business Logic Complexity)**

**Testuj bezwzględnie:**

- Hooks z logiką biznesową: `use-candidates`, `use-save-flashcards`, `use-generation`
- Komponenty z walidacją: `LoginForm`, `RegisterForm`, `UpdatePasswordForm`, `CandidateItem`
- Komponenty z integracją API: wszystkie formularze auth, `GenerateView`

**Uzasadnienie:** Błędy w logice biznesowej = bezpośredni wpływ na funkcjonalność produktu. Walidacja = pierwsza linia obrony przed błędnymi danymi.

### 2. **Kryterium ryzyka utraty danych (Data Loss Risk)**

**Testuj bezwzględnie:**

- `use-save-flashcards` - batch processing, chunking, progress tracking
- `use-unsaved-changes-guard` - ochrona przed utratą zmian
- `GenerateView` - orchestrator z wieloma stanami

**Uzasadnienie:** Utrata danych użytkownika = krytyczny błąd produkcyjny. Batch processing wymaga testów edge cases (101+ items, network failures mid-batch).

### 3. **Kryterium złożoności stanu (State Complexity)**

**Testuj bezwzględnie:**

- `use-candidates` - zarządzanie stanem wielu kandydatów, walidacja, akcje accept/reject/edit
- `use-generation` - mapowanie DTO → VM, obsługa błędów RFC 7807
- `GenerateView` - integracja wielu hooks, zarządzanie modalami

**Uzasadnienie:** Złożone stany = więcej miejsc na błędy. Testy jednostkowe wykrywają regresje szybciej niż testy E2E.

### 4. **Kryterium użycia przez użytkownika (User-Facing Criticality)**

**Testuj bezwzględnie:**

- Wszystkie formularze auth (login, register, password reset) - pierwsza interakcja użytkownika
- `CandidateItem` - core interakcja z produktem (accept/reject/edit)
- `GenerateView` - główny flow produktu

**Uzasadnienie:** Błędy w krytycznych ścieżkach użytkownika = bezpośredni wpływ na konwersję i retention.

### 5. **Kryterium łatwości testowania (Testability)**

**Testuj warunkowo:**

- `use-api` - tylko eksport, brak logiki → **POMIŃ** (jak w planie)
- `KeyboardShortcutsHint` - głównie UI → **NISKI PRIORYTET**
- `GenerateButton` - prosty wrapper → **NISKI PRIORYTET** (ale szybki do napisania)

**Uzasadnienie:** ROI testów jednostkowych dla prostych wrapperów jest niski. Lepiej pokryć testami E2E.

---

## Spostrzeżenia na temat sensu testowania poszczególnych elementów

### HOOKS - Analiza szczegółowa

#### ✅ **KRYTYCZNE - Testuj bezwzględnie**

**`use-save-flashcards`** ⭐⭐⭐⭐⭐

- **Dlaczego:** Batch processing (100 items), chunking, progress tracking, obsługa błędów RFC 7807
- **Ryzyko:** Utrata danych przy błędnym chunkingu, brak progress tracking = UX issue
- **Złożoność:** Wysoka - wiele edge cases (101+ items, network failures mid-batch, empty array)
- **Verdict:** **BEZWZGLĘDNIE KONIECZNE** - już masz testy, kontynuuj

**`use-candidates`** ⭐⭐⭐⭐⭐

- **Dlaczego:** Core business logic - accept/reject/edit, walidacja długości (FRONT_MAX=200, BACK_MAX=500), `getAcceptedOnly()` filtruje błędne
- **Ryzyko:** Błędna walidacja = możliwość zapisu nieprawidłowych danych
- **Złożoność:** Wysoka - wiele akcji, walidacja, state management
- **Verdict:** **BEZWZGLĘDNIE KONIECZNE**

**`use-generation`** ⭐⭐⭐⭐

- **Dlaczego:** Mapowanie DTO → CandidateVM, generowanie `localId` (crypto.randomUUID), obsługa błędów RFC 7807
- **Ryzyko:** Błędne mapowanie = nieprawidłowe dane w UI
- **Złożoność:** Średnia-Wysoka - transformacja danych, error handling
- **Verdict:** **KONIECZNE**

**`use-unsaved-changes-guard`** ⭐⭐⭐⭐

- **Dlaczego:** Ochrona przed utratą danych, `beforeunload` event handling, modal state management
- **Ryzyko:** Brak ochrony = utrata pracy użytkownika
- **Złożoność:** Średnia - event listeners, state management
- **Verdict:** **KONIECZNE**

#### ⚠️ **ŚREDNIO WAŻNE - Testuj, ale z niższym priorytetem**

**`use-pagination`** ⭐⭐⭐

- **Dlaczego:** Prosta logika matematyczna (slicing, totalPages calculation)
- **Ryzyko:** Niskie - łatwe do wykrycia manualnie
- **Złożoność:** Niska - czysta funkcja matematyczna
- **Verdict:** **WARUNKOWO KONIECZNE** - szybki do napisania, dobry jako "warm-up" test

**`use-keyboard-shortcuts`** ⭐⭐⭐

- **Dlaczego:** Event handling, ignorowanie gdy focus na INPUT/TEXTAREA, optional handlers
- **Ryzyko:** Średnie - UX issue jeśli skróty nie działają
- **Złożoność:** Średnia - event listeners, edge cases (focus handling)
- **Verdict:** **WARUNKOWO KONIECZNE** - ważne dla power users, ale nie krytyczne dla MVP

#### ❌ **NIE KONIECZNE - Pomiń lub bardzo niski priorytet**

**`use-api`** ⭐

- **Dlaczego:** Tylko eksport `fetchJson` i `ApiError` - brak logiki
- **Ryzyko:** Brak - to jest wrapper
- **Złożoność:** Brak logiki
- **Verdict:** **POMIŃ** - zgodnie z planem, nie testuj eksportów

---

### KOMPONENTY GENERATE - Analiza szczegółowa

#### ✅ **KRYTYCZNE - Testuj bezwzględnie**

**`GenerateView`** ⭐⭐⭐⭐⭐

- **Dlaczego:** Orchestrator integrujący wszystkie hooks, zarządzanie modalami, keyboard shortcuts, navigation guard
- **Ryzyko:** Wysokie - błędy w integracji = cały flow nie działa
- **Złożoność:** Bardzo wysoka - wiele zależności, złożone stany
- **Verdict:** **BEZWZGLĘDNIE KONIECZNE** - ale rozważ testy integracyjne zamiast jednostkowych (mockowanie wszystkich hooks = dużo pracy)

**`CandidateItem`** ⭐⭐⭐⭐⭐

- **Dlaczego:** Core interakcja - accept/reject/edit, walidacja długości, `isDirty` tracking, undo functionality
- **Ryzyko:** Wysokie - błędy w akcjach = bezpośredni wpływ na UX
- **Złożoność:** Wysoka - dwa tryby (kompaktowy/edycja), walidacja, state management
- **Verdict:** **BEZWZGLĘDNIE KONIECZNE**

**`SourceTextarea`** ⭐⭐⭐⭐

- **Dlaczego:** Walidacja długości tekstu (min/max), licznik znaków, aria-invalid
- **Ryzyko:** Średnie-Wysokie - błędna walidacja = możliwość wysłania nieprawidłowych danych
- **Złożoność:** Średnia - walidacja, accessibility
- **Verdict:** **KONIECZNE**

**`GenerationStatus`** ⭐⭐⭐⭐

- **Dlaczego:** Wyświetlanie statusów (loading/error/completed), obsługa błędów, retry functionality
- **Ryzyko:** Średnie - błędne wyświetlanie statusu = mylący UX
- **Złożoność:** Średnia - różne stany, error mapping
- **Verdict:** **KONIECZNE**

**`SaveSummaryModal`** ⭐⭐⭐⭐

- **Dlaczego:** Podsumowanie przed zapisem, loading state, error display
- **Ryzyko:** Średnie - błędne podsumowanie = mylący UX przed zapisem
- **Złożoność:** Średnia - wyświetlanie danych, callbacks
- **Verdict:** **KONIECZNE**

**`UnsavedChangesModal`** ⭐⭐⭐⭐

- **Dlaczego:** Ochrona przed utratą danych, trzy akcje (save/discard/cancel)
- **Ryzyko:** Wysokie - brak ochrony = utrata pracy użytkownika
- **Złożoność:** Średnia - modal logic, callbacks
- **Verdict:** **KONIECZNE**

#### ⚠️ **ŚREDNIO WAŻNE - Testuj z niższym priorytetem**

**`CandidatesToolbar`** ⭐⭐⭐

- **Dlaczego:** Wyświetlanie badge'ów, `onAcceptAll`, disabled state gdy brak accepted
- **Ryzyko:** Niskie-Średnie - głównie prezentacja danych
- **Złożoność:** Niska - prezentacja + kilka callbacks
- **Verdict:** **WARUNKOWO KONIECZNE** - szybki do napisania, ale nie krytyczne

**`CandidatesList`** ⭐⭐⭐

- **Dlaczego:** Grid layout (mobile/desktop), mapowanie items, empty state
- **Ryzyko:** Niskie - głównie prezentacja
- **Złożoność:** Niska - renderowanie listy
- **Verdict:** **WARUNKOWO KONIECZNE** - rozważ testy snapshot zamiast jednostkowych

**`PaginationControls`** ⭐⭐⭐

- **Dlaczego:** Nawigacja stron, disabled states, aria-labels
- **Ryzyko:** Niskie - łatwe do wykrycia manualnie
- **Złożoność:** Niska - prezentacja + callbacks
- **Verdict:** **WARUNKOWO KONIECZNE**

**`CandidatesSection`** ⭐⭐

- **Dlaczego:** Kompozycja innych komponentów, przekazywanie props
- **Ryzyko:** Niskie - brak własnej logiki
- **Złożoność:** Brak logiki - tylko kompozycja
- **Verdict:** **NISKI PRIORYTET** - rozważ pominięcie (testuj child components zamiast)

**`GenerateControls`** ⭐⭐

- **Dlaczego:** Kompozycja `SourceTextarea` + `GenerateButton` + `GenerationStatus`
- **Ryzyko:** Niskie - brak własnej logiki
- **Złożoność:** Brak logiki - tylko kompozycja
- **Verdict:** **NISKI PRIORYTET** - rozważ pominięcie

#### ❌ **NIE KONIECZNE - Pomiń lub bardzo niski priorytet**

**`GenerateButton`** ⭐

- **Dlaczego:** Prosty wrapper Button z loading state
- **Ryzyko:** Brak - brak logiki biznesowej
- **Złożoność:** Brak logiki
- **Verdict:** **POMIŃ** - chyba że napisanie zajmie <15 min (wtedy OK jako "quick win")

**`KeyboardShortcutsHint`** ⭐

- **Dlaczego:** Tylko UI - floating button, dialog z listą skrótów
- **Ryzyko:** Brak - brak logiki
- **Złożoność:** Brak logiki
- **Verdict:** **POMIŃ** - testuj manualnie lub snapshot test

---

### KOMPONENTY AUTH - Analiza szczegółowa

#### ✅ **KRYTYCZNE - Testuj bezwzględnie**

**`LoginForm`** ⭐⭐⭐⭐⭐

- **Dlaczego:** Pierwsza interakcja użytkownika, walidacja, obsługa błędów 401/403, redirect handling
- **Ryzyko:** Wysokie - błędy w logowaniu = użytkownik nie może użyć produktu
- **Złożoność:** Średnia-Wysoka - form handling, error handling, redirect logic
- **Verdict:** **BEZWZGLĘDNIE KONIECZNE**

**`RegisterForm`** ⭐⭐⭐⭐⭐

- **Dlaczego:** Rejestracja = konwersja, walidacja, flow z `VerifyEmailForm`, auto-login, obsługa konfliktów (409)
- **Ryzyko:** Wysokie - błędy w rejestracji = utrata konwersji
- **Złożoność:** Wysoka - złożony flow, wiele stanów, error handling
- **Verdict:** **BEZWZGLĘDNIE KONIECZNE**

**`UpdatePasswordForm`** ⭐⭐⭐⭐

- **Dlaczego:** Walidacja hasła (min 8 znaków, litera+cyfra), walidacja potwierdzenia (refine), obsługa wygasłego linku (401/410)
- **Ryzyko:** Wysokie - błędna walidacja = możliwość słabych haseł lub security issue
- **Złożoność:** Średnia-Wysoka - walidacja, error handling
- **Verdict:** **BEZWZGLĘDNIE KONIECZNE**

**`VerifyEmailForm`** ⭐⭐⭐⭐

- **Dlaczego:** Walidacja 6-cyfrowego kodu, filtrowanie tylko cyfr, obsługa wygasłego kodu (410)
- **Ryzyko:** Średnie-Wysokie - błędna walidacja = użytkownik nie może zweryfikować konta
- **Złożoność:** Średnia - walidacja, error handling
- **Verdict:** **KONIECZNE**

#### ⚠️ **ŚREDNIO WAŻNE - Testuj z niższym priorytetem**

**`RequestResetForm`** ⭐⭐⭐

- **Dlaczego:** Prosty formularz email, success message, link "Powrót do logowania"
- **Ryzyko:** Niskie-Średnie - głównie prezentacja + API call
- **Złożoność:** Niska - prosty formularz
- **Verdict:** **WARUNKOWO KONIECZNE** - szybki do napisania, ale nie krytyczne dla MVP

**`ResendVerificationForm`** ⭐⭐⭐

- **Dlaczego:** Prosty formularz email, success toast
- **Ryzyko:** Niskie - głównie prezentacja + API call
- **Złożoność:** Niska - prosty formularz
- **Verdict:** **WARUNKOWO KONIECZNE**

**`LogoutButton`** ⭐⭐

- **Dlaczego:** Prosty button z API call i redirect
- **Ryzyko:** Niskie - łatwe do wykrycia manualnie
- **Złożoność:** Niska - jeden API call
- **Verdict:** **WARUNKOWO KONIECZNE** - szybki do napisania, ale nie krytyczne

---

## Czy wszystkie testy są krytycznie istotne przed produkcją?

### Odpowiedź: **NIE** - priorytetyzacja jest kluczowa

### ✅ **BEZWZGLĘDNIE KONIECZNE przed produkcją (MVP):**

**Hooks (4/7):**

1. `use-save-flashcards` ⭐⭐⭐⭐⭐
2. `use-candidates` ⭐⭐⭐⭐⭐
3. `use-generation` ⭐⭐⭐⭐
4. `use-unsaved-changes-guard` ⭐⭐⭐⭐

**Komponenty Generate (6/13):**

1. `CandidateItem` ⭐⭐⭐⭐⭐
2. `SourceTextarea` ⭐⭐⭐⭐
3. `GenerationStatus` ⭐⭐⭐⭐
4. `SaveSummaryModal` ⭐⭐⭐⭐
5. `UnsavedChangesModal` ⭐⭐⭐⭐
6. `GenerateView` ⭐⭐⭐⭐⭐ (ale rozważ testy integracyjne zamiast jednostkowych)

**Komponenty Auth (4/7):**

1. `LoginForm` ⭐⭐⭐⭐⭐
2. `RegisterForm` ⭐⭐⭐⭐⭐
3. `UpdatePasswordForm` ⭐⭐⭐⭐
4. `VerifyEmailForm` ⭐⭐⭐⭐

**Total MVP: 14 plików testów** (zamiast 27 w planie)

### ⚠️ **WARUNKOWO KONIECZNE (dodaj po MVP):**

**Hooks (2/7):**

- `use-pagination` - szybki do napisania, dobry warm-up
- `use-keyboard-shortcuts` - ważne dla power users

**Komponenty Generate (3/13):**

- `CandidatesToolbar` - szybki do napisania
- `CandidatesList` - rozważ snapshot test
- `PaginationControls` - szybki do napisania

**Komponenty Auth (3/7):**

- `RequestResetForm` - szybki do napisania
- `ResendVerificationForm` - szybki do napisania
- `LogoutButton` - szybki do napisania

**Total Phase 2: 8 plików testów**

### ❌ **POMIŃ (lub bardzo niski priorytet):**

**Hooks (1/7):**

- `use-api` - tylko eksport, brak logiki

**Komponenty Generate (4/13):**

- `GenerateButton` - prosty wrapper
- `KeyboardShortcutsHint` - tylko UI
- `CandidatesSection` - tylko kompozycja
- `GenerateControls` - tylko kompozycja

**Total do pominięcia: 5 plików**

---

## Rekomendacje strategiczne

### 1. **Priorytetyzacja MVP (Minimum Viable Product)**

**Faza 1 - Krytyczne (przed produkcją):**

- 14 plików testów (hooks + komponenty krytyczne)
- Estymacja: ~20-25 godzin (zamiast 33-42h)

**Faza 2 - Po MVP (quick wins):**

- 8 plików testów (warunkowo konieczne)
- Estymacja: ~8-10 godzin

**Faza 3 - Opcjonalne:**

- 5 plików do pominięcia lub bardzo niski priorytet

### 2. **Alternatywne podejścia dla złożonych komponentów**

**`GenerateView` - rozważ testy integracyjne zamiast jednostkowych:**

- Mockowanie wszystkich hooks = dużo pracy
- Testy integracyjne (z prawdziwymi hooks) = lepszy ROI
- Użyj `@testing-library/react` z `render()` zamiast `renderHook()`

**Komponenty tylko-kompozycyjne (`CandidatesSection`, `GenerateControls`):**

- Pomiń testy jednostkowe
- Testuj child components zamiast
- Rozważ snapshot tests jeśli potrzebujesz coverage

### 3. **Coverage targets - realistyczne**

**MVP:**

- Hooks krytyczne: 85% statements, 80% branches
- Komponenty krytyczne: 75% statements, 70% branches

**Po MVP:**

- Wszystkie hooks: 80% statements, 75% branches
- Wszystkie komponenty: 70% statements, 70% branches

### 4. **Testy E2E jako uzupełnienie**

**Zamiast testów jednostkowych dla prostych komponentów:**

- `GenerateButton` - testuj w E2E flow generacji
- `KeyboardShortcutsHint` - testuj manualnie lub E2E
- `LogoutButton` - testuj w E2E flow auth

**ROI testów E2E dla prostych komponentów jest wyższy niż jednostkowych.**

---

## Podsumowanie

### Kluczowe wnioski:

1. **Nie wszystkie testy są krytycznie istotne** - priorytetyzacja jest kluczowa dla efektywnego wykorzystania czasu

2. **MVP powinien skupić się na 14 plikach** zamiast 27 - oszczędność ~15-20 godzin

3. **Testy jednostkowe dla prostych wrapperów/kompozycji mają niski ROI** - lepiej pokryć testami E2E

4. **`GenerateView` wymaga przemyślenia** - rozważ testy integracyjne zamiast jednostkowych z mockami wszystkich hooks

5. **Coverage targets powinny być realistyczne** - 70-75% dla komponentów, 80-85% dla hooks krytycznych

### Rekomendacja finalna:

**Przed produkcją:** Zaimplementuj 14 krytycznych plików testów (~20-25h). Pozostałe 13 plików dodaj w fazie 2 po MVP lub pomiń jeśli ROI jest niski.

**Kryterium decyzyjne:** Jeśli komponent/hook ma własną logikę biznesową lub walidację → testuj. Jeśli to tylko wrapper/kompozycja → pomiń lub testuj E2E.
