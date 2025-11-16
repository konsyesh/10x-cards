# API Endpoint Implementation Plan: POST /flashcards

## 1. Przegląd punktu końcowego

### Cel i funkcjonalność

Endpoint `POST /flashcards` umożliwia tworzenie fiszek w dwóch głównych scenariuszach:

1. **Scenariusz ręczny**: Użytkownik tworzy pojedynczą lub kilka fiszek ręcznie (bez AI)
2. **Scenariusz zbiorczy**: Aplikacja zapisuje fiszki wygenerowane lub edytowane przez AI w jednej operacji

Endpoint obsługuje **ujednoliconą strukturę żądania** (zawsze tablica, niezależnie od liczby fiszek) i zwraca spójną odpowiedź z metadanymi całej operacji.

### Wymagania funkcjonalne

- Walidacja danych wejściowych (długości, typy, enumeracje)
- Sprawdzenie praw dostępu do referencji (collection_id, generation_id)
- Zapis wielu fiszek w transakcji (atomowo)
- Aktualizacja liczników akceptacji w tabeli `generations` (jeśli dotyczy)
- Rejestracja zdarzeń dla analytics (FR-10)
- Integracja z scheduler'em spaced repetition (FR-08)
- Obsługa błędów z odpowiednim mapowaniem kodów stanu

---

## 2. Szczegóły żądania

### Metoda HTTP

`POST`

### Struktura URL

```
POST /api/flashcards
```

### Autentykacja

- **Typ**: JWT Bearer Token (wymagane)
- **Źródło**: Header `Authorization: Bearer {token}`
- **Pobieranie user_id**: Z kontekstu Astro middleware (context.locals.supabase)

### Parametry

#### Wymagane:

- `flashcards` (tablica obiektów)
  - `front` (string): Pytanie/prompt karty, 1-200 znaków
  - `back` (string): Odpowiedź/wyjaśnienie karty, 1-500 znaków
  - `source` (enum): Jedno z: `manual`, `ai-full`, `ai-edited`

#### Opcjonalne:

- `flashcards[].generation_id` (number | null): ID sesji generowania (sprawdzenie referencji)
- `collection_id` (number | null): ID kolekcji docelowej (sprawdzenie prawa dostępu)

### Request Body - Przykład 1 (ręczne)

```json
{
  "flashcards": [
    {
      "front": "Co to jest fotosynteza?",
      "back": "Proces biologiczny zamieniający energię światła na energię chemiczną",
      "source": "manual",
      "generation_id": null
    }
  ],
  "collection_id": null
}
```

### Request Body - Przykład 2 (zbiorczy AI)

```json
{
  "flashcards": [
    {
      "front": "What is photosynthesis?",
      "back": "Biological process converting light energy into chemical energy",
      "source": "ai-full",
      "generation_id": 12345
    },
    {
      "front": "Edited plant types",
      "back": "1. Flowering plants 2. Ferns 3. Mosses (edited)",
      "source": "ai-edited",
      "generation_id": 12345
    }
  ],
  "collection_id": null
}
```

---

## 3. Wykorzystywane typy

### Istniejące (do użytku)

```typescript
// DTOs
export type FlashcardDTO = Tables<"flashcards">;
export type FlashcardSource = "manual" | "ai-full" | "ai-edited";

// Command Modele (już zdefiniowane w src/types.ts)
export interface CreateFlashcardItemCommand {
  front: string;
  back: string;
  source: FlashcardSource;
  generation_id?: number | null;
}

export interface CreateFlashcardsCommand {
  flashcards: CreateFlashcardItemCommand[];
  collection_id: number | null;
}

// Response
export interface CreateFlashcardsResponseDTO {
  saved_count: number;
  flashcards: FlashcardDTO[];
  collection_id: number | null;
  message: string;
}
```

### Do utworzenia

#### 1. Flashcards Validator (`src/lib/validators/flashcards.validator.ts`)

```typescript
export interface CreateFlashcardsValidationResult {
  success: boolean;
  data?: CreateFlashcardsCommand;
  errors?: ValidationErrorDetail[];
}

export function validateCreateFlashcardsCommand(data: unknown): CreateFlashcardsValidationResult {
  // Implementacja Zod schema z walidacją:
  // - flashcards: Array min 1, max N (uniemożliwić DoS)
  // - front: string, 1-200 znaków
  // - back: string, 1-500 znaków
  // - source: enum('manual', 'ai-full', 'ai-edited')
  // - generation_id: optional, number | null
  // - collection_id: optional, number | null
}
```

