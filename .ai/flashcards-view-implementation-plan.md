# Plan implementacji widoku Flashcards

## 1. Przegląd

Widok Flashcards umożliwia użytkownikom przeglądanie, wyszukiwanie, edytowanie i usuwanie własnych zapisanych fiszek. Główny cel to zapewnienie intuicyjnego interfejsu do zarządzania fiszkami z obsługą paginacji serwerowej, sortowania oraz modalnych formularzy do edycji i tworzenia nowych fiszek, zgodnie z wymaganiami FR-05, FR-06, FR-14 i FR-15.

## 2. Routing widoku

Widok powinien być dostępny pod ścieżką `/flashcards`.

## 3. Struktura komponentów

Główna strona Astro `FlashcardsPage` zawiera:
- `FlashcardsToolbar` dla wyszukiwania, sortowania i dodawania fiszki.
- `FlashcardsList` dla wyświetlania listy fiszek (tabela na desktopie, lista kart na mobilu).
- `FlashcardModal` dla tworzenia/edycji fiszki.
- `ConfirmModal` dla potwierdzeń usunięcia lub obsługi konfliktów edycji.
- Komponenty pomocnicze dla stanów ładowania i błędów.

Hierarchia:
```
FlashcardsPage
├── FlashcardsToolbar
├── FlashcardsList
│   ├── FlashcardItem (powtórzony)
├── FlashcardModal
├── ConfirmModal
└── LoadingSpinner/ErrorMessage
```

## 4. Szczegóły komponentów

### FlashcardsPage

- **Opis komponentu**: Główny komponent strony Astro, zarządza całym stanem widoku, ładowaniem danych z API i współrzędnymi między komponentami podrzędnymi.
- **Główne elementy**: Kontener główny z toolbar, listą, modalami i stanami ładowania/błędów.
- **Obsługiwane interakcje**: Ładowanie danych przy montowaniu, obsługa wyszukiwania, sortowania, paginacji, otwieranie modalów edycji/usunięcia/tworzenia, obsługa niezapisanych zmian (guard).
- **Obsługiwana walidacja**: Walidacja parametrów query (page, per_page, search, sort, order) zgodnie z API; wyświetlanie błędów walidacji w modalach.
- **Typy**: FlashcardsViewState, ListFlashcardsQuery, FlashcardsListResponseDTO, ApiErrorResponse.
- **Propsy**: Brak (jako strona główna).

### FlashcardsToolbar

- **Opis komponentu**: Pasek narzędzi z polem wyszukiwania, wyborem sortowania i przyciskiem dodawania nowej fiszki.
- **Główne elementy**: Input tekstowy dla wyszukiwania, Select dla sortowania, Button dla dodawania.
- **Obsługiwane interakcje**: onSearch (debounced), onSortChange, onAddClick.
- **Obsługiwana walidacja**: Długość tekstu wyszukiwania (maksymalnie 255 znaków, aby uniknąć nadmiernych zapytań).
- **Typy**: ListFlashcardsQuery (częściowo).
- **Propsy**: onSearch: (search: string) => void, onSortChange: (sort: string, order: 'asc' | 'desc') => void, onAdd: () => void.

### FlashcardsList

- **Opis komponentu**: Kontener dla listy fiszek, obsługuje responsywność (tabela/desktop, lista/mobile).
- **Główne elementy**: Tabela z nagłówkami lub lista kart, każdy element to FlashcardItem.
- **Obsługiwane interakcje**: onEdit, onDelete dla każdego elementu.
- **Obsługiwana walidacja**: Brak bezpośredniej walidacji.
- **Typy**: FlashcardListVM[], PaginationDTO.
- **Propsy**: flashcards: FlashcardListVM[], onEdit: (id: number) => void, onDelete: (id: number) => void.

### FlashcardItem

- **Opis komponentu**: Pojedynczy element listy fiszki, wyświetla front, back (skrócone), źródło, updated_at.
- **Główne elementy**: Tekst front/back z ellipsis, badge źródła, data aktualizacji, przyciski edycji/usunięcia.
- **Obsługiwane interakcje**: onEditClick, onDeleteClick.
- **Obsługiwana walidacja**: Brak.
- **Typy**: FlashcardListVM.
- **Propsy**: flashcard: FlashcardListVM, onEdit: () => void, onDelete: () => void.

### FlashcardModal

- **Opis komponentu**: Modal dla tworzenia lub edycji fiszki, zawiera pola tekstowe z walidacją natychmiastową.
- **Główne elementy**: Textarea dla front/back, przyciski Save/Cancel, opcjonalne opcje dla konfliktów 409.
- **Obsługiwane interakcje**: onSave, onCancel, onConflictResolve (odśwież/nadpisz).
- **Obsługiwana walidacja**: front: 1-200 znaków, back: 1-500 znaków, natychmiastowa walidacja przy zmianie; błędy wyświetlane pod polami.
- **Typy**: FlashcardListVM, UpdateFlashcardCommand, ApiErrorResponse.
- **Propsy**: isOpen: boolean, mode: 'create' | 'edit', flashcard?: FlashcardListVM, onSave: (data: UpdateFlashcardCommand) => void, onCancel: () => void, onConflict?: (action: 'refresh' | 'overwrite') => void.

### ConfirmModal

- **Opis komponentu**: Modal potwierdzenia dla usunięcia lub decyzji w konflikcie edycji.
- **Główne elementy**: Tekst potwierdzenia, przyciski Confirm/Cancel lub opcje dla konfliktu.
- **Obsługiwane interakcje**: onConfirm, onCancel.
- **Obsługiwana walidacja**: Brak.
- **Typy**: Brak specyficznych.
- **Propsy**: isOpen: boolean, type: 'delete' | 'conflict', message: string, onConfirm: () => void, onCancel: () => void.

