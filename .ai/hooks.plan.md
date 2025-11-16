# Plan testów jednostkowych - Hooks i Komponenty

## Zakres testów

### Hooks (7 plików)

- `src/components/hooks/__tests__/use-api.test.ts`
- `src/components/hooks/__tests__/use-unsaved-changes-guard.test.ts`
- `src/components/hooks/__tests__/use-save-flashcards.test.ts`
- `src/components/hooks/__tests__/use-pagination.test.ts`
- `src/components/hooks/__tests__/use-generation.test.ts`
- `src/components/hooks/__tests__/use-keyboard-shortcuts.test.ts`
- `src/components/hooks/__tests__/use-candidates.test.ts`

### Komponenty Auth (7 plików)

- `src/components/auth/__tests__/LoginForm.test.tsx`
- `src/components/auth/__tests__/RegisterForm.test.tsx`
- `src/components/auth/__tests__/VerifyEmailForm.test.tsx`
- `src/components/auth/__tests__/ResendVerificationForm.test.tsx`
- `src/components/auth/__tests__/RequestResetForm.test.tsx`
- `src/components/auth/__tests__/UpdatePasswordForm.test.tsx`
- `src/components/auth/__tests__/LogoutButton.test.tsx`

### Komponenty Generate (13 plików)

- `src/components/generate/__tests__/GenerateView.test.tsx`
- `src/components/generate/__tests__/GenerateControls.test.tsx`
- `src/components/generate/__tests__/GenerateButton.test.tsx`
- `src/components/generate/__tests__/SourceTextarea.test.tsx`
- `src/components/generate/__tests__/GenerationStatus.test.tsx`
- `src/components/generate/__tests__/CandidatesSection.test.tsx`
- `src/components/generate/__tests__/CandidatesList.test.tsx`
- `src/components/generate/__tests__/CandidatesToolbar.test.tsx`
- `src/components/generate/__tests__/CandidateItem.test.tsx`
- `src/components/generate/__tests__/PaginationControls.test.tsx`
- `src/components/generate/__tests__/SaveSummaryModal.test.tsx`
- `src/components/generate/__tests__/UnsavedChangesModal.test.tsx`
- `src/components/generate/__tests__/KeyboardShortcutsHint.test.tsx`

## Struktura testów

### 1. Hooks - Wzorce testowania

#### use-api.test.ts

- Test eksportu `fetchJson` i `ApiError`
- Weryfikacja że hook zwraca poprawne referencje

#### use-unsaved-changes-guard.test.ts

- Test `beforeunload` event listener gdy `hasChanges=true`
- Test że listener nie jest dodawany gdy `hasChanges=false`
- Test `showModal` state management
- Test `confirmSave`, `confirmDiscard`, `confirmCancel` callbacks
- Test `pendingNavigation` handling
- Mock `window.addEventListener` i `removeEventListener`

#### use-save-flashcards.test.ts

- Test sukcesu zapisu (single batch < 100 items)
- Test chunkowania do batchy (101+ items → 2 batchy)
- Test progress tracking (`currentBatch`, `totalBatches`)
- Test obsługi RFC 7807 błędów (`ApiError` z `problem.code`)
- Test network errors
- Test `reset()` function
- Test pustej tablicy kandydatów
- Mock `fetchJson` z `http.fetcher.ts`

#### use-pagination.test.ts

- Test inicjalizacji z domyślną stroną 1
- Test `goToPage()` z walidacją zakresu
- Test `nextPage()` i `prevPage()`
- Test `currentPageItems` slicing
- Test `totalPages` calculation
- Test `reset()` do strony 1
- Test edge cases (pusta tablica, perPage > items.length)

#### use-generation.test.ts

- Test sukcesu generacji z mapowaniem DTO → CandidateVM
- Test `localId` generation (crypto.randomUUID)
- Test obsługi RFC 7807 błędów
- Test network errors
- Test `retry()` function
- Test `reset()` function
- Mock `fetchJson` z `use-api`