#### 2. Custom Error Types (`src/lib/errors/flashcard.errors.ts`)

```typescript
export class FlashcardValidationError extends Error {
  constructor(
    public field: string,
    message: string
  ) {
    super(message);
    this.name = "FlashcardValidationError";
  }
}

export class GenerationNotFoundError extends Error {
  constructor(generationId: number) {
    super(`Generation with ID ${generationId} not found`);
    this.name = "GenerationNotFoundError";
  }
}

export class CollectionAccessError extends Error {
  constructor() {
    super("You do not have access to this collection");
    this.name = "CollectionAccessError";
  }
}

export class SchedulerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SchedulerError";
  }
}
```

---

## 4. Szczegóły odpowiedzi

### Kod stanu sukcesu

`201 Created`

### Response Body (sukces)

```json
{
  "saved_count": 2,
  "flashcards": [
    {
      "id": 2001,
      "front": "What is photosynthesis?",
      "back": "Biological process converting light energy into chemical energy",
      "source": "ai-full",
      "generation_id": 12345,
      "collection_id": null,
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "created_at": "2025-10-23T10:00:00Z",
      "updated_at": "2025-10-23T10:00:00Z"
    },
    {
      "id": 2002,
      "front": "Edited plant types",
      "back": "1. Flowering plants 2. Ferns 3. Mosses (edited)",
      "source": "ai-edited",
      "generation_id": 12345,
      "collection_id": null,
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "created_at": "2025-10-23T10:00:01Z",
      "updated_at": "2025-10-23T10:00:01Z"
    }
  ],
  "collection_id": null,
  "message": "2 flashcards successfully saved"
}
```

### Kody błędów

| Kod stanu | Scenariusz                 | Details                                                                                              |
| --------- | -------------------------- | ---------------------------------------------------------------------------------------------------- |
| `400`     | Pusta tablica `flashcards` | `{ code: "VALIDATION_ERROR", message: "flashcards array must have at least 1 item" }`                |
| `400`     | Pole `front` poza limitem  | `{ code: "FRONT_LENGTH_INVALID", message: "front must be between 1 and 200 characters" }`            |
| `400`     | Pole `back` poza limitem   | `{ code: "BACK_LENGTH_INVALID", message: "back must be between 1 and 500 characters" }`              |
| `400`     | Zła wartość `source`       | `{ code: "VALIDATION_ERROR", message: "source must be one of: manual, ai-full, ai-edited" }`         |
| `400`     | DoS - zbyt duża tablica    | `{ code: "VALIDATION_ERROR", message: "flashcards array exceeds maximum size of 100 items" }`        |
| `401`     | Brak autoryzacji           | `{ code: "UNAUTHORIZED", message: "Authentication required" }`                                       |
| `403`     | Dostęp do cudzej kolekcji  | `{ code: "FORBIDDEN", message: "You do not have access to this collection" }`                        |
| `404`     | Kolekcja nie istnieje      | `{ code: "RESOURCE_NOT_FOUND", message: "Collection with ID {id} not found" }`                       |
| `404`     | Generation nie istnieje    | `{ code: "RESOURCE_NOT_FOUND", message: "Generation with ID {id} not found or already closed" }`     |
| `409`     | Generation już zamknięty   | `{ code: "CONFLICT", message: "Cannot add more flashcards to a closed generation session" }`         |
| `503`     | Scheduler niedostępny      | `{ code: "SERVICE_UNAVAILABLE", message: "Spaced repetition scheduler is temporarily unavailable" }` |

---

## 5. Przepływ danych

### Sekwencja operacji

```
1. Otrzymanie żądania POST /flashcards
   ↓
2. Uwierzytelnienie (JWT middleware)
   ↓
3. Parsowanie JSON body
   ↓
4. Walidacja struktury Zod (types, lengths, enums)
   ↓
5. [GUARD] Jeśli generation_id podany → sprawdzenie czy należy do użytkownika
   ↓
6. [GUARD] Jeśli collection_id podany → sprawdzenie czy należy do użytkownika
   ↓
7. Początek transakcji Supabase
   ↓
8. Zapis wielu fiszek do tabeli `flashcards` (batch insert)
   ↓
9. [Warunkowe] Aktualizacja liczników w `generations`:
   - Jeśli SOURCE = 'ai-full' → inkrementuj accepted_unedited_count
   - Jeśli SOURCE = 'ai-edited' → inkrementuj accepted_edited_count
   ↓
10. [Warunkowe] Wywołanie scheduler API:
    - Dla każdej fiszki zarejestrować w spaced repetition (FR-08)
    ↓
11. [Warunkowe] Zalogowanie do analytics:
    - Typ zdarzenia: "flashcard_created"
    - Metadane: source, user_id, generation_id, batch_size
    ↓
12. Commit transakcji
    ↓
13. Zwrócenie 201 Created + pełne dane zapisanych fiszek
```

