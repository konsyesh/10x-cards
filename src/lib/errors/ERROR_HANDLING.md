# Error Handling Architecture

Dokumentacja systemu obsługi błędów w projekcie 10xCards opartego na RFC 7807.

## Przegląd

System error handling jest zbudowany na architekturze **Pattern #2** (Single Class + Code Mapping):

1. **Pojedynczy typ `DomainError` i fabryki domen** – reprezentuje błędy wewnętrzne
2. **Rejestr błędów domenowych przez `defineDomain`** – mapowanie kodów na HTTP status
3. **Mapery brzegowe** – konwersja zewnętrznych errors (Zod, Supabase, AI) na `DomainError`
4. **RFC 7807 `ProblemDetails`** – standardowy format odpowiedzi HTTP
5. **`withProblemHandling` wrapper** – centralne miejsce serializacji błędów

## Struktura plików

```
src/
  lib/
    errors/
      index.ts              # Typy: DomainError, ProblemDetails, isDomainError()
      registry.ts           # defineDomain() - fabryka błędów
      http.ts              # withProblemHandling(), toProblem(), jsonProblem()
      map-zod.ts           # Zod → DomainError
      map-supabase.ts      # Supabase → DomainError
      map-ai.ts            # AI SDK → DomainError
    http/
      http.responses.ts    # successResponse, createdResponse, noContentResponse
      http.validate-body.ts # validateBody() - walidacja + mapowanie
      http.fetcher.ts      # fetchJson() + ApiError (frontend)
  services/
    flashcard/
      flashcard.errors.ts  # Błędy domeny flashcard
    generation/
      generation.errors.ts # Błędy domeny generation (AI)
    auth/
      auth.errors.ts       # Błędy domeny auth
  pages/
    api/
      flashcards/index.ts  # Endpoint POST /api/flashcards (owinięty w withProblemHandling)
      generations.ts       # Endpoint POST /api/generations (owinięty w withProblemHandling)
  middleware/
    index.ts              # Korelacja X-Request-ID dla SSR
  components/
    AppErrorBoundary.tsx  # React Error Boundary dla komponentów
```

## Domeny błędów

Projekt definiuje 5 domen:

### 1. `flashcard` - Błędy kart

```typescript
export const flashcardErrors = defineDomain("flashcard", {
  NotFound: { code: "flashcard/not-found", status: 404, title: "errors.flashcard.not_found" },
  ValidationFailed: { code: "flashcard/validation-failed", status: 400, title: "errors.flashcard.validation_failed" },
  DatabaseError: { code: "flashcard/database-error", status: 500, title: "errors.flashcard.database_error" },
  GenerationNotFound: {
    code: "flashcard/generation-not-found",
    status: 404,
    title: "errors.flashcard.generation_not_found",
  },
  CollectionNotFound: {
    code: "flashcard/collection-not-found",
    status: 404,
    title: "errors.flashcard.collection_not_found",
  },
  CollectionAccessDenied: {
    code: "flashcard/collection-access-denied",
    status: 404,
    title: "errors.flashcard.collection_access_denied",
  },
  SchedulerUnavailable: {
    code: "flashcard/scheduler-unavailable",
    status: 503,
    title: "errors.flashcard.scheduler_unavailable",
  },
});
```

### 2. `generation` - Błędy generowania AI

```typescript
export const generationErrors = defineDomain("generation", {
  ValidationFailed: { code: "generation/validation-failed", status: 400, title: "errors.generation.validation_failed" },
  ContentBlocked: { code: "generation/content-blocked", status: 422, title: "errors.generation.content_blocked" },
  ModelUnavailable: { code: "generation/model-unavailable", status: 503, title: "errors.generation.model_unavailable" },
  ProviderError: { code: "generation/provider-error", status: 502, title: "errors.generation.provider_error" },
  TimeoutError: { code: "generation/timeout", status: 504, title: "errors.generation.timeout" },
});
```

### 3. `auth` - Błędy autoryzacji

