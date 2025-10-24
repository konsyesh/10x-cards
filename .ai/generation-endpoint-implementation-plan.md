# Plan Wdrożenia Endpointu API: POST /generations

## 1. Przegląd punktu końcowego

Endpoint `POST /generations` inicjuje sesję generowania flashcard'ów z tekstu źródłowego za pomocą sztucznej inteligencji. Jest to kluczowy punkt wejścia aplikacji do przetwarzania treści użytkownika i tworzenia kandydatów na karty do nauki.

**Cel:** Przyjąć tekst źródłowy od zalogowanego użytkownika, wysłać go do modelu LLM, przetwórzyć wyniki i zwrócić listę wygenerowanych flashcard'ów wraz z metadanymi sesji generowania.

**Obszar funkcjonalny:** FR-01 (AI-powered flashcard generation), FR-12 (text length validation)

---

## 2. Szczegóły żądania

### Metoda HTTP

```
POST /api/generations
```

### Autoryzacja

- Typ: JWT Bearer Token
- Wymagane: Tak
- Źródło: nagłówek `Authorization: Bearer <token>`
- Weryfikacja: Middleware Astro ekstraktuje z `context.locals.session`

### Parametry

#### Wymagane:

- **source_text** (string)
  - Opis: Tekst źródłowy do analizy i generowania flashcard'ów
  - Długość: 1000–50000 znaków (włącznie)
  - Walidacja: Musi być niepusty, długość w zakresie
- **model** (string)
  - Opis: Model LLM do użycia w generowaniu
  - Wartość domyślna w specyfikacji: `gpt-4o-mini`
  - Walidacja: Musi być na liście obsługiwanych modeli

#### Opcjonalne:

- Brak parametrów opcjonalnych

### Struktura treści żądania (Request Body)

```json
{
  "source_text": "Source text content (1000-50000 characters)...",
  "model": "gpt-4o-mini"
}
```

### Rate Limiting

- Limit: 5 żądań na minutę na użytkownika
- Status przy przekroczeniu: 429 Too Many Requests
- Implementacja: Middleware/service do śledzenia żądań per user_id

---

## 3. Szczegóły odpowiedzi

### Sukces (201 Created)

**Struktura:**

```json
{
  "generation_id": 12345,
  "status": "completed",
  "model": "gpt-4o-mini",
  "generated_count": 25,
  "generation_duration_ms": 28500,
  "flashcards_candidates": [
    {
      "front": "What is photosynthesis?",
      "back": "Biological process converting light energy into chemical energy",
      "source": "ai-full"
    },
    {
      "front": "Name three types of plants",
      "back": "1. Flowering plants 2. Ferns 3. Mosses",
      "source": "ai-full"
    }
  ],
  "message": "Generation completed. 25 flashcards generated."
}
```

**Typ odpowiedzi:** `GenerationResponseDTO`
**Status HTTP:** 201 Created

---

### Błędy

#### 400 Bad Request

- Przyczyny: Tekst poza zakresem długości, nieobsługiwany model, brakujące pola
- Struktura odpowiedzi:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Source text must be between 1000 and 50000 characters",
    "details": [
      {
        "field": "source_text",
        "message": "Text length must be between 1000 and 50000 characters"
      }
    ]
  },
  "meta": {
    "timestamp": "2025-10-24T12:34:56Z",
    "status": "error"
  }
}
```

#### 401 Unauthorized

- Przyczyna: Brak lub niepoprawny token JWT
- Komunikat: "Unauthorized. Valid JWT token required."
- Status: 401 Unauthorized

#### 429 Too Many Requests

- Przyczyna: Przekroczony limit żądań (5/minutę)
- Struktura:

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many generation requests. Limit: 5 per minute."
  },
  "meta": {
    "timestamp": "2025-10-24T12:34:56Z",
    "status": "error"
  }
}
```

#### 503 Service Unavailable

- Przyczyna: Usługa LLM niedostępna
- Komunikat: "LLM service is currently unavailable. Please try again later."
- Status: 503 Service Unavailable

