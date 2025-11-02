# 10xCards – Type Conventions Guide

## Cel dokumentu

Dokument definiuje spójne nazewnictwo i strukturę typów w projekcie, aby ułatwić:

- Skalowanie kodu (dodawanie nowych endpointów)
- Onboarding nowych developerów
- Utrzymanie separacji warstw (DB vs domeny vs API)
- Stabilność kontraktu API

---

## 1. Warstwa Persistence (Baza Danych)

Typy reprezentujące **surowy kształt** danych w bazie – nigdy nie wysyłasz ich bezpośrednio do klienta.

### Konwencja: `*Row` lub `*Record`

```typescript
export type FlashcardRow = Tables<"flashcards">;
export type GenerationRow = Tables<"generations">;
export type CollectionRow = Tables<"collections">;
export type GenerationErrorLogRow = Tables<"generation_error_logs">;

// Dla operacji insert/update (opcjonalnie)
export type FlashcardInsertRow = TablesInsert<"flashcards">;
export type FlashcardUpdateRow = TablesUpdate<"flashcards">;
```

**Czemu `*Row`?**

- Wyraźnie mówi: "to jest surowy rekord z DB"
- Rozróżnia od typów, które są "bezpiecznym umową z klientem"
- Gdy dodasz kolumnę `internal_flag` w bazie, nie wycieka ono do API

**Gdzie się go używa?**

- Wewnętrznie w serwisach (business logic)
- Jako źródło dla `*DTO` (mapping)
- Nigdy bezpośrednio w response HTTP

---

## 2. Warstwa Wejścia – Commandy (Mutacje Stanu)

Typy reprezentujące **intencję modyfikacji** stanu (create, update, delete).
Zgodne z wzorcem CQRS: Command = "zrób to", a nie "oto dane".

### Konwencja: `[Czasownik][Rzeczownik]Command`

```typescript
// CREATE
export interface CreateFlashcardsCommand {
  flashcards: CreateFlashcardItemCommand[];
  collection_id: number | null;
}

export interface CreateFlashcardItemCommand {
  front: string;
  back: string;
  source: FlashcardSource;
  generation_id?: number | null;
}

export interface CreateGenerationCommand {
  source_text: string;
  model: string;
}

export interface CreateCollectionCommand {
  name: string;
}

// UPDATE
export interface UpdateFlashcardCommand {
  front?: string;
  back?: string;
  collection_id?: number | null;
}

export interface UpdateCollectionCommand {
  name: string;
}

// DELETE (opcjonalnie – czasami to tylko endpoint bez struktury)
export interface DeleteFlashcardCommand {
  id: number;
}
```

**Czemu `*Command`?**

- Wyrażnie semantyka: "to modyfikuje stan"
- Łatwo przewidzieć: `CreateX`, `UpdateX`, `DeleteX`, `RenameX`, `ArchiveX`
- Zgodne z CQRS i DDD (Domain-Driven Design)

**Gdzie się go używa?**

- Parametr metody w serwisie: `service.createFlashcards(command: CreateFlashcardsCommand)`
- Wynik parsowania żądania (Zod schema)
- Wejście do business logic

---

## 3. Warstwa Wejścia – Queries (Odczyt Stanu)

Typy reprezentujące **intencję pobrania** danych (bez zmiany stanu).

### Konwencja: `[List|Get][Rzeczownik]Query` (opcjonalnie)

```typescript
// GET LIST
export interface ListFlashcardsQuery {
  page: number;
  per_page: number;
  collection_id?: number;
  search?: string;
}

// GET DETAIL
export interface GetGenerationQuery {
  id: number;
}
```

**Czemu `*Query`?**

- Rozróżnia od `*Command` – to jest odczyt bez efektów ubocznych
- CQRS: Command (zmiana) vs Query (odczyt)
- Czytelne: `ListFlashcardsQuery`, nie `ListFlashcardsRequest`

**Gdzie się go używa?**

- Parametry metody: `service.listFlashcards(query: ListFlashcardsQuery)`
- Filtry i parametry GET (opcjonalnie – small queries mogą być inline)

---

## 4. Warstwa Wyjścia – Response DTOs

Typy reprezentujące **kontrakt API** – to co klient rzeczywiście otrzymuje przez HTTP.

### Konwencja 1: `*DTO` – Pojedynczy Rekord

```typescript
export type FlashcardDTO = Pick<
  FlashcardRow,
  "id" | "front" | "back" | "source" | "generation_id" | "collection_id" | "created_at" | "updated_at"
>;

export type GenerationDTO = Pick<
  GenerationRow,
  | "id"
  | "status"
  | "model"
  | "source_text_length"
  | "generated_count"
  | "generation_duration_ms"
  | "created_at"
  | "user_id"
>;
```

**Czemu `*DTO`?**

- DTO = Data Transfer Object – obiekt przeznaczony do transportu przez sieć
- Przycięty z `*Row` – tylko bezpieczne pola
- Stabilny kontrakt – zmiana bazy nie wpływa na API

### Konwencja 2: `*ResponseDTO` – Pełna Odpowiedź Endpointu