```typescript
export const authErrors = defineDomain("auth", {
  Unauthorized: { code: "auth/unauthorized", status: 401, title: "errors.auth.unauthorized" },
  Forbidden: { code: "auth/forbidden", status: 403, title: "errors.auth.forbidden" },
  InvalidCredentials: { code: "auth/invalid-credentials", status: 401, title: "errors.auth.invalid_credentials" },
  ValidationFailed: { code: "auth/validation-failed", status: 400, title: "errors.auth.validation_failed" },
  UserExists: { code: "auth/user-exists", status: 409, title: "errors.auth.user_exists" },
  EmailNotConfirmed: { code: "auth/email-not-confirmed", status: 403, title: "errors.auth.email_not_confirmed" },
  RateLimited: { code: "auth/rate-limited", status: 429, title: "errors.auth.rate_limited" },
  ProviderError: { code: "auth/provider-error", status: 502, title: "errors.auth.provider_error" },
  TokenExpired: { code: "auth/token-expired", status: 410, title: "errors.auth.token_expired" },
});
```

### 4. `ai` - Błędy serwisu AI (AIService)

```typescript
export const aiErrors = defineDomain("ai", {
  InvalidInput: { code: "ai/invalid-input", status: 400, title: "errors.ai.invalid_input" },
  InvalidConfig: { code: "ai/invalid-config", status: 400, title: "errors.ai.invalid_config" },
  Unauthorized: { code: "ai/unauthorized", status: 401, title: "errors.ai.unauthorized" },
  Forbidden: { code: "ai/forbidden", status: 403, title: "errors.ai.forbidden" },
  BadRequest: { code: "ai/bad-request", status: 400, title: "errors.ai.bad_request" },
  RateLimited: { code: "ai/rate-limited", status: 429, title: "errors.ai.rate_limited" },
  Timeout: { code: "ai/timeout", status: 408, title: "errors.ai.timeout" },
  ProviderError: { code: "ai/provider-error", status: 502, title: "errors.ai.provider_error" },
  ServiceUnavailable: { code: "ai/service-unavailable", status: 503, title: "errors.ai.service_unavailable" },
  SchemaError: { code: "ai/schema-error", status: 422, title: "errors.ai.schema_error" },
  ValidationFailed: { code: "ai/validation-failed", status: 422, title: "errors.ai.validation_failed" },
  ParseError: { code: "ai/parse-error", status: 422, title: "errors.ai.parse_error" },
  RetryExhausted: { code: "ai/retry-exhausted", status: 503, title: "errors.ai.retry_exhausted" },
});
```

### 5. `system` - Błędy systemowe (fallback)

```typescript
const SystemErrors = defineDomain("system", {
  Unexpected: { code: "system/unexpected", status: 500, title: "errors.system.unexpected" },
});
```

## Format odpowiedzi (RFC 7807)

### Error Response - 400/401/403/404/500/etc.

```json
{
  "type": "https://docs.app.dev/problems/flashcard/not-found",
  "title": "errors.flashcard.not_found",
  "status": 404,
  "detail": "Karta nie istnieje",
  "instance": "/api/flashcards",
  "code": "flashcard/not-found",
  "meta": {
    "cardId": "12345"
  }
}
```

**Nagłówki:**

- `Content-Type: application/problem+json`
- `X-Request-ID: <uuid>` (dla korelacji logów)

### Success Response - 200/201

```json
{
  "saved_count": 3,
  "flashcards": [...],
  "collection_id": 42,
  "message": "3 flashcards successfully saved"
}
```

**Nagłówki:**

- `Content-Type: application/json`
- `X-Request-ID: <uuid>`

## Użycie - Developer Guide

### Dla Service Developers (Backend)

Zawsze rzucaj `DomainError` używając fabryk z definicji:

```typescript
// src/services/flashcard/flashcard.service.ts
import { flashcardErrors } from "./flashcard.errors";
import { fromSupabase } from "@/lib/errors/map-supabase";

export async function getFlashcard(cardId: string) {
  // Walidacja
  if (!cardId) {
    throw flashcardErrors.creators.ValidationFailed({
      detail: "Card ID jest wymagane",
      meta: { field: "cardId" },
    });
  }

  try {
    const { data, error } = await supabase.from("flashcards").select("*").eq("id", cardId).single();

    if (error) {
      throw fromSupabase(error);
    }

    return data;
  } catch (err) {
    // Jeśli już to DomainError - propaguj
    if (err?.code?.startsWith?.("flashcard/")) throw err;

    // Mapuj Supabase errors
    if (err instanceof Error) {
      throw fromSupabase(err as any);
    }

    throw err;
  }
}
```

### Dla Endpoint Developers (API)