#### 504 Gateway Timeout

- Przyczyna: Timeout żądania do usługi LLM (> 60 sekund)
- Komunikat: "LLM request timed out. Please try with shorter text."
- Status: 504 Gateway Timeout

#### 500 Internal Server Error

- Przyczyna: Nieoczekiwany błąd serwera
- Komunikat: Ogólny "An unexpected error occurred"
- Status: 500 Internal Server Error

---

## 4. Przepływ danych

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Klient wysyła POST /api/generations                          │
│    { source_text, model }                                       │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. Middleware Astro                                             │
│    - Weryfikuje JWT token                                       │
│    - Ekstraktuje user_id z context.locals.session               │
│    - Sprawdza rate limit per user_id                            │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. Handler endpointu POST /api/generations                      │
│    - Parsuje JSON body                                          │
│    - Waliduje schema za pomocą Zod                              │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. GenerationService.createGeneration()                         │
│    - Oblicza hash source_text (MD5)                             │
│    - Loguje długość tekstu                                      │
│    - Tworzy rekord w tabeli generations (status: pending)       │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. Wywołanie AI SDK / LLM API                                   │
│    - Wysyła source_text do modelu LLM                           │
│    - Czeka na odpowiedź (timeout: 60s)                          │
│    - Mierzy czas przetwarzania (generation_duration_ms)         │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
        ┌──────────────────┴──────────────────┐
        ↓ (sukces)                ↓ (błąd)
┌──────────────────────┐  ┌──────────────────────┐
│ 6a. Przetworzenie    │  │ 6b. Obsługa błędu    │
│     wyników          │  │    - Loguj do        │
│  - Parsuj JSON       │  │      generation_     │
│  - Waliduj każdy     │  │      error_logs      │
│    flashcard         │  │    - Zwróć 503/504   │
│  - Ustaw source=     │  └──────────────────────┘
│    "ai-full"         │
└──────────┬───────────┘
           ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. Aktualizacja rekordu generations                             │