```typescript
export interface CreateFlashcardsResponseDTO {
  saved_count: number;
  flashcards: FlashcardDTO[];
  collection_id: number | null;
  message: string;
}

export interface GenerationResponseDTO {
  generation_id: number;
  status: "completed" | "pending" | "failed";
  model: string;
  generated_count: number;
  generation_duration_ms: number;
  flashcards_candidates: GeneratedFlashcardCandidateDTO[];
  message: string;
}
```

**Czemu `*ResponseDTO`?**

- Wyraźnie: "to jest dokładny shape HTTP response"
- Może zawierać agregaty (`saved_count`, `message`), nie tylko surowy rekord
- Przestrzeń do dodania logiki (np. `message` zależy od kontekstu)

### Konwencja 3: `*ListResponseDTO` – Lista + Paginacja

```typescript
export interface PaginationDTO {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface FlashcardsListResponseDTO {
  flashcards: FlashcardDTO[];
  pagination: PaginationDTO;
}

export interface GenerationsListResponseDTO {
  generations: GenerationDTO[];
  pagination: PaginationDTO;
}
```

**Czemu `*ListResponseDTO`?**

- Standardowy shape dla wszystkich list
- `pagination` zawsze na tym samym miejscu
- Łatwo dla frontend: `response.flashcards[0]`, `response.pagination.total`

---

## 5. Warstwa HTTP – Success & Error Responses

### Success Response (Envelope)

```typescript
export interface ApiSuccessResponse<T> {
  data: T;
  meta: {
    timestamp: string;
    status: "success";
  };
}
```

**Przykład:**

```json
{
  "data": {
    "saved_count": 1,
    "flashcards": [{ "id": 1, "front": "...", "back": "..." }],
    "collection_id": null,
    "message": "1 flashcards successfully saved"
  },
  "meta": {
    "timestamp": "2025-10-27T12:34:56.789Z",
    "status": "success"
  }
}
```

### Error Response (RFC 7807 / Problem Details)

```typescript
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: ValidationErrorDetail[];
    httpStatus?: number;
    instance?: string;
    hint?: string;
  };
  meta: {
    timestamp: string;
    status: "error";
  };
}
```

**Przykład (422 – Validation):**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Walidacja parametrów nie powiodła się.",
    "details": [
      { "field": "flashcards.0.front", "message": "front must have at least 1 character" },
      { "field": "collection_id", "message": "collection_id must be a positive integer" }
    ],
    "httpStatus": 422,
    "instance": "/api/flashcards",
    "hint": "Popraw pola wymienione w 'details' i spróbuj ponownie."
  },
  "meta": {
    "timestamp": "2025-10-27T12:34:56.789Z",
    "status": "error"
  }
}
```

---

## 6. Helpers HTTP – Response Builders

W `src/lib/http/`:

```typescript
// http.responses.ts
export function successResponse<T>(data: T, status = 200): Response { ... }

// http.errors.ts
export function badJson(instance: string): Response { ... }
export function validationFailed(details: FieldError[], instance: string): Response { ... }
export function notFound(message: string, instance: string): Response { ... }
export function forbidden(message: string, instance: string): Response { ... }
export function serviceUnavailable(instance: string): Response { ... }
export function internalError(instance: string): Response { ... }
```

**Zasada:** Wszystkie endpointy używają tych helperów. Nigdy nie wysyłaj custom JSON-a.

---

## 7. Validatory – Zod Schemas

W `src/lib/validators/`:

### Struktura Schematu

```typescript
import { z } from "zod";
import type { CreateFlashcardsCommand } from "@/types";

// Schema
const createFlashcardItemSchema = z.object({
  front: z.string().min(1).max(200, "front must not exceed 200 characters"),
  back: z.string().min(1).max(500, "back must not exceed 500 characters"),
  source: z.enum(["manual", "ai-full", "ai-edited"]),
  generation_id: z.number().int().positive().optional().nullable(),
});

export const createFlashcardsCommandSchema = z.object({
  flashcards: z.array(createFlashcardItemSchema).min(1).max(100),
  collection_id: z.number().int().positive().optional().nullable(),
}) satisfies z.ZodSchema<CreateFlashcardsCommand>;
// ↑ satisfies gwarantuje, że schema zgadza się z typem!

// Wrapper do normalizacji błędów
export interface CreateFlashcardsValidationResult {
  success: boolean;
  data?: z.infer<typeof createFlashcardsCommandSchema>;
  errors?: ValidationErrorDetail[];
}

