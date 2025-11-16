# AIService - Serwis do Generowania Ustrukturyzowanych Odpowiedzi

AIService zapewnia bezpieczny, konfigurowalny interfejs do generowania ustrukturyzowanych odpowiedzi przy użyciu Vercel AI SDK v5 i providera OpenRouter.

## Architektura

```
AIService (fluent API)
├── Post-construction configuration (settery)
├── Walidacja wejścia/wyjścia (Zod)
├── Retry z exponential backoff
├── Timeout i AbortController
├── Spójne logowanie z maskowaniem PII
└── Integracja z Error Handling Architecture
```

## Inicjalizacja

### Podstawowe użycie

```typescript
import { AIService } from "@/services/ai/ai.service";

const aiService = new AIService({
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultModel: "openai/gpt-4o-mini",
  timeoutMs: 15000,
});
```

### Z loggerem

```typescript
import { logger } from "@/lib/logger"; // Twoja instancja loggera

const aiService = new AIService({
  logger,
  timeoutMs: 15000,
});
```

## Konfiguracja

### Settery (fluent API)

```typescript
const flashcards = await aiService
  .setModel("openai/gpt-4o-mini")
  .setParameters({ temperature: 0.2, maxTokens: 1500, topP: 0.9 })
  .setSystemPrompt("Jesteś asystentem generującym fiszki...")
  .setUserPrompt("Stwórz fiszki z poniższego tekstu...")
  .setSchema(flashcardSchema)
  .generateObject<FlashcardType>();
```

### Batch configuration

```typescript
aiService.configure({
  defaultModel: "openai/gpt-4o-mini",
  defaultParams: { temperature: 0.2 },
  timeoutMs: 10000,
  requestHeaders: {
    "HTTP-Referer": "https://myapp.com",
    "X-Title": "My App",
  },
});
```

## Generowanie obiektów

### Schemat Zod (wymagany)

```typescript
import { z } from "zod";

const FlashcardSchema = z.object({
  flashcards: z
    .array(
      z.object({
        front: z.string().min(1).max(200),
        back: z.string().min(1).max(600),
      })
    )
    .min(1)
    .max(50),
});

type FlashcardType = z.infer<typeof FlashcardSchema>;
```

### Generowanie z domyślnym schematem

```typescript
const { flashcards } = await aiService
  .setSchema(FlashcardSchema)
  .generateObject<FlashcardType>();
```

### Generowanie z override'ami

```typescript
const result = await aiService.generateObject<FlashcardType>({
  system: "Custom system prompt",
  user: "Custom user prompt",
  model: "openai/gpt-4",
  params: { temperature: 0.5 },
  schema: CustomSchema,
  timeoutMs: 20000,
});
```

## Obsługa błędów

AIService integruje się z istniejącą Error Handling Architecture. Błędy są reprezentowane jako `DomainError` z kodem domeny `ai/*`.

### Kody błędów

- `ai/invalid-input` (400) – Pusty prompt, brak schematu
- `ai/invalid-config` (400) – Nieprawidłowa konfiguracja
- `ai/unauthorized` (401) – Brak/błędne OPENROUTER_API_KEY
- `ai/forbidden` (403) – Brak dostępu do modelu
- `ai/bad-request` (400) – Niepoprawna nazwa modelu
- `ai/rate-limited` (429) – Rate limit od providera
- `ai/timeout` (408) – Timeout requestu
- `ai/provider-error` (502) – Błąd providera
- `ai/service-unavailable` (503) – Provider niedostępny
- `ai/schema-error` (422) – Brak/błędny schemat
- `ai/validation-failed` (422) – Walidacja Zod nie przeszła
- `ai/parse-error` (422) – Błąd parsowania JSON
- `ai/retry-exhausted` (503) – Wyczerpane próby retry

### Obsługa w kontrolerze API

```typescript
import { isDomainError } from "@/lib/errors";
import { aiErrors } from "@/services/ai/ai.errors";

try {
  const result = await aiService.generateObject<T>();
  return new Response(JSON.stringify(result), { status: 200 });
} catch (err) {
  if (isDomainError(err)) {
    const problem = aiErrors.toProblem(err, req.url);
    return new Response(JSON.stringify(problem), { status: err.status });
  }

  // Unexpected error
  return new Response(
    JSON.stringify({ message: "Internal server error" }),
    { status: 500 }
  );
}
```

## Retry i Backoff

AIService automatycznie retry'je dla błędów idempotentnych (rate limit, timeout, 5xx).

### Konfiguracja retry

```typescript
aiService.setRetryPolicy({
  maxRetries: 3,
  baseDelayMs: 300,
  maxDelayMs: 5000,
  jitter: true, // Losowy offset do backoff
});
```

### Mechanizm

1. Exponential backoff: `delay = baseDelayMs * 2^attempt`
2. Jitter: `delay + random(0, delay * 0.1)`
3. Cap: Maksymalnie `maxDelayMs`
4. Limit: Maksymalnie `maxRetries` prób

## Healthcheck

```typescript
const isHealthy = await aiService.isHealthy();
console.log(isHealthy); // true | false
```