### Interakcje z zewnętrznymi systemami

1. **Supabase (baza danych)**
   - Odczyt z `generations` (sprawdzenie referencji)
   - Odczyt z `collections` (sprawdzenie dostępu i referencji)
   - Zapis do `flashcards` (batch)
   - Update `generations.accepted_unedited_count` i `accepted_edited_count`

2. **Scheduler Service** (do zaimplementowania na późniejszym etapie)
   - Rejestracja każdej fiszki w systemie spaced repetition
   - API endpoint (TBD): POST /api/scheduler/register-flashcards

3. **Analytics Service** (do zaimplementowania na późniejszym etapie)
   - Logowanie zdarzenia "flashcard_created"
   - Payload: user_id, generation_id, batch_size, source_types

---

## 6. Względy bezpieczeństwa

### Autentykacja

- **JWT Token**: Sprawdzenie obecności i ważności tokenu w middleware
- **User ID**: Pobranie z `context.locals.user` (ustawiane przez middleware Astro)
- **Weryfikacja**: Supabase SDK automatycznie weryfikuje token

### Autoryzacja

- **Row Level Security (RLS)**: Supabase ma wbudowane RLS polityki na tabelach
  - `flashcards` - można wstawić tylko dla siebie (`auth.uid() = user_id`)
  - `collections` - można referencjonować tylko własne
  - `generations` - można referencjonować tylko własne

- **Walidacja po stronie aplikacji** (defense-in-depth):

  ```typescript
  // Przed zapisem sprawdzić:
  if (collection_id) {
    const collection = await supabase
      .from("collections")
      .select("id")
      .eq("id", collection_id)
      .eq("user_id", userId)
      .single();

    if (!collection.data) throw new CollectionAccessError();
  }
  ```

### Walidacja danych

- **Whitelist pól**: Zod schema precyzyjnie definiuje akceptowane pola
- **Długość string'ów**: Wbudowane w Zod i DB constraints
- **Enum validation**: `source` musi być jedną z: `manual`, `ai-full`, `ai-edited`
- **Type checking**: TypeScript na poziomie kompilacji

### Ochrona przed DoS

- **Limit rozmiaru tablicy**: Maksymalnie 100 fiszek na żądanie
- **Timeout**: Ustawić timeout dla całej operacji (np. 30 sekund)
- **Rate limiting**: (opcjonalne dla MVP, zaimplementować w fazie 2)

### Logi bezpieczeństwa

- **Logowanie prób dostępu**: Gdziekolwiek zgłaszany `403 Forbidden` lub `401 Unauthorized`
- **Monitoring błędów**: Śledzenie anomalii w `generation_error_logs`

---

## 7. Obsługa błędów

### Strategia ogólna

- **Early returns**: Guard clause'y na początku funkcji
- **Custom error types**: Dedykowane klasy błędów dla każdego scenariusza
- **Mapowanie na kody HTTP**: Konsistentne i przewidywalne

### Scenariusze błędów i obsługa

#### 1. Błędy walidacji (400 Bad Request)

```typescript
try {
  const validationResult = validateCreateFlashcardsCommand(body);

  if (!validationResult.success) {
    return new Response(
      JSON.stringify({
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: validationResult.errors,
        },
        meta: { timestamp: new Date().toISOString(), status: "error" },
      }),
      { status: 400 }
    );
  }
} catch (error) {
  // Mapowanie błędów walidacji na 400
}
```

#### 2. Błędy referencji (404 Not Found)

```typescript
// Jeśli generation_id podany
if (command.flashcards.some((f) => f.generation_id)) {
  const generationIds = [...new Set(command.flashcards.map((f) => f.generation_id).filter(Boolean))];

  for (const genId of generationIds) {
    const generation = await supabase.from("generations").select("id, user_id").eq("id", genId).single();

    if (!generation.data) {
      throw new GenerationNotFoundError(genId);
    }

    if (generation.data.user_id !== userId) {
      throw new GenerationNotFoundError(genId); // 404 zamiast 403 dla bezpieczeństwa
    }
  }
}
```