│    - Ustaw status = "completed"                                 │
│    - Zaaktualizuj generated_count                               │
│    - Zaaktualizuj generation_duration_ms                        │
│    - Ustaw updated_at = now() (trigger)                         │
└──────────────────────────┬──────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ 8. Zwrócenie odpowiedzi GenerationResponseDTO                   │
│    - Status: 201 Created                                        │
│    - Zawiera flashcards_candidates array                        │
└─────────────────────────────────────────────────────────────────┘
```

### Interakcje z bazą danych

1. **Tabela `generations`:** Tworzenie nowego rekordu
   - Pola: user_id, model, generated_count, source_text_hash, source_text_length, generation_duration_ms
   - Trigger: `set_updated_at()` dla created_at/updated_at

2. **Tabela `generation_error_logs`:** Jeśli błąd
   - Pola: user_id, model, source_text_hash, source_text_length, error_code, error_message, details
   - Brak trigger (timestamps utawiane w aplikacji)

3. **Tabela `flashcards`:** Potencjalnie (jeśli użytkownik zaakceptuje)
   - Nie podczas generowania, tylko podczas POST /flashcards (inny endpoint)

---

## 5. Względy bezpieczeństwa

### Autentykacja

- **Wymóg:** JWT token w nagłówku Authorization
- **Implementacja:** Middleware Astro weryfikuje token
- **Fallback:** Zwróć 401 Unauthorized jeśli token brakuje/niepoprawny
- **Kod:** Ekstraktuj `user_id` z `context.locals.session.user?.id`

### Autoryzacja

- **Każdy użytkownik** ma dostęp tylko do swoich sesji generowania (user_id musi się zgadzać)
- **Brak roli administratora** w MVP — domyślnie wszystkie żądania autentykowane są uprawione

### Walidacja danych wejściowych

- **source_text:**
  - Długość: 1000–50000 znaków (nie mniej, nie więcej)
  - Typ: string (nie null, nie undefined)
  - Kodowanie: UTF-8, bez specjalnych ograniczeń
- **model:**
  - Musi być z listy obsługiwanych modeli (whitelist)
  - Brak dowolnego ciągu znaków
  - Obsługiwane: `["gpt-4o-mini", ...]` (lista do rozszerzenia)

### Rate Limiting

- **Limit:** 5 żądań na minutę na `user_id`
- **Implementacja:**
  - Redis (jeśli dostępne) lub in-memory cache
  - Klucz: `generation:rate:${user_id}`
  - TTL: 60 sekund
  - Licznik: inkrementuj, sprawdzaj przed przetworzeniem
- **Odpowiedź:** 429 Too Many Requests

### Ochrona przed atakami

#### Injection

- **SQL Injection:** Nie dotyczy — używamy Supabase SDK z parametryzowanymi zapytaniami
- **LLM Prompt Injection:** source_text wysyłany bezpośrednio do LLM (wymaga ostrożności)
  - Rekomendacja: Dodać prompt engineering / system message, aby ograniczyć wyjście

#### DoS

- Rate limiting (5/min) — chroni przed masowymi żądaniami
- Timeout 60s na LLM (zapobiega zawieszeniu serwera)
- Walidacja długości tekstu (max 50k znaków)

#### Information Disclosure

- **Błędy walidacji:** Zwracaj szczegółowe komunikaty (bezpiecznie)
- **Błędy LLM:** Nie ujawniaj pełnych stack trace'ów
  - Loguj szczegóły do generation_error_logs (wewnętrznie)
  - Zwracaj ogólne komunikaty do klienta (500, 503, 504)

### Logging i Audyt

- Logi żądania: timestamp, user_id, model, text_length, status
- Logi błędów: timestamp, user_id, error_code, error_message, details (JSON)
- Tabela `generation_error_logs` — przechowuje wszystkie błędy dla diagnostyki

---

## 6. Obsługa błędów

### Scenariusze błędów i strategie

| Scenariusz                 | Kod | Przyczyna    | Obsługa                                   |
| -------------------------- | --- | ------------ | ----------------------------------------- |
| Tekst < 1000 znaków        | 400 | Walidacja    | Zwróć VALIDATION_ERROR z szczegółami      |
| Tekst > 50000 znaków       | 400 | Walidacja    | Zwróć TEXT_LENGTH_INVALID                 |
| Brakujące pole source_text | 400 | Walidacja    | Zwróć VALIDATION_ERROR                    |
| Brakujące pole model       | 400 | Walidacja    | Zwróć VALIDATION_ERROR                    |
| Model nieobsługiwany       | 400 | Walidacja    | Zwróć VALIDATION_ERROR                    |
| Brak JWT tokenu            | 401 | Autentykacja | Zwróć UNAUTHORIZED                        |
| Niepoprawny JWT            | 401 | Autentykacja | Zwróć UNAUTHORIZED                        |
| Rate limit przekroczony    | 429 | Limitowanie  | Zwróć RATE_LIMIT_EXCEEDED                 |
| LLM niedostępny            | 503 | Usługa       | Loguj błąd, zwróć SERVICE_UNAVAILABLE     |
| LLM timeout (>60s)         | 504 | Sieć         | Loguj błąd, zwróć GATEWAY_TIMEOUT         |
| Błąd bazy danych           | 500 | Serwer       | Loguj błąd, zwróć ogólny komunikat        |
| Nieoczekiwany błąd         | 500 | Serwer       | Loguj stack trace, zwróć ogólny komunikat |

### Logging błędów

#### Dla błędów walidacji (400):

```typescript
// Loguj do consoli (development)
console.warn(`[Validation Error] user_id: ${userId}, field: ${field}, message: ${message}`);
```

#### Dla błędów LLM (503, 504):

```typescript
// Loguj do generation_error_logs
await supabase.from("generation_error_logs").insert({
  user_id: userId,
  model: model,
  source_text_hash: hash,
  source_text_length: textLength,
  error_code: "LLM_SERVICE_UNAVAILABLE" | "LLM_TIMEOUT",
  error_message: errorMessage,
  details: { originalError: errorDetails },
});
```

#### Dla błędów serwera (500):

```typescript
// Loguj stack trace
console.error("[Generation Error]", {
  user_id: userId,
  timestamp: new Date().toISOString(),
  error: error.message,
  stack: error.stack,
});
```

### Odpowiedzi błędów

Zawsze zwracaj zunifikowany format błędu (per `ApiErrorResponse`):

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": [{ "field": "fieldName", "message": "Specific error" }]
  },
  "meta": {
    "timestamp": "ISO-8601 timestamp",
    "status": "error"
  }
}
```