## 5. Typy

Wymagane typy obejmują istniejące DTO z types.ts: FlashcardDTO, ListFlashcardsQuery, FlashcardsListResponseDTO, UpdateFlashcardCommand, DeleteResponseDTO, ApiSuccessResponse, ApiErrorResponse.

Nowe typy ViewModel:
- **FlashcardListVM**: Rozszerza FlashcardDTO o pola dla UI: isEditing: boolean (czy w edycji), validationErrors: { front?: string, back?: string } (błędy walidacji). Pola: id: number, front: string, back: string, source: FlashcardSource, collection_id: number | null, generation_id: number | null, created_at: string, updated_at: string, isEditing: boolean, validationErrors: object.
- **FlashcardsViewState**: Stan całego widoku: flashcards: FlashcardListVM[], pagination: PaginationDTO, loading: boolean, error: ApiErrorResponse | null, search: string, sort: 'created_at' | 'updated_at' | 'front', order: 'asc' | 'desc', selectedFlashcard: FlashcardListVM | null, modalType: 'create' | 'edit' | 'delete' | 'conflict' | null, showModal: boolean.

## 6. Zarządzanie stanem

Stan zarządzany jest za pomocą useState dla FlashcardsViewState w FlashcardsPage. Dla wywołań API używany jest custom hook useFlashcardsList, który obsługuje ładowanie, wyszukiwanie (z debounce), sortowanie i paginację. Hook używa useEffect dla inicjalnego ładowania i useCallback dla funkcji API. Stan niezapisanych zmian śledzony w modalu poprzez isDirty flag.

## 7. Integracja API

Integracja poprzez custom hook useFlashcardsList wywołujący funkcje z api wrappera (np. api<T>). Typy:
- GET /flashcards: Żądanie ListFlashcardsQuery, odpowiedź FlashcardsListResponseDTO.
- GET /flashcards/:id: Żądanie number (id), odpowiedź FlashcardDTO.
- PATCH /flashcards/:id: Żądanie UpdateFlashcardCommand, odpowiedź UpdateFlashcardResponseDTO.
- DELETE /flashcards/:id: Żądanie number (id), odpowiedź DeleteResponseDTO.
- POST /flashcards: Żądanie CreateFlashcardsCommand (dla pojedynczej), odpowiedź CreateFlashcardsResponseDTO.

Obsługa błędów poprzez try-catch w hooku, mapowanie na ApiErrorResponse.

## 8. Interakcje użytkownika

- **Wyszukiwanie**: Użytkownik wpisuje tekst w polu wyszukiwania → debounced wywołanie API z search param → aktualizacja listy fiszek.
- **Sortowanie**: Wybór opcji sortowania → wywołanie API z sort/order → reorder listy.
- **Dodanie fiszki**: Kliknięcie "Dodaj" → otwarcie FlashcardModal w trybie create → wypełnienie pól → zapis → POST /flashcards → dodanie do listy.
- **Edycja fiszki**: Kliknięcie "Edytuj" na elemencie → otwarcie FlashcardModal w trybie edit z danymi → zmiana pól → zapis → PATCH /flashcards/:id → aktualizacja listy; przy konflikcie 409 → modal opcji (odśwież/nadpisz).
- **Usuwanie fiszki**: Kliknięcie "Usuń" → otwarcie ConfirmModal → potwierdzenie → DELETE /flashcards/:id → usunięcie z listy.
- **Paginacja**: Kliknięcie strzałek/stron → wywołanie API z nową page → aktualizacja listy.
- **Guard niezapisanych zmian**: Próba zamknięcia modala z zmianami → modal potwierdzenia (Zapisz/Odrzuć/Anuluj).

## 9. Warunki i walidacja

Warunki weryfikowane na poziomie komponentów:
- **Front/Back lengths**: W FlashcardModal, natychmiastowa walidacja przy zmianie; front 1-200, back 1-500; błędy wyświetlają się pod polami, blokując zapis.
- **Query params**: W FlashcardsPage, walidacja via Zod przed API call; invalid (np. per_page >100) → błąd stanu.
- **Auth**: Sprawdzane w API, 401 → przekierowanie do logowania.
- **Konflikty**: 409 przy PATCH → modal opcji, użytkownik wybiera akcję.
Wpływ na UI: Pola z błędami wyróżnione czerwono, przyciski zapisów disabled przy błędach, komunikaty błędów w toastach/modalach.

## 10. Obsługa błędów

Błędy API obsługiwane przez withProblemHandling w endpointach, mapowane na ApiErrorResponse. W UI: Toast dla ogólnych błędów, modal dla walidacji/konfliktów, przekierowanie dla 401. Scenariusze: 400 → błędy walidacji w modalu; 404 → komunikat "Fiszka nie znaleziona"; 409 → modal konfliktu; 503 → przycisk ponowienia; network errors → offline handling z retry.

## 11. Kroki implementacji

1. Utwórz stronę Astro `/flashcards.astro` z podstawowym layoutem.
2. Zdefiniuj nowe typy ViewModel w types.ts.
3. Zaimplementuj custom hook useFlashcardsList dla wywołań API.
4. Stwórz komponent FlashcardsToolbar z wyszukiwaniem, sortowaniem i przyciskiem dodaj.
5. Zaimplementuj FlashcardItem dla pojedynczego elementu listy.
6. Stwórz FlashcardsList jako kontener responsywny dla elementów.
7. Zbuduj FlashcardModal z walidacją pól i obsługą konfliktów.
8. Dodaj ConfirmModal dla potwierdzeń.
9. Zintegruj wszystkie komponenty w FlashcardsPage z zarządzaniem stanem i interakcjami.
10. Dodaj obsługę błędów, guard niezapisanych zmian i testy integracyjne.