#### 3. Błędy dostępu (403 Forbidden)

```typescript
if (command.collection_id) {
  const collection = await supabase.from("collections").select("id, user_id").eq("id", command.collection_id).single();

  if (!collection.data || collection.data.user_id !== userId) {
    throw new CollectionAccessError();
  }
}
```

#### 4. Błędy scheduler'a (503 Service Unavailable)

```typescript
try {
  await schedulerService.registerFlashcards(savedFlashcards);
} catch (error) {
  // Loguj błąd, ale nie failuj całą operację
  console.error("[Flashcards API] Scheduler error:", error);

  // Transakcja już committed, fiszki zapisane
  // Scheduler spróbuje ponownie lub manual retry będzie możliwy

  // Jeśli scheduler mission-critical → throw 503
  if (schedulerService.isCritical()) {
    throw new SchedulerError("Spaced repetition registration failed");
  }
}
```

#### 5. Błędy transakcji (500 Internal Server Error)

```typescript
const { error: dbError } = await supabase.from("flashcards").insert(flashcardsToInsert).select();

if (dbError) {
  console.error("[Flashcards API] Database error:", dbError);
  throw new Error("INTERNAL_SERVER_ERROR");
}
```

### Response format dla błędów

```json
{
  "error": {
    "code": "FRONT_LENGTH_INVALID",
    "message": "front must be between 1 and 200 characters",
    "details": [
      {
        "field": "flashcards[0].front",
        "message": "Length exceeded: 201 characters provided"
      }
    ]
  },
  "meta": {
    "timestamp": "2025-10-23T10:00:00Z",
    "status": "error"
  }
}
```

---

## 8. Rozważania dotyczące wydajności

### Wąskie gardła

1. **Batch insert**: Wiele wstawień (N fiszek) może być wolne
   - **Rozwiązanie**: Użyć `insert()` z tablicą zamiast loop'u
   - **Optymalizacja**: Supabase obsługuje batch efficiently

2. **Aktualizacja generations**: Dodatkowe UPDATE po INSERT
   - **Rozwiązanie**: Użyć `UPSERT` lub UPDATE ... SET ... WHERE id IN (...)
   - **Optymalizacja**: Zagruppować aktualizacje wg generation_id

3. **Sprawdzenie referencji**: N + 1 query problem
   - **Rozwiązanie**: Użyć `IN` clause do batch check'u
   - **Optymalizacja**: `SELECT id WHERE id IN (?, ?, ...)`

4. **Scheduler API call**: Blokujący HTTP request
   - **Rozwiązanie**: Asynchriczny call, ale czekaj na response
   - **Optymalizacja**: Zmienne timeout'y, retry strategy

### Strategie optymalizacji

#### 1. Batch walidacja

```typescript
// Zamiast tego:
for (const f of flashcards) {
  await validateFlashcard(f);
}

// Zrób to:
const validationErrors = flashcards.map(validateFlashcard);
const hasErrors = validationErrors.some((e) => e);
```

#### 2. Deduplikacja referencji

```typescript
const uniqueGenerationIds = [...new Set(flashcards.map((f) => f.generation_id).filter(Boolean))];

// Sprawdzenie wszystkich naraz
const { data: generations } = await supabase.from("generations").select("id").in("id", uniqueGenerationIds);
```

#### 3. Batch update generations

```typescript
const generationUpdates = flashcards.reduce(
  (acc, f) => {
    if (!f.generation_id) return acc;

    const key = `${f.generation_id}_${f.source}`;
    acc[key] = (acc[key] || 0) + 1;

    return acc;
  },
  {} as Record<string, number>
);

// Pojedyncze UPDATE dla każdej kombinacji generation_id + source
for (const [key, count] of Object.entries(generationUpdates)) {
  const [genId, source] = key.split("_");
  const column = source === "ai-full" ? "accepted_unedited_count" : "accepted_edited_count";

  await supabase
    .from("generations")
    .update({ [column]: supabase.raw(`${column} + ${count}`) })
    .eq("id", parseInt(genId));
}
```

### Indexes w bazie

(Już istniejące, sprawdzić w migracji)