export function validateCreateFlashcardsCommand(data: unknown): CreateFlashcardsValidationResult {
  const result = createFlashcardsCommandSchema.safeParse(data);

  if (!result.success) {
    return {
      success: false,
      errors: result.error.issues.map((issue) => ({
        field: issue.path.join(".") || "unknown",
        message: issue.message,
      })),
    };
  }

  return { success: true, data: result.data };
}
```

**Zasada:**

- Schema zawsze `satisfies z.ZodSchema<XCommand>` – compile-time check
- Wrapper funkcja normalizuje błędy do spójnego formatu (`ValidationErrorDetail`)
- `.safeParse()` – nigdy nie rzucaj w walidatorze

---

## 8. Serwisy – Business Logic

### Sygnatura

```typescript
export class FlashcardService {
  async createFlashcards(command: CreateFlashcardsCommand): Promise<FlashcardDTO[]> {
    // command: CreateFlashcardsCommand (z walidatora)
    // return: FlashcardDTO[] (to co wysyłamy do klienta)
  }
}
```

**Zasada:**

- Wejście: `*Command` (lub `*Query`)
- Wyjście: `*DTO` (nigdy `*Row`)
- Wewnętrznie: mogą pracować na `*Row`, ale return zawsze DTO

---

## 9. Endpointy – API Routes

### Szablon

```typescript
// src/pages/api/flashcards.ts
import type { AstroGlobal } from "astro";
import { validateCreateFlashcardsCommand } from "@/lib/validators/flashcards.validator";
import { FlashcardService } from "@/lib/services/flashcard.service";
import { successResponse } from "@/lib/http/http.responses";
import { badJson, validationFailed, internalError } from "@/lib/http/http.errors";

export const POST = async (context: AstroGlobal) => {
  const userId = context.locals.user?.id ?? DEFAULT_USER_ID;
  const instance = context.url.pathname;

  // Krok 1: Parse JSON
  let bodyData: unknown;
  try {
    bodyData = await context.request.json();
  } catch {
    return badJson(instance);
  }

  // Krok 2: Walidacja (Zod)
  const validationResult = validateCreateFlashcardsCommand(bodyData);
  if (!validationResult.success) {
    return validationFailed(validationResult.errors, instance);
  }

  // Gwarancja typu
  if (!validationResult.data) {
    return internalError(instance);
  }

  // Krok 3: Business logic (serwis)
  const service = new FlashcardService(supabaseClient, userId);
  try {
    const response = await service.createFlashcards(validationResult.data);

    // Krok 4: Response DTO
    const responseData: CreateFlashcardsResponseDTO = {
      saved_count: response.length,
      flashcards: response,
      collection_id: validationResult.data.collection_id,
      message: `${response.length} flashcards successfully saved`,
    };

    return successResponse(responseData, 201);
  } catch (error) {
    // Obsługa błędów z serwisu
    if (error instanceof GenerationNotFoundError) return notFound(error.message, instance);
    if (error instanceof CollectionNotFoundError) return notFound(error.message, instance);
    if (error instanceof SchedulerError) return serviceUnavailable(instance);

    return internalError(instance);
  }
};
```

---

## 10. Checklist – Gdy Dodajesz Nowy Endpoint

1. **Typy** (`src/types.ts`):
   - [ ] `*Command` – struktura wejścia
   - [ ] `*ResponseDTO` – dokładny shape HTTP response
   - Opcjonalnie: `*Query` (dla GET z filtrami)

2. **Validator** (`src/lib/validators/`):
   - [ ] Schema z `satisfies z.ZodSchema<*Command>`
   - [ ] Wrapper funkcja normalizująca błędy

3. **Serwis** (`src/lib/services/`):
   - [ ] Metoda: `async create*(command: *Command): Promise<*DTO[]>`
   - [ ] Business logic (walidacja referencji, metric updates itp.)

4. **Endpoint** (`src/pages/api/`):
   - [ ] Parsowanie JSON (badJson error)
   - [ ] Walidacja (validationFailed error)
   - [ ] Wywołanie serwisu (try-catch domenowe błędy)
   - [ ] Response DTO (successResponse)

5. **Testy** (opcjonalnie):
   - [ ] Happy path
   - [ ] Validation errors (422)
   - [ ] Domain errors (404, 403, 503)

---

## 11. Podsumowanie: Jak to się składa w runtime

```
HTTP POST /api/flashcards
    │
    ├─ JSON body: { "flashcards": [...], "collection_id": null }
    │
    ├─ Endpoint (flashcards.ts)
    │   ├─ Parse JSON → 400 badJson
    │   ├─ Validator.safeParse() → CreateFlashcardsCommand (lub 422 validationFailed)
    │   └─ Serwis.createFlashcards(command)
    │
    ├─ Serwis (FlashcardService)
    │   ├─ Walidacja biznesowa (referencias generacji/kolekcji)
    │   ├─ Insert FlashcardRow[] do DB
    │   ├─ Update metrics w generations
    │   └─ Return FlashcardDTO[] (przycięty bezpieczny shape)
    │
    └─ Endpoint construuje response
        └─ CreateFlashcardsResponseDTO { saved_count, flashcards, collection_id, message }
            └─ successResponse(responseData, 201)
                └─ HTTP 201 Created
                    └─ JSON: { data: {...}, meta: { timestamp, status } }
```

---

## 12. Dodatkowe Notatki

- **Backward Compatibility:** Gdy zmienisz schemat DB, DTO chroni klientów. Zmień tylko mapping w serwisie.
- **API Versioning:** Gdy trzeba będzie wersjonować, `*DTO` i `*ResponseDTO` są punktami do divergencji.
- **Testing:** DTOs można mockować niezależnie od DB – łatwe unit testy.
- **Documentation:** Każdy endpoint ma typ `*ResponseDTO` – łatwo generować docs/Swagger.
