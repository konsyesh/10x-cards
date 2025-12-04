<!-- 36ccea30-f539-4e51-bf0a-c5780716811b 50b86a90-47bd-4788-ab82-4436f48094a1 -->
# API Endpoint Implementation Plan: Flashcards CRUD Endpoints

## 1. Przegląd punktu końcowego

Implementacja 4 endpointów REST API dla zarządzania flashcards:

- **GET /api/flashcards** - Lista flashcards z paginacją, filtrowaniem, sortowaniem i wyszukiwaniem
- **GET /api/flashcards/:flashcard_id** - Szczegóły pojedynczej flashcard
- **PATCH /api/flashcards/:flashcard_id** - Aktualizacja flashcard
- **DELETE /api/flashcards/:flashcard_id** - Usunięcie flashcard

Wszystkie endpointy wymagają autoryzacji JWT i zapewniają izolację danych per użytkownik (user_id).

## 2. Szczegóły żądania

### GET /api/flashcards

**Metoda HTTP**: `GET`

**Struktura URL**: `/api/flashcards`

**Query Parameters**:

- `page` (opcjonalny, default: 1): Numer strony (integer ≥ 1)
- `per_page` (opcjonalny, default: 20, max: 100): Liczba elementów na stronę (integer 1-100)
- `search` (opcjonalny): Pełnotekstowe wyszukiwanie w polach front/back (string)
- `collection_id` (opcjonalny): Filtrowanie po collection_id (integer > 0)
- `source` (opcjonalny): Filtrowanie po source - `"manual" | "ai-full" | "ai-edited"` (enum)
- `sort` (opcjonalny, default: `"created_at"`): Pole sortowania - `"created_at" | "updated_at" | "front"` (enum)
- `order` (opcjonalny, default: `"desc"`): Kierunek sortowania - `"asc" | "desc"` (enum)

**Request Body**: Brak

### GET /api/flashcards/:flashcard_id

**Metoda HTTP**: `GET`

**Struktura URL**: `/api/flashcards/[flashcard_id]` (dynamic route w Astro)

**Route Parameters**:

- `flashcard_id` (wymagany): ID flashcard (integer > 0)

**Query Parameters**: Brak

**Request Body**: Brak

### PATCH /api/flashcards/:flashcard_id

**Metoda HTTP**: `PATCH`

**Struktura URL**: `/api/flashcards/[flashcard_id]` (dynamic route w Astro)

**Route Parameters**:

- `flashcard_id` (wymagany): ID flashcard (integer > 0)

**Query Parameters**: Brak

**Request Body** (JSON):

```json
{
  "front": "Updated question",      // opcjonalny, 1-200 znaków
  "back": "Updated answer",         // opcjonalny, 1-500 znaków
  "collection_id": 3001             // opcjonalny, integer > 0 lub null
}
```

### DELETE /api/flashcards/:flashcard_id

**Metoda HTTP**: `DELETE`

**Struktura URL**: `/api/flashcards/[flashcard_id]` (dynamic route w Astro)

**Route Parameters**:

- `flashcard_id` (wymagany): ID flashcard (integer > 0)

**Query Parameters**: Brak

**Request Body**: Brak

## 3. Wykorzystywane typy

### DTOs (już istnieją w `src/types.ts`):

- `FlashcardDTO` - pojedyncza flashcard w odpowiedzi
- `FlashcardsListResponseDTO` - odpowiedź listy z paginacją
- `UpdateFlashcardResponseDTO` - odpowiedź po aktualizacji
- `DeleteResponseDTO` - odpowiedź po usunięciu
- `PaginationDTO` - metadane paginacji

### Command/Query Modele (do rozszerzenia w `src/types.ts`):

- `ListFlashcardsQuery` - parametry zapytania dla GET /flashcards (nowy typ)
- `UpdateFlashcardCommand` - już istnieje w `src/types.ts`

### Typy pomocnicze:

- `FlashcardSource` - enum: `"manual" | "ai-full" | "ai-edited"`
- `FlashcardRow` - surowy rekord z bazy (używany wewnętrznie w service)

## 4. Szczegóły odpowiedzi