```sql
create index flashcards_user_id_idx on flashcards(user_id);
create index flashcards_generation_id_idx on flashcards(generation_id);
create index flashcards_search_front_idx on flashcards(lower(front));
create index flashcards_search_back_idx on flashcards(lower(back));
```

---

## 9. Kroki implementacji

### Faza 1: Przygotowanie (1-2 godziny)

1. **Utwórz validator** (`src/lib/validators/flashcards.validator.ts`)
   - Definicja Zod schema
   - Testy walidacji edge case'ów (puste, za długie, zły enum)

2. **Utwórz custom error types** (`src/lib/errors/flashcard.errors.ts`)
   - Hierarchia błędów
   - Mapowanie na kody HTTP

3. **Rozszerzenie types.ts** (jeśli potrzebne)
   - Dodaj interfejsy dla validation results
   - Dodaj ApiErrorResponse je nie istnieje

### Faza 2: Serwis logiki biznesowej (2-3 godziny)

4. **Utwórz FlashcardService** (`src/lib/services/flashcard.service.ts`)
   - Metoda: `createFlashcards(userId, command)`
   - Walidacja logiki biznesowej (referencje, dostęp)
   - Batch insert
   - Aktualizacja generations

5. **Utwórz SchedulerService** (`src/lib/services/scheduler.service.ts`) - MOCK na MVP
   - Metoda: `registerFlashcards(flashcards)`
   - Zwróć success/error

6. **Utwórz AnalyticsService** (`src/lib/services/analytics.service.ts`) - MOCK na MVP
   - Metoda: `logFlashcardCreated(event)`
   - Zwróć success/error

### Faza 3: Implementacja endpointu (2-3 godziny)

7. **Utwórz endpoint** (`src/pages/api/flashcards.ts`)
   - Handler POST
   - Middleware: auth check
   - Parsowanie body
   - Walidacja Zod
   - Wywołanie FlashcardService
   - Obsługa błędów
   - Formatowanie response

8. **Zinteguj Supabase context**
   - Pobranie user_id z context.locals
   - Użycie SupabaseClient z context.locals.supabase

### Faza 4: Testy i refinement (2-3 godziny)

9. **Testy manualne**
   - Test sukcesu (ręczne + AI)
   - Test walidacji (puste, za długie, zły source)
   - Test błędów (403, 404, 503)

10. **Linting i code review**
    - Uruchomić ESLint
    - TypeScript check
    - Code style alignment

11. **Dokumentacja**
    - Dodać JSDoc do serwisów
    - Zaktualizować README

### Estymacja całkowita: 7-11 godzin

---

## 10. Mapa implementacji – plik po pliku

### src/lib/validators/flashcards.validator.ts (NEW)

```typescript
import { z } from "zod";
import type { ValidationErrorDetail } from "../../types";

const createFlashcardItemSchema = z.object({
  front: z.string().min(1, "front must have at least 1 character").max(200, "front must not exceed 200 characters"),
  back: z.string().min(1, "back must have at least 1 character").max(500, "back must not exceed 500 characters"),
  source: z.enum(["manual", "ai-full", "ai-edited"], {
    errorMap: () => ({ message: "source must be one of: manual, ai-full, ai-edited" }),
  }),
  generation_id: z.number().int().positive().optional().nullable(),
});

export const createFlashcardsCommandSchema = z.object({
  flashcards: z
    .array(createFlashcardItemSchema)
    .min(1, "flashcards array must have at least 1 item")
    .max(100, "flashcards array exceeds maximum size of 100 items"),
  collection_id: z.number().int().positive().optional().nullable(),
});

export function validateCreateFlashcardsCommand(data: unknown) {
  const result = createFlashcardsCommandSchema.safeParse(data);

  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      field: issue.path.join(".") || "unknown",
      message: issue.message,
    }));

    return { success: false, errors };
  }

  return { success: true, data: result.data };
}
```

### src/lib/errors/flashcard.errors.ts (NEW)