#### use-keyboard-shortcuts.test.ts

- Test wszystkich skrótów (A, E, R, S, ←, →, PgUp, PgDn)
- Test ignorowania gdy focus na INPUT/TEXTAREA
- Test `enabled=false` disable shortcuts
- Test `preventDefault()` na skrótach
- Mock `window.addEventListener` i cleanup
- Test że handlers są opcjonalne (optional chaining)

#### use-candidates.test.ts

- Test `accept()` zmienia decision na "accepted"
- Test `reject()` zmienia decision na "rejected"
- Test `updateField()` z walidacją (FRONT_MAX=200, BACK_MAX=500)
- Test `updateField()` ustawia `isDirty=true` i `source="ai-edited"`
- Test `undo()` przywraca `original` values
- Test `clear()` usuwa wszystkich kandydatów
- Test `getTotals()` zwraca poprawne liczby (accepted, rejected, edited)
- Test `getAcceptedOnly()` filtruje tylko accepted bez błędów walidacji
- Test `acceptAll()` akceptuje wszystkie nie-rejected
- Test walidacji długości pól (frontError, backError)

### 2. Komponenty Auth - Wzorce testowania

#### LoginForm.test.tsx

- Test renderowania formularza z polami email/password
- Test submit z poprawnymi danymi → sukces → redirect
- Test obsługi błędów walidacji (400 z `meta.fieldErrors`)
- Test obsługi błędów autoryzacji (401/403) → neutralny komunikat
- Test `redirectTo` prop i query param handling
- Test loading state podczas submit
- Mock `fetchJson` i `toast`
- Użyj `userEvent` do wypełnienia formularza

#### RegisterForm.test.tsx

- Test renderowania formularza z wszystkimi polami
- Test submit → sukces → pokazanie `VerifyEmailForm` gdy brak `user_id`
- Test submit → auto-login → redirect gdy `user_id` w response
- Test obsługi błędów walidacji (400)
- Test obsługi konfliktu (409) → email już istnieje
- Test `acceptTerms` checkbox validation
- Test przejścia do `VerifyEmailForm` z `registeredEmail`
- Mock `fetchJson`, `toast`, `window.location.href`

#### VerifyEmailForm.test.tsx

- Test renderowania z 6-cyfrowym inputem
- Test submit z poprawnym kodem → sukces → redirect
- Test obsługi błędów walidacji (400)
- Test obsługi wygasłego kodu (410)
- Test filtrowania tylko cyfr w input (regex replace)
- Test `maxLength={6}` constraint
- Test `onVerified` callback
- Mock `fetchJson`, `toast`

#### ResendVerificationForm.test.tsx

- Test renderowania formularza email
- Test submit → sukces → toast success
- Test obsługi błędów API
- Mock `fetchJson`, `toast`

#### RequestResetForm.test.tsx

- Test renderowania formularza email
- Test submit → sukces → pokazanie success message
- Test obsługi błędów API
- Test linku "Powrót do logowania"
- Mock `fetchJson`, `toast`

#### UpdatePasswordForm.test.tsx

- Test renderowania z polami password/confirmPassword
- Test submit → sukces → redirect do login
- Test walidacji hasła (min 8 znaków, litera+cyfra)
- Test walidacji potwierdzenia hasła (refine)
- Test obsługi wygasłego linku (401/410)
- Test obsługi błędów walidacji (400)
- Mock `fetchJson`, `toast`, `setTimeout`

#### LogoutButton.test.tsx

- Test renderowania przycisku
- Test click → POST /api/auth/logout → redirect
- Test loading state
- Test obsługi błędów API
- Test `onLogoutSuccess` callback
- Mock `fetchJson`, `toast`, `window.location.href`

### 3. Komponenty Generate - Wzorce testowania

#### GenerateView.test.tsx

