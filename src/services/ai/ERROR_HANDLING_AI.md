# Error Handling w AIService

AIService integruje się z istniejącą Error Handling Architecture poprzez domenowe błędy z prefixem `ai/*`.

## Architektura

```
AIService ↓ (wyrzuca DomainError)
  ↓
Error Handling Architecture
  ├── DomainError { code: "ai/...", status: number, title: string, message?: string }
  ├── RFC 7807 (ProblemDetails)
  └── HTTP Response
```

## Kody błędów

### Błędy walidacji (4xx)

| Kod                 | Status | Scenariusz                           |
| ------------------- | ------ | ------------------------------------ |
| `ai/invalid-input`  | 400    | Pusty prompt, brak schematu          |
| `ai/invalid-config` | 400    | Nieprawidłowa konfiguracja AIService |
| `ai/bad-request`    | 400    | Niepoprawna nazwa modelu, parametry  |

### Autoryzacja (4xx)

| Kod               | Status | Scenariusz                     |
| ----------------- | ------ | ------------------------------ |
| `ai/unauthorized` | 401    | Brak/błędne OPENROUTER_API_KEY |
| `ai/forbidden`    | 403    | Brak dostępu do modelu         |

### Rate limiting i availability (5xx)

| Kod                      | Status | Scenariusz                    | Retry? |
| ------------------------ | ------ | ----------------------------- | ------ |
| `ai/rate-limited`        | 429    | Limit requestów od OpenRouter | ✅ Yes |
| `ai/timeout`             | 408    | Timeout requestu              | ✅ Yes |
| `ai/provider-error`      | 502    | Błąd 5xx od providera         | ✅ Yes |
| `ai/service-unavailable` | 503    | Provider niedostępny          | ✅ Yes |
| `ai/retry-exhausted`     | 503    | Wyczerpane próby retry        | ❌ No  |

### Błędy parsowania (4xx)

| Kod                    | Status | Scenariusz                         |
| ---------------------- | ------ | ---------------------------------- |
| `ai/schema-error`      | 422    | Brak/błędny schemat Zod            |
| `ai/validation-failed` | 422    | Walidacja Zod wyjścia nie przeszła |
| `ai/parse-error`       | 422    | Błąd parsowania JSON               |

## Obsługa w API endpoint

### Pattern - Try-Catch z mappingiem

```typescript
import { isDomainError } from "@/lib/errors";
import { aiErrors } from "@/services/ai/ai.errors";

export async function POST(req: Request) {
  try {
    const result = await aiService.generateObject<T>();
    return new Response(JSON.stringify(result), { status: 200 });
  } catch (err) {
    if (isDomainError(err)) {
      // Mapowanie na RFC 7807 ProblemDetails
      const problem = aiErrors.toProblem(err, req.url);
      return new Response(JSON.stringify(problem), {
        status: err.status,
        headers: { "Content-Type": "application/problem+json" },
      });
    }

    // Unexpected error
    return new Response(
      JSON.stringify({
        message: "Unexpected server error",
      }),
      { status: 500 }
    );
  }
}
```

## Mapowanie - scenariusze

### 1. Rate limit (429)

```typescript
try {
  await aiService.generateObject();
} catch (err) {
  if (isDomainError(err) && err.code === "ai/rate-limited") {
    // Akcje:
    // 1. Zaloguj metrykę
    // 2. Zwróć 429 + retry-after header
    // 3. Poinformuj użytkownika (queue, retry later)
    return new Response(JSON.stringify({ message: "Too many requests, try again later" }), {
      status: 429,
      headers: { "Retry-After": "60" },
    });
  }
}
```

### 2. Timeout (408)

```typescript
try {
  await aiService.generateObject();
} catch (err) {
  if (isDomainError(err) && err.code === "ai/timeout") {
    // Akcje:
    // 1. Loguj timeout
    // 2. Zasugeruj shorter input dla użytkownika
    // 3. Opcjonalnie: retry z dłuższym timeout
    return new Response(
      JSON.stringify({
        message: "Request timeout - try with shorter text",
        code: "ai/timeout",
      }),
      { status: 408 }
    );
  }
}
```

### 3. Unauthorized (401)

```typescript
try {
  await aiService.generateObject();
} catch (err) {
  if (isDomainError(err) && err.code === "ai/unauthorized") {
    // Akcje:
    // 1. Loguj ALERT - brak API key!
    // 2. Zwróć 500 (nie ujawniaj API key issue klientowi)
    // 3. Wyślij alert do administratora
    logger.error("CRITICAL: Missing or invalid OPENROUTER_API_KEY");
    return new Response(JSON.stringify({ message: "Service configuration error" }), { status: 500 });
  }
}
```

### 4. Validation failed (422)

```typescript
try {
  await aiService.generateObject();
} catch (err) {
  if (isDomainError(err) && err.code === "ai/validation-failed") {
    // Akcje:
    // 1. Loguj błąd walidacji
    // 2. Zwróć szczegóły walidacji (err.meta.errors)
    // 3. Poinformuj użytkownika o problemie
    return new Response(
      JSON.stringify({
        message: "Output validation failed",
        errors: err.meta?.errors,
        code: "ai/validation-failed",
      }),
      { status: 422 }
    );
  }
}
```

### 5. Provider error (502)

