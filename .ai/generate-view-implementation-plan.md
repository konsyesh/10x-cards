# Plan implementacji widoku Generate

## 1. Przegląd

Widok **Generate** (`/generate`) służy do szybkiego przekształcenia dłuższego tekstu źródłowego (1 000–50 000 znaków) w kandydatów fiszek, ich recenzji (Accept / Edit / Reject) oraz **zbiorczego zapisu** zaakceptowanych pozycji do bazy z automatycznym przypisaniem do harmonogramu powtórek. Funkcja obejmuje pełną walidację długości pól, paginację lokalną listy kandydatów (~30/stronę), podsumowanie edycji oraz ostrzeżenia o niezapisanych zmianach. Wymagania wynikają z PRD (FR‑01…FR‑04, FR‑12, FR‑13, FR‑18) i historyjek US‑005…US‑011, US‑020, US‑022, US‑031.

## 2. Routing widoku

- Ścieżka: **`/generate`** (Astro: `src/pages/generate.astro`).
- Wnętrze strony: wyspa React z komponentem `GenerateView` (render klientowy).
- Guard nawigacji (US‑011): `beforeunload` + wewnętrzny modal przy próbie opuszczenia lub zmianie route’u, jeśli istnieją niezapisane zmiany (zaakceptowani kandydaci).

## 3. Struktura komponentów

```
GenerateView (container)
├─ SourceTextarea (textarea z licznikiem + walidacją 1k–50k)
├─ GenerateControls
│  ├─ GenerateButton (POST /api/generations)
│  └─ GenerationStatus (spinner/progress/error retry)
├─ CandidatesSection
│  ├─ CandidatesToolbar (summary: accepted/rejected/edited)
│  ├─ CandidatesList
│  │  ├─ CandidateItem (Row/Card; inline edit; a11y)
│  │  └─ PaginationControls
│  └─ KeyboardShortcutsHint
├─ BulkSaveToolbar (CTA „Zapisz X kart”)
├─ SaveSummaryModal (US‑031)
└─ UnsavedChangesGuard (modal)
```

- Layout responsywny: karty pionowe w mobile, tabela/siatka w desktopie (US‑029).

## 4. Szczegóły komponentów

### 4.1. `GenerateView`

- **Opis**: Kontener logiki widoku; trzyma stan źródła, kandydatów, decyzji, paginacji, błędów.
- **Elementy**: wrapper, nagłówek, sekcja tekstu wejściowego i sterowania, sekcja kandydatów, toolbary i modale.
- **Zdarzenia**: init, `onGenerate()`, `onRetry()`, `onAccept/Reject/Edit()`, `onBulkSave()`, `onNavigateAway()`.
- **Walidacja**: włącza/wyłącza przyciski wg stanu i błędów potomków.
- **Typy**: korzysta z `CreateGenerationCommand`, `GenerationResponseDTO`, `ApiSuccessResponse`, `ApiErrorResponse`.
- **Propsy**: brak (komponent strony).

### 4.2. `SourceTextarea`

- **Opis**: Pole wejściowe 1 000–50 000 znaków z licznikiem i komunikatem limitu (FR‑01, US‑005/US‑021).
- **Elementy**: `<label>`, `<textarea>`, licznik, komunikat błędu (ARIA live), **Przycisk Generuj** (zależny od walidacji).
- **Zdarzenia**: `onChange` (aktualizacja licznika, flagi valid/invalid).
- **Walidacja**: min 1000 / max 50000; poza zakresem blokuje `GenerateButton` i pokazuje komunikat.
- **Typy**: lokalne (np. `CharCountState`).
- **Propsy**: `{ value, onChange, isValid, min=1000, max=50000 }`.

### 4.3. `GenerateControls`

- **Opis**: Sekcja akcji generacji + status.
- **Elementy**: `GenerateButton`, `GenerationStatus`.
- **Zdarzenia**: `onClick` → `POST /api/generations`; `onCancel` (opcjonalnie, jeżeli backend doda anulowanie).
- **Walidacja**: disabled gdy tekst poza zakresem / trwająca generacja / rate limit.
- **Typy**: `CreateGenerationCommand`, `ApiSuccessResponse<GenerationResponseDTO>`, `ApiErrorResponse`.
- **Propsy**: `{ canGenerate, onGenerate, loading, error }`.
- **Uwaga techniczna**: endpoint w implementacji backu jest pod **`/api/generations`** z whitelistą modeli i rate‑limitem **5 req/min**; mapowanie wyjątków na 429/503/504. UI musi to respektować i pokazać retry.

### 4.4. `GenerationStatus`