### GET /api/flashcards (200 OK)

```json
{
  "flashcards": [
    {
      "id": 2001,
      "front": "What is photosynthesis?",
      "back": "Biological process converting light energy into chemical energy",
      "source": "ai-edited",
      "collection_id": 3001,
      "generation_id": 12345,
      "created_at": "2025-10-23T10:00:00Z",
      "updated_at": "2025-10-23T10:05:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 156,
    "total_pages": 8
  }
}
```

### GET /api/flashcards/:flashcard_id (200 OK)

```json
{
  "id": 2001,
  "front": "What is photosynthesis?",
  "back": "Biological process converting light energy into chemical energy",
  "source": "ai-edited",
  "collection_id": 3001,
  "generation_id": 12345,
  "created_at": "2025-10-23T10:00:00Z",
  "updated_at": "2025-10-23T10:05:00Z"
}
```

### PATCH /api/flashcards/:flashcard_id (200 OK)

```json
{
  "id": 2001,
  "front": "Updated question",
  "back": "Updated answer",
  "source": "ai-edited",
  "collection_id": null,
  "updated_at": "2025-10-23T10:10:00Z"
}
```

### DELETE /api/flashcards/:flashcard_id (200 OK)

```json
{
  "id": 2001,
  "message": "Flashcard successfully deleted"
}
```

## 5. Przepływ danych

### GET /api/flashcards

1. Weryfikacja autoryzacji (`locals.user`)
2. Parsowanie i walidacja query parameters (Zod schema)
3. Wywołanie `FlashcardService.listFlashcards(query)` z filtrowaniem po `user_id`
4. Supabase query z:

   - `.eq("user_id", userId)` - izolacja danych
   - `.ilike("front", `%${search}%`) `lub `.ilike("back", `%${search}%`)` - wyszukiwanie
   - `.eq("collection_id", collectionId)` - filtrowanie po kolekcji (jeśli podane)
   - `.eq("source", source)` - filtrowanie po źródle (jeśli podane)
   - `.order(sort, { ascending: order === "asc" })` - sortowanie
   - `.range((page - 1) * per_page, page * per_page - 1)` - paginacja

5. Obliczenie `total` i `total_pages` z osobnego count query
6. Mapowanie `FlashcardRow[]` → `FlashcardDTO[]`
7. Zwrócenie `FlashcardsListResponseDTO` z `successResponse()`

### GET /api/flashcards/:flashcard_id

1. Weryfikacja autoryzacji (`locals.user`)
2. Parsowanie `flashcard_id` z `params` (Astro dynamic route)
3. Walidacja `flashcard_id` (integer > 0)
4. Wywołanie `FlashcardService.getFlashcardById(flashcardId)` z filtrowaniem po `user_id`
5. Supabase query: `.eq("id", flashcardId).eq("user_id", userId).single()`
6. Jeśli nie znaleziono → rzucenie `flashcardErrors.creators.NotFound()`
7. Mapowanie `FlashcardRow` → `FlashcardDTO`
8. Zwrócenie `FlashcardDTO` z `successResponse()`

### PATCH /api/flashcards/:flashcard_id

1. Weryfikacja autoryzacji (`locals.user`)
2. Parsowanie `flashcard_id` z `params`
3. Walidacja `flashcard_id` (integer > 0)
4. Walidacja body z Zod schema (`UpdateFlashcardCommand`)
5. Jeśli `collection_id` podany → walidacja dostępu do kolekcji (`validateCollectionAccess`)
6. Wywołanie `FlashcardService.updateFlashcard(flashcardId, command)` z filtrowaniem po `user_id`
7. Supabase query: `.eq("id", flashcardId).eq("user_id", userId).update({...}).select().single()`
8. Jeśli nie znaleziono → rzucenie `flashcardErrors.creators.NotFound()`
9. Mapowanie `FlashcardRow` → `UpdateFlashcardResponseDTO`
10. Zwrócenie `UpdateFlashcardResponseDTO` z `successResponse()`

### DELETE /api/flashcards/:flashcard_id