- Test renderowania głównego widoku
- Test integracji wszystkich hooks (`useGeneration`, `useCandidates`, `usePagination`, `useSaveFlashcards`)
- Test flow: generate → candidates → accept → save
- Test keyboard shortcuts integration
- Test `UnsavedChangesModal` przy nawigacji
- Test `SaveSummaryModal` przy zapisie
- Test `useNavigationInterceptor` integration
- Test `beforeunload` event handling
- Mock wszystkich hooks i `useNavigationInterceptor`

#### GenerateControls.test.tsx

- Test renderowania `SourceTextarea` i `GenerateButton`
- Test `GenerationStatus` display dla różnych stanów
- Test walidacji długości tekstu (min/max)
- Test disabled state gdy tekst nieprawidłowy
- Test `onRetry` gdy status="error"
- Mock child components jeśli potrzebne

#### GenerateButton.test.tsx

- Test renderowania z label
- Test loading state z spinnerem
- Test disabled state
- Test `onClick` handler
- Test aria attributes

#### SourceTextarea.test.tsx

- Test renderowania textarea
- Test wyświetlania licznika znaków
- Test walidacji (za krótki, za długi, OK)
- Test `maxLength` constraint
- Test aria-invalid dla błędów
- Test placeholder text

#### GenerationStatus.test.tsx

- Test renderowania dla status="loading" → progress bar
- Test renderowania dla status="error" → error message + retry button
- Test renderowania dla status="completed" → success message
- Test `getErrorMessage()` dla różnych error codes
- Test `onRetry` callback
- Test `generatedCount` display

#### CandidatesSection.test.tsx

- Test renderowania `CandidatesToolbar`, `CandidatesList`, `PaginationControls`
- Test przekazywania props do child components
- Test że komponenty nie renderują się gdy `total=0`
- Mock child components

#### CandidatesList.test.tsx

- Test renderowania grid (mobile: 1 col, desktop: 3 cols)
- Test mapowania items do `CandidateItem`
- Test empty state gdy `items.length=0`
- Test `startIndex` prop dla numeracji
- Test `focusedCardIndex` i `editingCardId` props
- Mock `useMediaQuery` hook

#### CandidatesToolbar.test.tsx

- Test renderowania wszystkich badge'ów (razem, pending, accepted, edited, rejected)
- Test `onAcceptAll` button
- Test `onSave` button (disabled gdy brak accepted)
- Test loading state
- Test `isLoading` prop

#### CandidateItem.test.tsx

- Test renderowania kompaktowego widoku (domyślny)
- Test renderowania rozszerzonego widoku (edycja)
- Test akcji: accept, reject, edit
- Test `updateField()` z walidacją długości
- Test `undo()` przywraca original values
- Test `isFocused` → ring border
- Test walidacji błędów (frontError, backError)
- Test "Gotowe" button disabled gdy błędy walidacji
- Test `isDirty` visual indicator
- Mock `onChange`, `onAccept`, `onReject`

#### PaginationControls.test.tsx

- Test renderowania wszystkich przycisków nawigacji
- Test disabled states (first/last page)
- Test `onGoToPage`, `onNextPage`, `onPrevPage` callbacks
- Test wyświetlania numeracji strony
- Test że komponent nie renderuje się gdy `totalPages <= 1`
- Test aria-labels

#### SaveSummaryModal.test.tsx

- Test renderowania z podsumowaniem (acceptedUnedited, acceptedEdited)
- Test `onConfirm` → zapis
- Test `onCancel` → zamknięcie
- Test loading state
- Test error display
- Test disabled state gdy `totalAccepted=0`
- Mock `Dialog` component

#### UnsavedChangesModal.test.tsx

- Test renderowania z warning message
- Test `onSave` → zapis przed nawigacją
- Test `onDiscard` → porzucenie zmian
- Test `onCancel` → anulowanie
- Test loading state
- Mock `AlertDialog` component

#### KeyboardShortcutsHint.test.tsx

- Test renderowania floating button
- Test otwierania dialogu z listą skrótów
- Test zamykania dialogu
- Test że komponent nie renderuje się gdy `show=false`
- Mock `Dialog` component

## Techniczne szczegóły implementacji