- **Opis**: Banner inline nad listą; spinner/progress; mapowanie błędów (429/503/504) i przycisk „Spróbuj ponownie” (US‑020).
- **Elementy**: spinner/progress, tekst, `Retry`.
- **Zdarzenia**: `onRetry` → ponowne wywołanie generacji (bez duplikacji zaakceptowanych).
- **Walidacja**: brak (prezentacyjne).
- **Propsy**: `{ state: 'idle'|'loading'|'error', errorCode?: ApiErrorCode, message?: string, onRetry }`.

### 4.5. `CandidatesSection`

- **Opis**: Wrapper na listę kandydatów, podsumowanie (accepted/rejected/edited) oraz paginację (US‑006, FR‑02).
- **Elementy**: `CandidatesToolbar`, `CandidatesList`, `PaginationControls`, `KeyboardShortcutsHint`.
- **Propsy**: `{ candidatesPage, totals, onDecision, onEdit, onUndo, onPageChange }`.

### 4.6. `CandidatesList`

- **Opis**: Lista 30/strona; w mobile karty pionowe, w desktop tabela/siatka; edycja inline, walidacja live (FR‑02/FR‑04).
- **Elementy**: `CandidateItem` × N, puste stany.
- **Zdarzenia**: `onAccept`, `onReject`, `onEditChange`, `onUndo`.
- **Walidacja**: `front ≤ 200`, `back ≤ 500`, widoczna sygnalizacja + ogłoszenie dla screen‑reader’a (ARIA live).
- **Propsy**: `{ items, layout: 'cards'|'table', onAccept, onReject, onEditChange }`.

### 4.7. `CandidateItem` (Row/Card)

- **Opis**: Wiersz/tile z polami `front`, `back`, statusem decyzji: _Pending / Accepted / Rejected / Edited_.
- **Elementy**: dwa pola tekstowe (inline), wskaźniki błędu, przyciski **Akceptuj / Edytuj / Odrzuć**, skróty klawiaturowe (US‑022).
- **Zdarzenia**: `onAccept`, `onReject`, `onEditToggle`, `onFieldChange`.
- **Walidacja**: as‑you‑type; uniemożliwia **Accept** przy błędnych długościach; po edycji ustawia `source: "ai-edited"`.
- **Propsy**: `{ vm: CandidateVM, onChange(vm), onAccept(id), onReject(id) }`.

### 4.8. `BulkSaveToolbar`

- **Opis**: Dock (bottom mobile / top desktop) z CTA **„Zapisz X kart”** aktywne gdy `X>0` (US‑010). Podgląd liczników.
- **Zdarzenia**: `onOpenSummary()` (US‑031).
- **Walidacja**: aktywuje się wyłącznie przy co najmniej 1 „accepted” bez błędów pól.

### 4.9. `SaveSummaryModal` (US‑031)

- **Opis**: Modal podsumowania: liczby zaakceptowanych nieedytowanych i edytowanych; potwierdzenie **Zapisz teraz** → `POST /api/flashcards` (bulk). Po sukcesie toast i czyszczenie lokalnego stanu.
- **Walidacja**: blokuje akcję, jeśli wśród „accepted” są błędne długości.
- **Propsy**: `{ acceptedUnedited, acceptedEdited, onConfirm, onCancel }`.

### 4.10. `UnsavedChangesGuard`

- **Opis**: Monitoruje zmiany i ostrzega przy próbie wyjścia (US‑011).
- **Elementy**: modal z opcjami „Zapisz teraz” / „Porzuć” / „Anuluj”.
- **Zdarzenia**: `onConfirmSave` → deleguje do `SaveSummaryModal`.

### 4.11. `KeyboardShortcutsHint`

- **Opis**: Widoczna/ukrywana ściąga skrótów: **A**=Akceptuj, **E**=Tryb edycji, **R**=Odrzuć, **S**=Zapisz, **←/→**=nawigacja po kartach, **PgUp/PgDn**=zmiana strony (US‑022).

## 5. Typy

### 5.1. Kontrakty API (z backendu)

- **CreateGenerationCommand** `{ source_text: string (1000–50000), model: "gpt-4o-mini" }`.
- **GenerationResponseDTO** `{ generation_id, status, model, generated_count, generation_duration_ms, flashcards_candidates: GeneratedFlashcardCandidateDTO[], message }`.
- **GeneratedFlashcardCandidateDTO** `{ front, back, source: "ai-full" }`.
- **CreateFlashcardsCommand** `{ flashcards: CreateFlashcardItemCommand[], collection_id: number|null }` (1–100 kart).
- **CreateFlashcardItemCommand** `{ front (1–200), back (1–500), source: "manual"|"ai-full"|"ai-edited", generation_id?: number|null }`.
- **CreateFlashcardsResponseDTO** `{ saved_count, flashcards: FlashcardDTO[], collection_id, message }`.
- Uniwersalne koperty: **ApiSuccessResponse<T>** / **ApiErrorResponse** (z `error.code`, `error.message`, `details?`).