---

## 7. Wydajność

### Potencjalne wąskie gardła

1. **Komunikacja z LLM**
   - Przyczyna: Network latency, przetwarzanie modelu
   - Mitygacja: Timeout 60s, asynchroniczna komunikacja (jeśli async handlery)
   - Monitoring: Mierz `generation_duration_ms`, analiza trendu

2. **Walidacja dużych tekstów**
   - Przyczyna: Parsowanie/tokenizacja 50k znaków
   - Mitygacja: Walidacja wstępna (regex długości) przed LLM
   - Monitoring: Benchmark walidacji Zod

3. **Operacje bazodanowe**
   - Przyczyna: INSERT do `generations`, jeśli UPDATE jest wolny
   - Mitygacja: Indeksy na (user_id, created_at), indeks na user_id
   - Monitoring: Query profiling w Supabase

4. **Rate limiting**
   - Przyczyna: Redis/in-memory lookup per żądanie
   - Mitygacja: Lightweight key-value store
   - Monitoring: Cache hit/miss ratio

### Strategie optymalizacji

- **Caching:** Nie cachuj wyników generowania (każdy tekst unikatowy)
- **Paginacja:** Nie dotyczy — brak paginacji w tej operacji
- **Batch processing:** Nie dotyczy — jedno żądanie = jedna sesja generowania
- **Asynchroniczność:** Jeśli LLM API dostarcza async — użyj, czekaj w handleru
- **Indeksy bazy:** Ensure indeksy na `generations(user_id, created_at)`

### Monitoring i alerting

- Śledzenie `generation_duration_ms` — alert jeśli > 45s (timeout blisko)
- Liczenie błędów 503/504 — alert jeśli > 10% żądań
- Rate limit rejections — monitor dla atakujących użytkowników

---

## 8. Kroki implementacji

### Faza 1: Przygotowanie i struktura

1. **Zatwierdzenie typów w `src/types.ts`**
   - Verify `CreateGenerationCommand` — źródło i model
   - Verify `GenerationResponseDTO` — wszystkie pola (generation_id, status, model, generated_count, generation_duration_ms, flashcards_candidates, message)
   - Verify `GeneratedFlashcardCandidateDTO` — front, back, source
   - Status: Typy już zdefiniowane w types.ts ✓

2. **Stworzenie `/src/lib/services/generation.service.ts`**
   - Funkcja: `createGeneration(userId: string, command: CreateGenerationCommand): Promise<GenerationResponseDTO>`
   - Logika:
     - Waliduj source_text (długość)
     - Oblicz hash source_text
     - Utwórz rekord w `generations` (status = "pending")
     - Wywołaj LLM API
     - Przetwórz odpowiedź
     - Aktualizuj rekord (status = "completed", generated_count, generation_duration_ms)
     - Zwróć GenerationResponseDTO
   - Error handling: Catch i log do generation_error_logs

3. **Stworzenie `/src/lib/validators/generation.validator.ts`**
   - Zod schema dla CreateGenerationCommand
   - Sprawdzenie: source_text (1000-50000), model (whitelist)
   - Export funkcji: `validateGenerationCommand(data: unknown)`

### Faza 2: Implementacja handlera API