```typescript
export class FlashcardValidationError extends Error {
  constructor(
    public field: string,
    message: string
  ) {
    super(message);
    this.name = "FlashcardValidationError";
  }
}

export class GenerationNotFoundError extends Error {
  constructor(generationId: number) {
    super(`Generation ${generationId} not found`);
    this.name = "GenerationNotFoundError";
  }
}

export class GenerationClosedError extends Error {
  constructor(generationId: number) {
    super(`Generation ${generationId} is already closed`);
    this.name = "GenerationClosedError";
  }
}

export class CollectionNotFoundError extends Error {
  constructor(collectionId: number) {
    super(`Collection ${collectionId} not found`);
    this.name = "CollectionNotFoundError";
  }
}

export class CollectionAccessError extends Error {
  constructor() {
    super("Access denied to this collection");
    this.name = "CollectionAccessError";
  }
}

export class SchedulerError extends Error {
  constructor(message: string = "Scheduler service unavailable") {
    super(message);
    this.name = "SchedulerError";
  }
}
```

### src/lib/services/flashcard.service.ts (NEW)

```typescript
import type { SupabaseClient } from "../../db/supabase.client";
import type { CreateFlashcardsCommand, FlashcardDTO } from "../../types";
import {
  GenerationNotFoundError,
  GenerationClosedError,
  CollectionNotFoundError,
  CollectionAccessError,
} from "../errors/flashcard.errors";

export class FlashcardService {
  constructor(
    private supabase: SupabaseClient,
    private userId: string
  ) {}

  async createFlashcards(command: CreateFlashcardsCommand): Promise<FlashcardDTO[]> {
    // Guard: Jeśli generation_id podany, sprawdzić referencje
    if (command.flashcards.some((f) => f.generation_id)) {
      await this.validateGenerationReferences(command.flashcards);
    }

    // Guard: Jeśli collection_id podany, sprawdzić dostęp
    if (command.collection_id) {
      await this.validateCollectionAccess(command.collection_id);
    }

    // Przygotowanie danych do wstawienia
    const flashcardsToInsert = command.flashcards.map((f) => ({
      front: f.front,
      back: f.back,
      source: f.source,
      generation_id: f.generation_id ?? null,
      collection_id: command.collection_id ?? null,
      user_id: this.userId,
    }));

    // Batch insert
    const { data: savedFlashcards, error: insertError } = await this.supabase
      .from("flashcards")
      .insert(flashcardsToInsert)
      .select();

    if (insertError || !savedFlashcards) {
      throw new Error(`Failed to save flashcards: ${insertError?.message}`);
    }

    // Warunkowa aktualizacja generations (liczniki akceptacji)
    await this.updateGenerationMetrics(command.flashcards);

    return savedFlashcards;
  }

  private async validateGenerationReferences(flashcards: any[]): Promise<void> {
    const generationIds = [...new Set(flashcards.map((f) => f.generation_id).filter(Boolean))];

    if (generationIds.length === 0) return;

    const { data, error } = await this.supabase.from("generations").select("id, user_id").in("id", generationIds);

    if (error) throw error;

    const generationMap = new Map(data?.map((g) => [g.id, g]) ?? []);

    for (const genId of generationIds) {
      const generation = generationMap.get(genId);

      if (!generation || generation.user_id !== this.userId) {
        throw new GenerationNotFoundError(genId);
      }
    }
  }

  private async validateCollectionAccess(collectionId: number): Promise<void> {
    const { data, error } = await this.supabase
      .from("collections")
      .select("id, user_id")
      .eq("id", collectionId)
      .single();

    if (error || !data) {
      throw new CollectionNotFoundError(collectionId);
    }

    if (data.user_id !== this.userId) {
      throw new CollectionAccessError();
    }
  }

  private async updateGenerationMetrics(flashcards: any[]): Promise<void> {
    const updates: Record<string, { unedited: number; edited: number }> = {};

    for (const f of flashcards) {
      if (!f.generation_id) continue;

      if (!updates[f.generation_id]) {
        updates[f.generation_id] = { unedited: 0, edited: 0 };
      }

      if (f.source === "ai-full") {
        updates[f.generation_id].unedited++;
      } else if (f.source === "ai-edited") {
        updates[f.generation_id].edited++;
      }
    }

    for (const [genId, counts] of Object.entries(updates)) {
      if (counts.unedited > 0) {
        await this.supabase
          .from("generations")
          .update({
            accepted_unedited_count: this.supabase.raw(`accepted_unedited_count + ${counts.unedited}`),
          })
          .eq("id", parseInt(genId));
      }

      if (counts.edited > 0) {
        await this.supabase
          .from("generations")
          .update({
            accepted_edited_count: this.supabase.raw(`accepted_edited_count + ${counts.edited}`),
          })
          .eq("id", parseInt(genId));
      }
    }
  }
}
```

### src/pages/api/flashcards.ts (NEW)