Zawsze owijaj handler w `withProblemHandling`:

```typescript
// src/pages/api/flashcards.ts
import { withProblemHandling } from "@/lib/errors/http";
import { validateBody } from "@/lib/http/http.validate-body";
import { createdResponse } from "@/lib/http/http.responses";

export const POST: APIRoute = withProblemHandling(async ({ request, locals }) => {
  // Walidacja (rzuca DomainError jeśli fail)
  const data = await validateBody(request, mySchema);

  // Service call (może rzucić DomainError)
  const result = await myService.doSomething(data);

  // Success response
  return createdResponse(result);
  // withProblemHandling automatycznie:
  // - łapie wszelkie błędy
  // - mapuje je na problem+json
  // - dodaje X-Request-ID
  // - wysyła do Sentry na PROD
});
```

### Dla Frontend Developers (React)

Używaj `fetchJson()` i `AppErrorBoundary`:

```typescript
// src/components/generate/GenerateButton.tsx
// src/components/generate/GenerateButton.tsx
import { fetchJson, ApiError } from "@/lib/http/http.fetcher";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { toast } from "sonner"; // import sonner zamiast useToast


export function MyComponent() {

  async function handleSave() {
    try {
      const result = await fetchJson<FlashcardResponse>(
        "/api/flashcards",
        {
          method: "POST",
          body: JSON.stringify(data),
        }
      );
      toast.success("Sukces", { description: "Karty zapisane" });
    } catch (err) {
      if (err instanceof ApiError) {
        // RFC 7807 error
        toast.error(err.problem.title, {
             description: err.problem.detail // Klucz i18n - tłumacz tutaj
             });
        console.log("Request ID:", err.requestId); // Do supportu
        console.log("Meta:", err.problem.meta); // Dane diagnostyczne
      } else {
        // Błąd sieci lub inny
        toast.error("Błąd sieci", { description: "Nie udało się połączyć z serwerem" });
      }
    }
  }

  return <AppErrorBoundary>{/* ... */}</AppErrorBoundary>;
}

```

## Mapery brzegowe

### Zod Errors

```typescript
import { fromZod } from "@/lib/errors/map-zod";

// W validateBody:
const result = schema.safeParse(data);
if (!result.success) {
  throw fromZod(result.error);
  // Zwraca: flashcard/validation-failed (400) + meta: flatten()
}
```

### Supabase Errors

```typescript
import { fromSupabase } from "@/lib/errors/map-supabase";

try {
  const { data, error } = await supabase.from("table").select();
  if (error) throw fromSupabase(error);
} catch (err) {
  throw fromSupabase(err);
}
```

Mapuje:

- `status 404` → `flashcard/not-found` (404)
- `code PGRST116` → `flashcard/not-found` (404)
- `status 429` → `flashcard/database-error` (status nadpisany na 429, tytuł `errors.common.rate_limit_exceeded`)
- inne → `flashcard/database-error` (500)

### AI SDK Errors

```typescript
import { fromAI } from "@/lib/errors/map-ai";

try {
  const result = await generateWithAI(text);
} catch (err) {
  throw fromAI(err);
}
```

Mapuje:

- `content_blocked` → `generation/content-blocked` (422)
- `model_unavailable` → `generation/model-unavailable` (503)
- `rate_limit_exceeded` → `generation/provider-error` (429)
- inne → `generation/provider-error` (502)

## Best Practices

### Service Development

1. **Waliduj na wejściu** - throw `ValidationFailed` z `detail` opisem
2. **Mapuj błędy zewnętrzne** - Supabase → `fromSupabase()`, AI → `fromAI()`
3. **Propaguj `DomainError`** - jeśli już to `DomainError`, nie łapuj
4. **Dodaj `meta` dane** - dla debugowania, ale bez PII
5. **Nie serializuj `cause`** - trzymaj w logach, nie w Response

```typescript
export async function saveFlashcard(card: Flashcard) {
  // Guard clauses
  if (!card.front) {
    throw flashcardErrors.creators.ValidationFailed({
      detail: "Front jest wymagany",
      meta: { field: "front" },
    });
  }

  try {
    const { error } = await supabase.from("flashcards").insert([card]);

    if (error) throw fromSupabase(error);
    return card;
  } catch (err) {
    // Propaguj DomainError
    if (err?.code?.startsWith?.("flashcard/")) throw err;

    // Mapuj pozostałe
    throw fromSupabase(err as any);
  }
}
```