### Mockowanie zależności

#### Dla hooks:

```typescript
// Mock fetchJson
vi.mock('@/lib/http/http.fetcher', () => ({
  fetchJson: vi.fn(),
  ApiError: class ApiError extends Error { ... }
}));

// Mock useNavigationInterceptor
vi.mock('@/lib/useNavigationInterceptor', () => ({
  useNavigationInterceptor: vi.fn()
}));

// Mock window events
vi.spyOn(window, 'addEventListener');
vi.spyOn(window, 'removeEventListener');
```

#### Dla komponentów:

```typescript
// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

// Mock fetchJson
vi.mock('@/lib/http/http.fetcher', () => ({
  fetchJson: vi.fn(),
  ApiError: class ApiError extends Error { ... }
}));

// Mock hooks (dla GenerateView)
vi.mock('@/components/hooks/use-generation');
vi.mock('@/components/hooks/use-candidates');
```

### Test helpers do stworzenia

#### `src/tests/helpers/hooks.test-helpers.ts`

- `createMockCandidateVM()` - factory dla CandidateVM
- `createMockGenerationState()` - factory dla GenerationState
- `createMockSaveState()` - factory dla SaveState

#### `src/tests/helpers/components.test-helpers.ts`

- `renderWithProviders()` - wrapper z React Testing Library
- `waitForNavigation()` - helper dla testów redirect
- `mockWindowLocation()` - helper dla mockowania window.location.href

### Coverage targets

- Hooks: 80% statements, 75% branches
- Komponenty Auth: 70% statements, 70% branches
- Komponenty Generate: 70% statements, 70% branches

### Wykluczenia

- Nie testować komponentów z `src/components/ui/**` (shadcn)
- Nie testować `use-api.ts` jako hook (tylko eksport)
- Nie testować integracji z rzeczywistym API (tylko mocki)

## Kolejność implementacji

### Faza 1: Hooks (priorytet wysoki)

1. `use-pagination.test.ts` - najprostszy, dobry start
2. `use-candidates.test.ts` - core business logic
3. `use-generation.test.ts` - API integration
4. `use-save-flashcards.test.ts` - batch processing
5. `use-keyboard-shortcuts.test.ts` - event handling
6. `use-unsaved-changes-guard.test.ts` - navigation guard

### Faza 2: Komponenty Generate (priorytet średni)

1. `GenerateButton.test.tsx` - prosty komponent
2. `SourceTextarea.test.tsx` - walidacja
3. `GenerationStatus.test.tsx` - status display
4. `PaginationControls.test.tsx` - nawigacja
5. `CandidatesToolbar.test.tsx` - toolbar
6. `CandidateItem.test.tsx` - core component
7. `CandidatesList.test.tsx` - lista
8. `CandidatesSection.test.tsx` - kompozycja
9. `SaveSummaryModal.test.tsx` - modal
10. `UnsavedChangesModal.test.tsx` - modal
11. `KeyboardShortcutsHint.test.tsx` - hint
12. `GenerateControls.test.tsx` - controls
13. `GenerateView.test.tsx` - orchestrator (najbardziej złożony)

### Faza 3: Komponenty Auth (priorytet średni)

1. `LogoutButton.test.tsx` - prosty
2. `ResendVerificationForm.test.tsx` - prosty formularz
3. `RequestResetForm.test.tsx` - prosty formularz
4. `VerifyEmailForm.test.tsx` - weryfikacja OTP
5. `UpdatePasswordForm.test.tsx` - walidacja hasła
6. `LoginForm.test.tsx` - core auth
7. `RegisterForm.test.tsx` - najbardziej złożony (flow z VerifyEmailForm)

## Estymacja czasu

- Hooks: ~8-10 godzin (7 plików × 1-1.5h)
- Komponenty Generate: ~15-20 godzin (13 plików × 1-1.5h)
- Komponenty Auth: ~10-12 godzin (7 plików × 1.5-2h)
- **Total: ~33-42 godziny**