```typescript
import type { APIRoute } from "astro";
import { validateCreateFlashcardsCommand } from "../../lib/validators/flashcards.validator";
import { FlashcardService } from "../../lib/services/flashcard.service";
import type { CreateFlashcardsResponseDTO, ApiErrorResponse } from "../../types";
import {
  GenerationNotFoundError,
  CollectionNotFoundError,
  CollectionAccessError,
  SchedulerError,
} from "../../lib/errors/flashcard.errors";

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const { locals } = context;

  // Guard: Sprawdzenie autentykacji
  const supabase = locals.supabase;
  const user = locals.user;

  if (!user || !supabase) {
    return new Response(
      JSON.stringify({
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        },
        meta: { timestamp: new Date().toISOString(), status: "error" },
      } as ApiErrorResponse),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    // Parsowanie body
    let body;
    try {
      body = await context.request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: { code: "VALIDATION_ERROR", message: "Invalid JSON" },
          meta: { timestamp: new Date().toISOString(), status: "error" },
        } as ApiErrorResponse),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Walidacja struktury
    const validationResult = validateCreateFlashcardsCommand(body);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: {
            code: "VALIDATION_ERROR",
            message: "Request validation failed",
            details: validationResult.errors,
          },
          meta: { timestamp: new Date().toISOString(), status: "error" },
        } as ApiErrorResponse),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Tworzenie serwisu i zapisanie fiszek
    const service = new FlashcardService(supabase, user.id);
    const savedFlashcards = await service.createFlashcards(validationResult.data);

    // Przygotowanie response'u
    const response: CreateFlashcardsResponseDTO = {
      saved_count: savedFlashcards.length,
      flashcards: savedFlashcards,
      collection_id: validationResult.data.collection_id,
      message: `${savedFlashcards.length} flashcards successfully saved`,
    };

    return new Response(JSON.stringify(response), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Mapowanie błędów na odpowiednie kody HTTP
    if (error instanceof GenerationNotFoundError) {
      return new Response(
        JSON.stringify({
          error: {
            code: "RESOURCE_NOT_FOUND",
            message: error.message,
          },
          meta: { timestamp: new Date().toISOString(), status: "error" },
        } as ApiErrorResponse),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    if (error instanceof CollectionNotFoundError) {
      return new Response(
        JSON.stringify({
          error: {
            code: "RESOURCE_NOT_FOUND",
            message: error.message,
          },
          meta: { timestamp: new Date().toISOString(), status: "error" },
        } as ApiErrorResponse),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    if (error instanceof CollectionAccessError) {
      return new Response(
        JSON.stringify({
          error: {
            code: "FORBIDDEN",
            message: error.message,
          },
          meta: { timestamp: new Date().toISOString(), status: "error" },
        } as ApiErrorResponse),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    if (error instanceof SchedulerError) {
      return new Response(
        JSON.stringify({
          error: {
            code: "SERVICE_UNAVAILABLE",
            message: error.message,
          },
          meta: { timestamp: new Date().toISOString(), status: "error" },
        } as ApiErrorResponse),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }

    // Genericzny błąd serwera
    console.error("[Flashcards API] Unhandled error:", error);
    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred",
        },
        meta: { timestamp: new Date().toISOString(), status: "error" },
      } as ApiErrorResponse),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
```

---

## 11. Checklist pré-implementacji

- [ ] Code review tego planu z zespołem
- [ ] Weryfikacja, że middleware autentykacji jest poprawnie skonfigurowany
- [ ] Sprawdzenie, czy kontekst Astro udostępnia `locals.user` i `locals.supabase`
- [ ] Definicja API scheduler'a (endpoint, contract)
- [ ] Definicja API analytics (endpoint, contract)
- [ ] Decyzja o limicie batch size (proponuję 100)
- [ ] Setup testów (unit testy serwisów, integration testy endpointu)

---

## 12. Uwagi do przyszłych iteracji (Faza 2)

1. **Rate limiting**: Dodać limit ilości fiszek per użytkownik per godzina
2. **Caching**: Cachować validation rules dla wydajności
3. **Websockets**: Real-time notyfikacje o postępie batch'a
4. **Async processing**: Dla bardzo dużych batch'y (>500 fiszek) - job queue
5. **Batch rollback**: W przypadku błędu scheduler'a, možliwość rollback'u
6. **Audit logs**: Logować wszystkie operacje do `audit_logs` tabeli