### Endpoint Development

1. **Owijaj w `withProblemHandling`** - zawsze!
2. **Waliduj body** - `await validateBody()`
3. **Nie łapuj błędów** - pozwól `withProblemHandling` je obsłużyć
4. **Zwracaj success responses** - `successResponse()`, `createdResponse()`

```typescript
export const POST: APIRoute = withProblemHandling(async ({ request, locals }) => {
  const data = await validateBody(request, schema);
  const result = await service.create(data);
  return createdResponse(result);
  // Jeśli cokolwiek throw, withProblemHandling:
  // - mapuje DomainError na problem+json
  // - dodaje X-Request-ID
  // - wysyła do Sentry
});
```

### Frontend Development

1. **Używaj `fetchJson`** - zamiast `fetch()` bezpośrednio
2. **Obsługuj `ApiError`** - problem+json error
3. **Tłumacz `title` za pomocą i18n** - to jest klucz, nie tekst
4. **Pokaż `detail` użytkownikowi** - jeśli jest bezpieczny
5. **Loguj `meta` i `requestId`** - dla supportu

```typescript
try {
  await fetchJson("/api/flashcards", { method: "POST", body });
  toast({ title: "Sukces" });
} catch (err) {
  if (err instanceof ApiError) {
    toast({
      title: t(err.problem.title), // i18n klucz
      description: err.problem.detail, // User-friendly message
    });
    reportToSupport({
      requestId: err.requestId,
      code: err.problem.code,
      meta: err.problem.meta,
    });
  }
}
```

## Zmienne środowiskowe

```bash
# Bazowy prefix dla type w RFC 7807
PROBLEM_URI_TYPE=https://docs.app.dev/problems

# Sentry (PROD-only)
SENTRY_ENABLED=false
SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_ENV=production
```

## Sentry Integration (PROD-only)

W `src/lib/errors/http.ts`:

```typescript
if (SENTRY_ENABLED && sentry?.captureException) {
  sentry.captureException(error, {
    tags: { request_id: reqId, code: domainErr.code },
    extra: { meta: domainErr.meta },
  });
}
```

Aktywne tylko jeśli `SENTRY_ENABLED === "true"`.

## Checklist - Dodawanie nowego błędu

Jeśli chcesz dodać nowy typ błędu:

1. **Dodaj kod do domeny**

   ```typescript
   // src/services/my-domain/my-domain.errors.ts
   export const myErrors = defineDomain("my-domain", {
     MyError: { code: "my-domain/my-error", status: 400, title: "errors.my_domain.my_error" },
   });
   ```

2. **Używaj w serwisie**

   ```typescript
   throw myErrors.creators.MyError({ detail: "...", meta: { ... } });
   ```

3. **Rzuć w endpoincie** (bez dodatkowego handleowania)

   ```typescript
   export const POST = withProblemHandling(async (...) => {
     // Service rzuci DomainError
     const result = await service.doSomething();
     return createdResponse(result);
   });
   ```

4. **Tłumacz na froncie**
   ```typescript
   catch (err) {
     if (err instanceof ApiError) {
       toast({ title: t(err.problem.title) }); // "errors.my_domain.my_error"
     }
   }
   ```

## FAQ

**P: Kiedy używać 404 vs 403 dla dostępu?**
A: Zawsze 404 - nie ujawniaj istnienia zasobów cudzych użytkowników.

**P: Jak obsługiwać rate limits?**
A: Mapuj na 429 (`status: 429`) z kodem domenowym (np. `flashcard/database-error` dla DB, `generation/provider-error`, `auth/rate-limited`, `ai/rate-limited`).

**P: Czy mogę zmienić status dla istniejącego kodu?**
A: Nie bez konsultacji - zmień cały kod zamiast tylko statusu.

**P: Co z `cause` w JSON?**
A: Nigdy nie serializuj - trzymaj dla logów, zdał go tylko w `message` lub pomiń.

**P: Jak logować DomainError?**
A: Zawsze loguj `code`, `message`, `meta` - `cause` jest dostępny w serwisie.

## Linki

- RFC 7807: https://tools.ietf.org/html/rfc7807
- Plan wdrożenia: `./.ai/error-handling-plan.md`