### 5.2. ViewModel‑e (frontend)

```ts
type CandidateDecision = "pending" | "accepted" | "rejected" | "edited";

interface CandidateVM {
  /** Klucz lokalny (np. uuid) */
  localId: string;
  /** Oryginał od AI */
  original: { front: string; back: string; source: "ai-full" };
  /** Aktualne wartości edytowane */
  front: string;
  back: string;
  /** Źródło wynikowe wysyłane do API */
  source: "ai-full" | "ai-edited";
  /** Decyzja użytkownika */
  decision: CandidateDecision;
  /** Walidacja pól */
  validation: {
    frontError?: string; // >200 lub pusty
    backError?: string; // >500 lub pusty
  };
  /** Flaga zmienionej treści */
  isDirty: boolean;
}

interface GenerationState {
  status: "idle" | "loading" | "error" | "completed";
  errorCode?: ApiErrorCode;
  message?: string;
  meta?: { generationId?: number; durationMs?: number; generatedCount?: number };
}

interface PaginationState {
  page: number;
  perPage: number;
  total: number;
}

interface TotalsSummary {
  accepted: number;
  rejected: number;
  edited: number; // akceptowane z source === "ai-edited"
}
```

## 6. Zarządzanie stanem

- **Store widoku** w `GenerateView` oparty o `useReducer` (unikamy zagnieżdżonych setState): przechowuje `sourceText`, `generation`, `candidates[]`, `pagination`, `totals`, `unsavedChanges`.
- **Selektory pochodne**: z `candidates[]` liczymy `totals`, filtrujemy stronę bieżącą.
- **Hooki niestandardowe**:
  - `useGeneration()` – kapsułuje wywołanie `POST /api/generations`, mapuje koperty `ApiSuccessResponse/ApiErrorResponse` i stany 429/503/504.
  - `useCandidates()` – akcje (accept/reject/edit/undo), walidacja pól, przekształcenie `ai-full`→`ai-edited` po zmianach.
  - `usePagination()` – podział lokalny na strony (domyślnie 30).
  - `useUnsavedChangesGuard()` – flaga `unsavedChanges`, obsługa `beforeunload` + modal.
  - `useKeyboardShortcuts()` – rejestracja skrótów (US‑022) z obsługą focus management.
  - `useApi()` – util do fetchy z JSON, nagłówkami JWT i dekodowaniem envelopów.
- **RWD i a11y**: przełącznik layoutu (cards/table) wg szerokości; ARIA live‑regions do błędów i ogłoszeń (FR‑18).

## 7. Integracja API

### 7.1. Generowanie kandydatów

- **Endpoint**: `POST /api/generations` (backend Astro). Limit: **5 req/min/user**; walidacja długości 1000–50000; whitelist modeli (`"gpt-4o-mini"`). Zwraca `ApiSuccessResponse<GenerationResponseDTO>` lub błąd 429/503/504. UI pokazuje status inline i retry.
- **Żądanie** (TS):

```ts
const body: CreateGenerationCommand = { source_text, model: "gpt-4o-mini" };
```

- **Odpowiedź**: odczyt `data.flashcards_candidates` i mapowanie do `CandidateVM` (generujemy `localId`, ustawiamy `decision:"pending"`).

### 7.2. Zbiorczy zapis fiszek

- **Endpoint**: `POST /api/flashcards`; tablica 1–100 kart; walidacja front/back 1–200/1–500. W razie >100 – **chunkujemy** po 100. Zwraca `ApiSuccessResponse<CreateFlashcardsResponseDTO>`.
- **Payload**: tylko kandydaci `decision==="accepted"`; `source: "ai-full"` lub `"ai-edited"`; `generation_id` z ostatniej generacji.
- **Po sukcesie**: toast „Zapisano X fiszek”, wyczyszczenie `candidates[]` i `unsavedChanges=false`.

### 7.3. Błędy i kody

- **ApiErrorResponse.error.code** – mapowanie na UI (np. `RATE_LIMIT_EXCEEDED`, `SERVICE_UNAVAILABLE`, `GATEWAY_TIMEOUT`, `TEXT_LENGTH_INVALID`, `VALIDATION_ERROR`).