4. **Stworzenie `/src/pages/api/generations.ts`**
   - HTTP method: `POST`
   - Middleware: JWT verification (context.locals.session)
   - Rate limiting: Sprawdzenie 5/min limit
   - Body parsing i walidacja (Zod)
   - Calling `GenerationService.createGeneration()`
   - Obsługa błędów: Mapping na odpowiednie kody HTTP
   - Response: 201 Created + GenerationResponseDTO
   - Error responses: 400, 401, 429, 503, 504, 500

5. **Implementacja rate limitera**
   - Opcja A: In-memory Map<userId, { count: number, resetAt: Date }>
   - Opcja B: Redis (jeśli dostępne w stacku)
   - Middleware function: `checkRateLimit(userId: string, limit: number, window: number): boolean`
   - Integracja w handlerze POST /generations

### Faza 3: Integracja z LLM i bazą danych

6. **Implementacja LLM service (AI SDK v5)** - Na etapie developmentu skorzystamy z mocków zamiast wywoływania serwisu AI.
   - Utwórz `/src/lib/services/llm.service.ts`
   - Funkcja: `generateFlashcards(sourceText: string, model: string): Promise<FlashcardCandidate[]>`
   - Logika:
     - Utwórz client AI SDK
     - Wyślij prompt z source_text
     - Czekaj odpowiedź (timeout 60s)
     - Parsuj JSON response
     - Waliduj każdy flashcard (front: 1-200, back: 1-500)
     - Zwróć array flashcard'ów

7. **Implementacja GenerationService (CD)** (jeśli nie gotowe)
   - Połączenie z Supabase Client
   - Operacje CRUD na `generations` table
   - Operacje INSERT do `generation_error_logs`
   - Obliczanie hash (crypto.createHash dla md5 library)
   - Mierzenie czasu: `const start = Date.now(); ... const duration = Date.now() - start;`

### Faza 4: Bezpieczeństwo i middleware

8. **Konfiguracja JWT middleware** (jeśli nie istnieje)
   - Sprawdzenie: `src/middleware/index.ts`
   - Verify token z nagłówka Authorization
   - Extract user z token, ustaw `context.locals.session`
   - Return 401 jeśli token invalid

9. **Implementacja rate limiting middleware** (opcjonalnie oddzielnie)
   - Sprawdzenie per user_id
   - Zwrócenie 429 jeśli limit przekroczony

10. **Logging i monitoring**
    - Request logging: timestamp, user_id, model, text_length
    - Error logging: generation_error_logs dla LLM błędów
    - Observability: Metryki duration_ms dla monitorowania

---

## Podsumowanie ścieżki implementacji

```
┌────────────────────────────────────────┐
│ Przygotowanie (Faza 1)                 │
│ - Typy ✓ (już istnieją)                │
│ - GenerationService (nowy)             │
│ - Validator (nowy)                     │
└─────────────┬──────────────────────────┘
              ↓
┌────────────────────────────────────────┐
│ Handler API (Faza 2)                   │
│ - POST /api/generations                │
│ - Rate limiter                         │
│ - Error responses                      │
└─────────────┬──────────────────────────┘
              ↓
┌────────────────────────────────────────┐
│ LLM & DB (Faza 3)                      │
│ - LlmService                           │
│ - GenerationService (CD)               │
│ - Error logging                        │
└─────────────┬──────────────────────────┘
              ↓
┌────────────────────────────────────────┐
│ Security & Monitoring (Faza 4)         │
│ - JWT middleware                       │
│ - Rate limiting                        │
│ - Logging                              │
└────────────────────────────────────────┘

```

---

## Notatki dodatkowe

- **Dokumentacja API:** Zaktualizuj Swagger/OpenAPI spec po implementacji
- **Monitoring:** Ustaw dashboard do śledzenia generation_duration_ms i error rates
- **Future enhancements:** Async generation (webhook), batch processing, model selection UI
- **Compliance:** Upewnij się, że handlowanie danych użytkownika jest GDPR-compliant