```typescript
try {
  await aiService.generateObject();
} catch (err) {
  if (isDomainError(err) && err.code === "ai/provider-error") {
    // Akcje:
    // 1. Loguj błąd
    // 2. AIService powinien juŻ retry'ować (sprawdzenie)
    // 3. Jeśli mimo retry - zwróć 502
    // 4. Zasugeruj retry w UI
    return new Response(
      JSON.stringify({
        message: "AI service error - try again",
        code: "ai/provider-error",
      }),
      { status: 502 }
    );
  }
}
```

### 6. Service unavailable (503)

```typescript
try {
  await aiService.generateObject();
} catch (err) {
  if (isDomainError(err) && err.code === "ai/service-unavailable") {
    // Akcje:
    // 1. Loguj niedostępność
    // 2. Zwróć 503
    // 3. Zasugeruj retry w UI
    // 4. Monitoruj availability
    return new Response(
      JSON.stringify({
        message: "AI service temporarily unavailable",
        code: "ai/service-unavailable",
      }),
      { status: 503, headers: { "Retry-After": "120" } }
    );
  }
}
```

## Retry strategy

AIService automatycznie retry'je dla błędów idempotentnych:

```typescript
// Retryable errors
const RETRYABLE = [
  "ai/rate-limited", // 429
  "ai/timeout", // 408
  "ai/provider-error", // 502
  "ai/service-unavailable", // 503
];

// Non-retryable (throw immediately)
const NON_RETRYABLE = [
  "ai/unauthorized", // 401 - nie pomaga retry
  "ai/forbidden", // 403 - nie pomaga retry
  "ai/invalid-input", // 400 - input problem
  "ai/invalid-config", // 400 - config problem
  "ai/validation-failed", // 422 - schema problem
];
```

## Logging

AIService logguje z maskowaniem PII:

```typescript
const logger = {
  debug: (msg: string, meta?: unknown) => {},
  info: (msg: string, meta?: unknown) => {},
  warn: (msg: string, meta?: unknown) => {},
  error: (msg: string, meta?: unknown) => {},
};

// Logi
[DEBUG] AIService.callGenerateObject starting { model, timeoutMs }
[DEBUG] AIService.generateObject success { model, schema }
[WARN] AIService.retryWithBackoff retrying { attempt, maxRetries, nextDelayMs }
[ERROR] AIService.callGenerateObject unexpected error { error, model }
```

## Frontend - obsługa erroru

```typescript
// Hook w komponencie
const { mutate, isPending, error } = useMutation({
  mutationFn: async (sourceText: string) => {
    const response = await api.post("/api/generations", { sourceText });
    return response.json();
  },
  onError: (err) => {
    if (err instanceof Response) {
      const contentType = err.headers.get("content-type");
      if (contentType?.includes("application/problem+json")) {
        const problem = err.json(); // RFC 7807
        // Mapy na i18n klucze
        const titleKey = problem.title; // np. "errors.ai.rate_limited"
      }
    }
  },
});
```

## Best practices

### 1. Zawsze sprawdzaj typ błędu

```typescript
// ❌ Złe
catch (err: any) {
  return Response(err.message);
}

// ✅ Dobre
catch (err) {
  if (isDomainError(err)) {
    const problem = aiErrors.toProblem(err);
    return Response(JSON.stringify(problem), { status: err.status });
  }
  // Handle unknown errors
}
```

### 2. Loguj z kontekstem

```typescript
// ❌ Złe
logger.error("Error", err);

// ✅ Dobre
logger.error("AIService.generateObject failed", {
  code: err.code,
  status: err.status,
  model: configuration.model, // bez treści promptu!
  duration: Date.now() - startTime,
});
```

### 3. Nie wysyłaj szczegółów do klienta

```typescript
// ❌ Złe
return Response(err.message);

// ✅ Dobre
return Response(
  JSON.stringify({
    title: err.title, // i18n key
    status: err.status,
    code: err.code,
    // detail: err.message  // Opuszczamy techniczne szczegóły
  })
);
```

### 4. Obsługuj Retry-After

```typescript
// Rate limit
if (err.code === "ai/rate-limited") {
  return Response(JSON.stringify(...), {
    status: 429,
    headers: { "Retry-After": "60" } // Powiedz klientowi kiedy retry
  });
}
```

### 5. Monitoruj i alertuj

```typescript
logger.error("CRITICAL: ai/unauthorized", {
  timestamp: new Date(),
  action: "SEND_ALERT_TO_OPS",
});

// W produkcji - alert do pagerduty, slack, itp.
```

## Testing

```typescript
it("powinien obsługiwać rate limit", async () => {
  // Mock AI SDK aby zwrócił 429
  try {
    await aiService.generateObject();
  } catch (err) {
    expect(isDomainError(err)).toBe(true);
    expect(err.code).toBe("ai/rate-limited");
    expect(err.status).toBe(429);
  }
});
```

## Checklist

- [ ] Sprawdzać `isDomainError(err)` w catch
- [ ] Mapować na RFC 7807 ProblemDetails
- [ ] Nie wysyłać wrażliwych szczegółów
- [ ] Logować z kontekstem (bez PII)
- [ ] Ustawiać `Retry-After` dla 429/503
- [ ] Obsługiwać timeout (408)
- [ ] Obsługiwać rate limit (429)
- [ ] Alertować na 401 (config error)
- [ ] Testować ścieżki błędów
- [ ] Monitorować availabiliy (isHealthy())

## Referemcje

- Error Handling Architecture: `src/lib/errors/ERROR_HANDLING.md`
- RFC 7807: https://tools.ietf.org/html/rfc7807
- HTTP Status Codes: https://httpwg.org/specs/rfc9110.html#status.codes