## 8. Interakcje użytkownika (→ wynik)

- **Wklejenie tekstu** → licznik znaków, stan przycisku „Generuj”; poza zakresem pokazuje komunikat i blokuje (US‑005/US‑021).
- **Klik „Generuj”** → spinner/progress; po sukcesie lista kandydatów + podsumowanie (US‑006).
- **Accept** na pozycji → status „Accepted”, zwiększa licznik do zapisu; odwracalne (US‑007).
- **Edit inline** → walidacja live; po zmianie `source="ai-edited"`; można następnie Accept/Reject (US‑008).
- **Reject** → oznacza jako odrzucone/ukryte, odwracalne do czasu zapisu (US‑009).
- **„Zapisz X kart”** → `SaveSummaryModal` (US‑031) → `POST /api/flashcards` → toast + czyszczenie stanu (US‑010).
- **Nawigacja poza widok** z niezapisanymi → modal guard (US‑011).
- **Skróty klawiaturowe** → A/E/R/S/←/→/PgUp/PgDn, focus rings i ARIA labels (US‑022, FR‑18).

## 9. Warunki i walidacja (UI)

- **Źródło**: 1000–50000 znaków (blokada Generuj + komunikat).
- **Kandydat**: `front: 1–200`, `back: 1–500`; błędne pola blokują Accept i zapis; aria‑invalid + komunikat w `aria-describedby`.
- **Zapis zbiorczy**: X>0 zaakceptowanych; jeśli >100 → podział na partie; jeśli jakiekolwiek błędy w accepted → CTA nieaktywne.
- **A11y**: Announce na zmianę decyzji (live region), `aria-label` na przyciskach „Akceptuj tę fiszkę” itd. (FR‑18).

## 10. Obsługa błędów i przypadki brzegowe

- **429 Rate limit** (generacja): banner z tekstem „Przekroczono limit – spróbuj ponownie za chwilę”, przycisk Retry; opcjonalnie cooldown na UI (np. 60 s). backend: limit 5/min.
- **503 Service Unavailable**: banner „Usługa niedostępna”; Retry; log zdarzenia.
- **504 Gateway Timeout**: banner „Przekroczono czas generacji”; Retry.
- **400/VALIDATION_ERROR** przy zapisie: pokazuj inline przy danej karcie (front/back), scroll‑to‑first‑error.
- **Brak kandydatów po generacji**: stan pusty z sugestią skrócenia/zmiany tekstu.
- **Utrata połączenia**: lokalny stan pozostaje; zapis możliwy po odzyskaniu (wymóg niefunkcjonalny).
- **Konflikt focus/skrótów**: skróty aktywne poza polami edycji; w edycji działają standardowe skróty OS.

## 11. Kroki implementacji

1. **Szkielet strony** `src/pages/generate.astro` z wyspą `GenerateView` (React 19, TS5, Tailwind 4, shadcn/ui).
2. **Typy i utilsy**: zdefiniuj ViewModel‑e, `useApi()`, mapowanie `ApiSuccessResponse/ApiErrorResponse` i DTO z `types.ts`.
3. **SourceTextarea** z licznikiem i walidacją 1k–50k; połącz z `GenerateButton`.
4. **Integracja POST /api/generations** w `useGeneration()`; obsłuż 429/503/504 i retry; mapuj wynik do `candidates[]`.
5. **CandidatesList** (cards/table + RWD) z `CandidateItem` i edycją inline; walidacja live 1–200/1–500.
6. **KeyboardShortcuts** (US‑022) i focus management; `aria-label` na akcjach; live‑announcements.
7. **PaginationControls** (lokalna paginacja ~30/stronę).
8. **BulkSaveToolbar** (liczniki + CTA), **SaveSummaryModal** (US‑031) z liczeniem accepted/edited.
9. **Integracja POST /api/flashcards** z chunkowaniem do 100 kart; toast sukcesu i czyszczenie stanu.
10. **UnsavedChangesGuard** (US‑011): modal na nawigację + `beforeunload`.
11. **A11y/QA**: kontrasty, focus‑rings, etykiety ARIA, tab‑order, skróty; weryfikacja responsywności (≥360px).
12. **Testy**: jednostkowe hooków, integracyjne komponentów, E2E (Playwright): scenariusze US‑005…US‑011, US‑020, US‑022, US‑031 z walidacją.

---

**Stack referencyjny**: Astro 5 + React 19 + TypeScript 5 + Tailwind 4 + shadcn/ui (frontend); Supabase (backend, Postgres, auth); CI/CD: GitHub Actions; hosting: DigitalOcean.