1. Weryfikacja autoryzacji (`locals.user`)
2. Parsowanie `flashcard_id` z `params`
3. Walidacja `flashcard_id` (integer > 0)
4. Wywołanie `FlashcardService.deleteFlashcard(flashcardId)` z filtrowaniem po `user_id`
5. Supabase query: `.eq("id", flashcardId).eq("user_id", userId).delete().select().single()`
6. Jeśli nie znaleziono → rzucenie `flashcardErrors.creators.NotFound()`
7. Zwrócenie `DeleteResponseDTO` z `successResponse()`

## 6. Względy bezpieczeństwa

### Autoryzacja

- Wszystkie endpointy wymagają `locals.user` (JWT token weryfikowany w middleware)
- Jeśli `!locals.user` → rzucenie `authErrors.creators.Unauthorized({ detail: "Wymagana autoryzacja" })`

### Izolacja danych

- Wszystkie zapytania Supabase muszą zawierać `.eq("user_id", userId)`
- Użytkownik może operować tylko na swoich flashcards
- Jeśli flashcard nie istnieje lub należy do innego użytkownika → `404 Not Found` (nie ujawniamy istnienia cudzych zasobów)

### Walidacja danych wejściowych

- Query parameters: walidacja z Zod schema (typy, zakresy, enumy)
- Route parameters: parsowanie i walidacja `flashcard_id` (integer > 0)
- Request body: walidacja z Zod schema (`UpdateFlashcardCommand`)
- Długości pól: `front` (1-200), `back` (1-500) - zgodnie z DB constraints

### Walidacja referencji

- `collection_id` w PATCH: sprawdzenie czy kolekcja istnieje i należy do użytkownika (`validateCollectionAccess`)
- Jeśli kolekcja nie istnieje lub należy do innego użytkownika → `404 Not Found`

### Ochrona przed atakami

- SQL Injection: Supabase ORM automatycznie escapuje parametry
- XSS: dane zwracane jako JSON (Content-Type: application/json)
- Rate limiting: obsługiwane przez middleware (jeśli skonfigurowane)

## 7. Obsługa błędów

### Kody błędów i mapowanie na HTTP status:

| Błąd | Kod DomainError | HTTP Status | Scenariusz |

|------|----------------|-------------|------------|

| Nieautoryzowany dostęp | `auth/unauthorized` | 401 | Brak lub nieprawidłowy JWT token |

| Nieprawidłowe query params | `flashcard/validation-failed` | 400 | Nieprawidłowe wartości query parameters |

| Nieprawidłowe body | `flashcard/validation-failed` | 400 | Nieprawidłowe wartości w PATCH body |

| Nieprawidłowy flashcard_id | `flashcard/validation-failed` | 400 | flashcard_id nie jest integer > 0 |

| Flashcard nie znaleziona | `flashcard/not-found` | 404 | Flashcard nie istnieje lub należy do innego użytkownika |

| Kolekcja nie znaleziona | `flashcard/collection-not-found` | 404 | collection_id w PATCH nie istnieje |

| Brak dostępu do kolekcji | `flashcard/collection-access-denied` | 404 | collection_id należy do innego użytkownika |

| Błąd bazy danych | `flashcard/database-error` | 500 | Nieoczekiwany błąd Supabase |

### Obsługa błędów w kodzie:

- Wszystkie endpointy opakowane w `withProblemHandling()` - automatyczna konwersja DomainError → RFC 7807
- Service rzuca DomainError (nigdy nie zwraca Response)
- Endpoint nie łapie błędów - propaguje do `withProblemHandling`
- Supabase errors mapowane przez `fromSupabase()` na DomainError

## 8. Rozważania dotyczące wydajności

### Indeksy bazy danych (wymagane):

- `flashcards.user_id` - indeks dla izolacji danych per użytkownik
- `flashcards.collection_id` - indeks dla filtrowania po kolekcji
- `flashcards.source` - indeks dla filtrowania po źródle
- `flashcards.created_at`, `flashcards.updated_at` - indeksy dla sortowania
- Composite index: `(user_id, collection_id)` - dla częstych zapytań z oboma filtrami

### Optymalizacje zapytań:

- **GET /flashcards**: Użycie `.select()` z konkretnymi kolumnami (nie `*`)
- **Paginacja**: Limit `per_page` do 100 (zapobiega dużym wynikom)
- **Count query**: Osobne zapytanie `.count()` dla total (można cache'ować)
- **Full-text search**: Użycie `.ilike()` zamiast `.textSearch()` (prostsze, wystarczające dla MVP)

### Potencjalne wąskie gardła:

- Duże kolekcje flashcards (>1000) - paginacja ogranicza problem
- Full-text search bez indeksu GIN - może być wolne dla dużych zbiorów (do optymalizacji w przyszłości)
- Brak cache'owania - wszystkie zapytania idą do bazy (do rozważenia w przyszłości)

## 9. Etapy wdrożenia

### Faza 1: Przygotowanie typów i walidatorów (1-2h)

1. [ ] Rozszerzyć `src/types.ts` o `ListFlashcardsQuery` interface
2. [ ] Utworzyć `src/lib/http/http.validate-query.ts` - helper do walidacji query parameters z Zod
3. [ ] Utworzyć Zod schemas:

   - [ ] `listFlashcardsQuerySchema` - walidacja query params dla GET /flashcards
   - [ ] `updateFlashcardCommandSchema` - walidacja body dla PATCH (może już istnieć)
   - [ ] `flashcardIdParamSchema` - walidacja route param `flashcard_id`

### Faza 2: Rozszerzenie FlashcardService (2-3h)

4. [ ] Dodać metodę `listFlashcards(query: ListFlashcardsQuery): Promise<{ flashcards: FlashcardDTO[], pagination: PaginationDTO }>` w `FlashcardService`

   - [ ] Implementacja filtrowania po `user_id` (wymagane)
   - [ ] Implementacja filtrowania po `collection_id` (opcjonalne)
   - [ ] Implementacja filtrowania po `source` (opcjonalne)
   - [ ] Implementacja full-text search w `front`/`back` (opcjonalne)
   - [ ] Implementacja sortowania (`sort`, `order`)
   - [ ] Implementacja paginacji (`page`, `per_page`)
   - [ ] Obliczenie `total` i `total_pages` z count query
   - [ ] Mapowanie `FlashcardRow[]` → `FlashcardDTO[]`

5. [ ] Dodać metodę `getFlashcardById(id: number): Promise<FlashcardDTO>` w `FlashcardService`

   - [ ] Query z `.eq("user_id", userId).eq("id", id).single()`
   - [ ] Jeśli nie znaleziono → rzucenie `flashcardErrors.creators.NotFound()`
   - [ ] Mapowanie `FlashcardRow` → `FlashcardDTO`

6. [ ] Dodać metodę `updateFlashcard(id: number, command: UpdateFlashcardCommand): Promise<UpdateFlashcardResponseDTO>` w `FlashcardService`

   - [ ] Walidacja `collection_id` (jeśli podany) przez `validateCollectionAccess()`
   - [ ] Query z `.eq("user_id", userId).eq("id", id).update({...}).select().single()`
   - [ ] Jeśli nie znaleziono → rzucenie `flashcardErrors.creators.NotFound()`
   - [ ] Mapowanie `FlashcardRow` → `UpdateFlashcardResponseDTO`

7. [ ] Dodać metodę `deleteFlashcard(id: number): Promise<DeleteResponseDTO>` w `FlashcardService`

   - [ ] Query z `.eq("user_id", userId).eq("id", id).delete().select().single()`
   - [ ] Jeśli nie znaleziono → rzucenie `flashcardErrors.creators.NotFound()`
   - [ ] Zwrócenie `DeleteResponseDTO` z `id` i `message`

### Faza 3: Implementacja endpointów (2-3h)

8. [ ] Utworzyć `src/pages/api/flashcards/[flashcard_id].ts` dla dynamic route
9. [ ] Zaimplementować `GET /api/flashcards` w `src/pages/api/flashcards/index.ts`

   - [ ] Wrapper `withProblemHandling()`
   - [ ] Weryfikacja `locals.user` → `authErrors.creators.Unauthorized()` jeśli brak
   - [ ] Parsowanie query params z `new URL(request.url).searchParams`
   - [ ] Walidacja query params z `listFlashcardsQuerySchema`
   - [ ] Wywołanie `FlashcardService.listFlashcards(query)`
   - [ ] Zwrócenie `FlashcardsListResponseDTO` z `successResponse()`

10. [ ] Zaimplementować `GET /api/flashcards/:flashcard_id` w `src/pages/api/flashcards/[flashcard_id].ts`

    - [ ] Wrapper `withProblemHandling()`
    - [ ] Weryfikacja `locals.user` → `authErrors.creators.Unauthorized()` jeśli brak
    - [ ] Parsowanie `flashcard_id` z `params.flashcard_id`
    - [ ] Walidacja `flashcard_id` z `flashcardIdParamSchema`
    - [ ] Wywołanie `FlashcardService.getFlashcardById(flashcardId)`
    - [ ] Zwrócenie `FlashcardDTO` z `successResponse()`

11. [ ] Zaimplementować `PATCH /api/flashcards/:flashcard_id` w `src/pages/api/flashcards/[flashcard_id].ts`

    - [ ] Wrapper `withProblemHandling()`
    - [ ] Weryfikacja `locals.user` → `authErrors.creators.Unauthorized()` jeśli brak
    - [ ] Parsowanie `flashcard_id` z `params.flashcard_id`
    - [ ] Walidacja `flashcard_id` z `flashcardIdParamSchema`
    - [ ] Walidacja body z `updateFlashcardCommandSchema` przez `validateBody()`
    - [ ] Wywołanie `FlashcardService.updateFlashcard(flashcardId, command)`
    - [ ] Zwrócenie `UpdateFlashcardResponseDTO` z `successResponse()`

12. [ ] Zaimplementować `DELETE /api/flashcards/:flashcard_id` w `src/pages/api/flashcards/[flashcard_id].ts`

    - [ ] Wrapper `withProblemHandling()`
    - [ ] Weryfikacja `locals.user` → `authErrors.creators.Unauthorized()` jeśli brak
    - [ ] Parsowanie `flashcard_id` z `params.flashcard_id`
    - [ ] Walidacja `flashcard_id` z `flashcardIdParamSchema`
    - [ ] Wywołanie `FlashcardService.deleteFlashcard(flashcardId)`
    - [ ] Zwrócenie `DeleteResponseDTO` z `successResponse()`

### Faza 4: Rozszerzenie błędów (jeśli potrzebne) (0.5h)

13. [ ] Sprawdzić czy `flashcardErrors` zawiera wszystkie potrzebne kody błędów
14. [ ] Dodać brakujące kody błędów w `src/services/flashcard/flashcard.errors.ts` (jeśli potrzebne)

### Faza 5: Testy (2-3h)

15. [ ] Utworzyć testy jednostkowe dla `FlashcardService`:

    - [ ] `listFlashcards()` - różne kombinacje filtrów, sortowania, paginacji
    - [ ] `getFlashcardById()` - sukces i 404
    - [ ] `updateFlashcard()` - sukces, 404, walidacja collection_id
    - [ ] `deleteFlashcard()` - sukces i 404

16. [ ] Utworzyć testy integracyjne dla endpointów:

    - [ ] GET /flashcards - różne query params, paginacja, filtrowanie
    - [ ] GET /flashcards/:id - sukces i 404
    - [ ] PATCH /flashcards/:id - sukces, 404, walidacja
    - [ ] DELETE /flashcards/:id - sukces i 404
    - [ ] Wszystkie endpointy - test autoryzacji (401 bez tokena)

### Faza 6: Dokumentacja i code review (1h)

17. [ ] Zaktualizować dokumentację API (jeśli istnieje)
18. [ ] Code review - sprawdzenie zgodności z wzorcami projektu
19. [ ] Sprawdzenie linter errors i warnings

### Faza 7: Deployment (0.5h)

20. [ ] Weryfikacja działania na środowisku deweloperskim
21. [ ] Deployment na środowisko produkcyjne (jeśli zatwierdzone)

**Szacowany czas całkowity: 8-12 godzin**