## Bezpieczeństwo

### Best Practices

1. **API Key** – Wyłącznie strona serwera, nigdy klient
   ```typescript
   // ✅ Server-side only
   const service = new AIService();

   // ❌ Never send to client
   // const apiKey = await fetch(...); // NO
   ```

2. **Maskowanie PII** – Automatyczne dla logów
   ```typescript
   // Email i długie teksty są maskowane w logach
   logger.debug("...", { email: "user@example.com" }); // → [EMAIL]
   ```

3. **Timeout** – Unika wiszących połączeń
   ```typescript
   // Default 15s, max 60s
   service.setTimeout(20000);
   ```

4. **Walidacja wejścia/wyjścia** – Dwie bariery Zod
   ```typescript
   // 1. System prompt: 1-5000 znaków
   // 2. User prompt: 1-20000 znaków
   // 3. Output: Ponownie walidowany vs schemat
   ```

5. **Nagłówki** – Whitelisting dla OpenRouter
   ```typescript
   // Tylko znane nagłówki: HTTP-Referer, X-Title, X-*
   service.setHeaders({ "X-Custom": "value" });
   ```

## Przypadki użycia

### Generowanie flashcard'ów

```typescript
const schema = z.object({
  flashcards: z.array(
    z.object({
      front: z.string(),
      back: z.string(),
    })
  ),
});

const aiService = new AIService()
  .setModel("openai/gpt-4o-mini")
  .setParameters({ temperature: 0.2, maxTokens: 1500 })
  .setSystemPrompt(
    "Jesteś asystentem do generowania fiszek. Odpowiadaj WYŁĄCZNIE w JSON."
  )
  .setUserPrompt(
    `Stwórz do 8 fiszek z poniższego tekstu:\n\n${sourceText}`
  )
  .setSchema(schema);

const { flashcards } = await aiService.generateObject<{
  flashcards: Array<{ front: string; back: string }>;
}>();
```

### Z obsługą błędów

```typescript
import { isDomainError } from "@/lib/errors";

try {
  const result = await aiService.generateObject();
  // Sukces
} catch (err) {
  if (isDomainError(err)) {
    switch (err.code) {
      case "ai/rate-limited":
        console.log("Rate limit - czekaj i spróbuj później");
        break;
      case "ai/timeout":
        console.log("Timeout - spróbuj z krótszym textom");
        break;
      case "ai/unauthorized":
        console.log("Błąd autoryzacji - sprawdź API key");
        break;
      default:
        console.log("Błąd AI:", err.title);
    }
  }
}
```

## Logowanie

### Debug

```typescript
const logger = {
  debug: (msg: string, meta?: unknown) => console.debug(msg, meta),
  info: (msg: string, meta?: unknown) => console.info(msg, meta),
  warn: (msg: string, meta?: unknown) => console.warn(msg, meta),
  error: (msg: string, meta?: unknown) => console.error(msg, meta),
};

const aiService = new AIService({ logger });
```

### Logi

```
[DEBUG] AIService.callGenerateObject starting { model: "openai/gpt-4o-mini", timeoutMs: 15000 }
[DEBUG] AIService.generateObject success { model: "openai/gpt-4o-mini", schema: true }
[WARN] AIService.retryWithBackoff retrying { attempt: 1, maxRetries: 2, nextDelayMs: 310 }
```

## Testy

Uruchomienie testów:

```bash
npm run test src/services/ai/ai.service.test.ts
```

### Pokrycie

- ✅ Walidacja konfiguracji i setterów
- ✅ Mappowanie błędów AI SDK
- ✅ Retry z backoffem
- ✅ Timeout i AbortController
- ✅ Walidacja Zod output
- ✅ Fluent API chain

## Integracja z innymi serwisami

### GenerationService (przykład)

```typescript
import { AIService } from "@/services/ai/ai.service";
import { z } from "zod";

export class GenerationService {
  private aiService: AIService;

  constructor() {
    this.aiService = new AIService()
      .setModel("openai/gpt-4o-mini")
      .setParameters({ temperature: 0.2 })
      .setSystemPrompt("Generuj fiszki...");
  }

  async generateFlashcards(sourceText: string) {
    this.aiService.setUserPrompt(
      `Stwórz fiszki z tekstu:\n\n${sourceText}`
    );

    return await this.aiService.generateObject<FlashcardType>();
  }
}
```

## Checklist bezpieczeństwa

- [ ] OPENROUTER_API_KEY w `.env` (serwer)
- [ ] AIService używany tylko server-side
- [ ] Timeout ustawiony (default 15s)
- [ ] Logowanie z maskowaniem PII
- [ ] Obsługa błędów w kontrolerach API
- [ ] Schemat Zod walidowany przed użyciem
- [ ] Rate limit handling (retry)
- [ ] Walidacja user input (długość promptów)

## Referencje

- AI SDK v5: https://sdk.vercel.ai
- OpenRouter: https://openrouter.ai
- Zod: https://zod.dev
- Error Handling: `src/lib/errors/ERROR_HANDLING.md`

