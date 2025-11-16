# PLAN TESTÓW – 10xCards (Astro + Supabase)

## 1. WPROWADZENIE

- Cel: Zweryfikowanie jakości i niezawodności aplikacji 10xCards, ze szczególnym naciskiem na:
  - End-to-end przepływ generowania fiszek z pomocą AI i ich zapisywania.
  - Bezpieczne i zgodne z RFC 7807 zarządzanie błędami (problem+json) od backendu po UI.
  - Krytyczne ścieżki autoryzacji (rejestracja, logowanie, reset hasła, weryfikacje).
  - Spójność integracji z Supabase (RLS, insert/update, autoryzacja via SSR cookies).
- Kontekst techniczny:
  - Frontend: Astro 5, React 19, TypeScript 5, Zod, Tailwind 4, shadcn/ui.
  - Backend: Supabase (PostgreSQL + Auth + RLS).
  - AI: AI SDK v5, OpenRouter (klasa `AIService`).
  - Błędy: RFC 7807 (ProblemDetails) i warstwa domenowa błędów.
  - Test runner: Vitest (już skonfigurowany).
- Główne artefakty do zapewnienia jakości:
  - Testy jednostkowe i integracyjne usług (AI, generation, flashcards, auth).
  - Testy kontraktów API (statusy, treść odpowiedzi, nagłówki).
  - Testy komponentów/hooków krytycznych dla przepływu “Generate & Save”.
  - E2E kluczowych ścieżek użytkownika (rekomendacja: Playwright).

## 2. ZAKRES TESTÓW

- W zakresie
  - Architektura błędów i kontrakt problem+json:
    - `src/lib/errors/*`, wrapper `withProblemHandling`, nagłówek `x-request-id`.
    - Valdiacja JSON/Zod i mapowanie błędów na domeny.
  - API endpoints:
    - Generowanie: `src/pages/api/generations.ts:1`.
    - Flashcards: `src/pages/api/flashcards.ts:1`.
    - Auth: `src/pages/api/auth/*.ts` (login, register, logout, reset-password, update-password, resend-verification, verify-otp).
  - Serwisy domenowe:
    - `AIService`: `src/services/ai/ai.service.ts:1`.
    - `GenerationService`: `src/services/generation/generation.service.ts:1`.
    - `FlashcardService`: `src/services/flashcard/flashcard.service.ts:1`.
  - Middleware:
    - `src/middleware/index.ts:1` (SSR Supabase, ochrona ścieżek, x-request-id).
  - HTTP klient i narzędzia:
    - `fetchJson` i ApiError: `src/lib/http/http.fetcher.ts:1`.
    - Rate limit utils: `src/lib/http/http.rate-limit.ts:1`.
    - Base URL helper: `src/lib/http/http.base-url.ts:1`.
    - Response helpers: `src/lib/http/http.responses.ts:1`.
  - Frontend (krytyczny przepływ Generate):
    - Hooki: `use-generation`, `use-save-flashcards`, `use-candidates`, `use-pagination`, `use-keyboard-shortcuts`.
    - Komponenty: `GenerateView.tsx:1`, `SaveSummaryModal.tsx:1`, `CandidatesList.tsx:1`, `SourceTextarea.tsx:1`, `AppErrorBoundary.tsx:1`.
  - DB i migracje (zakres testów integracyjnych/wskaźnikowych):
    - Integralność kluczowych ograniczeń (długości, FK), podstawowe RLS (poziom usług/mocked supabase).
- Poza zakresem
  - Testy wizualne/regresja wizualna.
  - Dostarczalność e-maili (SMTP) – testy manualne i staby na poziomie API.
  - SLO/SLI dostawców zewnętrznych (OpenRouter, Supabase) – testy nieobowiązkowe.
  - Pełne testy wydajnościowe/obciążeniowe (opcjonalna faza później).

## 3. STRATEGIA TESTOWA

- Poziomy i rodzaje testów
  - Statyczne: ESLint, TS typecheck (CI gate).
  - Jednostkowe (Vitest):
    - Błędy, mappery, helpery (pure functions).
    - `AIService` – konfiguracja, settery, retry/backoff, walidacja we/wy, maskowanie.
    - Hooki (mock fetch/ApiError).
  - Integracyjne (Vitest + stuby/mocks):
    - Serwisy `GenerationService` i `FlashcardService` (Supabase mock).
    - API endpoints (wywołanie `APIRoute` z mock `locals.supabase` i sztucznym `Request`).
    - Middleware behavior (x-request-id, 401/redirect, ścieżki publiczne/statyczne).
  - Komponenty (Vitest + React Testing Library + happy-dom):
    - Krytyczny UI: `SaveSummaryModal`, `GenerateView` w trybach "happy path" i "errors" (przy mockowanych hookach).
  - Visual regression (Playwright screenshots):
    - Komponenty krytyczne UI w E2E (SaveSummaryModal, GenerateView, AppErrorBoundary) – za pomocą `expect(page).toHaveScreenshot()`.
  - E2E (Playwright – rekomendacja):
    - Auth: rejestracja, login, logout, reset + update password, verify OTP (z mockami Supabase w test env).
    - Generate & Save: wpisanie tekstu → wygenerowanie → akceptacja/edycja → walidacja → zapis.
- Narzędzia i biblioteki
  - Runner: Vitest (już w projekcie).
  - DOM/React: @testing-library/react, @testing-library/user-event, @testing-library/jest-dom, happy-dom (zamiast jsdom – 10-20x szybszy, oficjalnie wspierany przez Vitest).
  - Network stubbing: Vitest native mocks (`vi.fn()`, `vi.mock()`) jako primary; MSW opcjonalnie dla skomplikowanych scenariuszy integracyjnych.
  - E2E: Playwright (CI matrix: Chromium + WebKit + Firefox).
  - Test data: @faker-js/faker (dynamiczne fixtury).
  - Coverage: @vitest/coverage-v8, @vitest/ui (dashboard w przeglądarce).
- Mocki i staby
  - Supabase SSR/JS client – fabryka stubów z implementacjami `.from().insert().select().single().update().eq()` zwracającymi oczekiwane struktury.
  - AI SDK i `createOpenAI` – pełny mock do testów jednostkowych (bez sieci).
  - `global.fetch` – stub w testach `fetchJson`, hooks i komponentów.
  - Sentry – disabled lub dummy (SENTRY_ENABLED=false).
- Konwencje przypadków testowych (ID)
  - API-GEN-xxx, API-FC-xxx, API-AUTH-xxx, ERR-xxx, HTTP-xxx, SRV-xxx, HOOK-xxx, UI-xxx, MID-xxx, RL-xxx.

## 4. KRYTERIA WEJŚCIA I WYJŚCIA

- Wejście
  - Zdefiniowane .env lokalnie (klucze Supabase, OpenRouter – opcjonalnie dla testów integracyjnych AI).
  - Migracje Supabase zastosowane (lokalnie, jeśli uruchamiane testy integracyjne z DB).
  - Skonfigurowany test runner (Vitest), biblioteki testowe zainstalowane.
- Wyjście
  - 100% przejścia testów krytycznych (auth, generate, save).
  - Pokrycie (linia/gałąź) minimalnie:
    - 80% dla `src/lib/errors`, `src/lib/http`, `src/services/*`.
    - 70% dla hooks i krytycznych komponentów generate.
  - E2E: zielone scenariusze “happy path” Auth + Generate & Save.
  - Brak otwartych defektów o priorytecie P0/P1.

## 5. ŚRODOWISKA TESTOWE

- Lokalnie (DEV)
  - Node 18/20, `npm run dev`, `vitest` / `vitest --ui` (dashboard).
  - Supabase lokalne (Docker) + `npm run seed-user` po `db reset`.
  - `OPENROUTER_API_KEY` opcjonalny (testy integracyjne AI są skipowane bez klucza).
  - Coverage: `vitest --coverage` – raport w `coverage/` dir.
- CI
  - Job: lint + typecheck + unit/integration (headless).
  - Job: Playwright E2E + visual regression (container z Chromium, WebKit).
  - Sekrety CI: SUPABASE_KEY/URL (dla e2e / integracji SSR), bez realnych kluczy do AI.
  - Coverage gates: minimalnie 80% (statements), blokada PR poniżej threshold.
- Baza danych dla testów
  - **Unit/Integration Vitest:** Supabase mock factory pattern (szybko, bez sieciowości).
  - **E2E Playwright:** Supabase local CLI lub Testcontainers (`@testcontainers/supabase`).
  - **Dane testowe:** @faker-js/faker dla dynamicznych fixtures; seed: użytkownik testowy, pusta baza kolekcji/flashcards.

## 6. HARMONOGRAM I ZASOBY

- Tydzień 1
  - Dni 1–2: Jednostkowe – `lib/errors`, `lib/http`, `http.rate-limit`, `http.fetcher`, `AppLogger`.
  - Dni 3–4: Serwisy – `FlashcardService`, `GenerationService` (supabase mock).
  - Dzień 5: API – `/api/flashcards`, `/api/generations` (mock locals.supabase, Zod validate, problem+json).
- Tydzień 2
  - Dni 1–2: Auth API (login, register, logout, reset, update, resend, verify-otp) – mapping supabase auth errors.
  - Dni 3–4: Hooki + kluczowe komponenty (React Testing Library).
  - Dzień 5: E2E smoke (Playwright), dokumentacja testowa + raporty.
- Zespół
  - 1–2 dev-in-test (unit/integration), 1 QA (E2E, scenariusze, regresja), wsparcie dev (infrastruktura CI/CD).

## 7. ZARZĄDZANIE RYZYKIEM TESTOWYM

- Niestabilność AI providerów i sieci
  - Mitigacja: pełne mocki `AIService` i skip integracji AI bez klucza; retry w testach integracyjnych za flagą.
- Rate limit w testach
  - Mitigacja: użycie `vi.useFakeTimers()` i kontrola czasu; reset limiterów per test.
- Różnice środowiskowe (SSR cookies, nagłówki)
  - Mitigacja: centralne helpery testowe do konstrukcji `Request`, `locals`, `cookies`.
- RLS i uprawnienia
  - Mitigacja: testy usług z mockiem supabase w domenie użytkownika; testy E2E tylko smoke (głębokie testy RLS poza zakresem).
- Spójność RFC 7807 statusów
  - Mitigacja: testy kontraktowe endpointów; niezgodności (np. rate limit → 502 zamiast 429) raportować jako defekty.

## 8. METRYKI I RAPORTOWANIE

- Metryki
  - Pokrycie kodu (linie/gałęzie) per pakiet (`lib`, `services`, `pages/api`, `components/hooks`).
  - Czas trwania testów i flake-rate (ponowne uruchomienia).
  - Defect density i TTR (time-to-resolve) wg priorytetu.
- Raportowanie
  - Raport CI (junit/coverage) artefakty na każdym PR.
  - Tygodniowe podsumowania QA: status zakresu, ryzyka, blokery, trendy defektów.

## 9. SZCZEGÓŁOWE PRZYPADKI TESTOWE (WYKAZ)

- Architektura błędów / RFC 7807
  - ERR-001: `withProblemHandling` dodaje `x-request-id`; mapuje DomainError → problem+json.
  - ERR-002: `toProblem` poprawnie wypełnia type/title/status/detail/code/instance.
  - ERR-003: `validateBody` – invalid JSON → problem+json z flatten w meta.
  - ERR-004: `map-zod` i `map-zodAuth` – poprawne domeny i statusy.
  - ERR-005: `map-supabase-auth` – kody: invalid-credentials(401), user-exists(409), rate-limited(429), token-expired(410), email-not-confirmed(403), fallback provider-error(502).
- HTTP utils
  - HTTP-001: `fetchJson` – sukces JSON → dane, błędy problem+json → ApiError z `requestId`.
  - HTTP-002: `http.responses` – `successResponse`, `createdResponse`, `noContentResponse` nagłówki i statusy.
  - HTTP-003: `http.base-url` – priorytetyzacja `PUBLIC_SITE_URL` i fallback do `origin`.
  - RL-001: `createInMemoryRateLimiter` – okno, reset, max; `makeKeyIp`, `makeKeyIpEmail`.
- AIService (część już pokryta – rozszerzenia)
  - SRV-AI-001: settery walidują zakresy; `configure` scala wartości.
  - SRV-AI-002: `validateInput` i `validateOutput` – brak schema/prompt → błędy domenowe 400/422.
  - SRV-AI-003: `retryWithBackoff` – retry tylko dla retryable; `calculateBackoff` z/j bez jitter.
  - SRV-AI-004: `getRequestHeaders` – whitelist i `X-*`.
  - SRV-AI-005: `maskSensitiveData` – maskuje e-maile, przycina długie prompty.
- GenerationService
  - SRV-GEN-001: Happy path – insert pending → AI success → validate/filter → update completed → DTO (czasy/ilości).
  - SRV-GEN-002: Fallback path – AI throws → mock path → completed z wynikami.
  - SRV-GEN-003: Błąd update – provider-error (mapa) i logowanie błędów do `generation_error_logs`.
  - SRV-GEN-004: Hash/długość wyliczane zgodnie z wejściem.
- FlashcardService
  - SRV-FC-001: Happy path – batch insert, mapowanie do DTO.
  - SRV-FC-002: `generation_id` innego usera → `GenerationNotFound` (404, bez ujawniania).
  - SRV-FC-003: `collection_id` brak/dostęp inny → `CollectionNotFound` lub `CollectionAccessDenied` (404).
  - SRV-FC-004: Insert failure → `DatabaseError` (500).
- API – Generations (`src/pages/api/generations.ts:1`)
  - API-GEN-001: 201 dla poprawnego `source_text` (1000–50000) i default model.
  - API-GEN-002: 400 dla zbyt krótkiego/długiego `source_text`.
  - API-GEN-003: 401 gdy brak `locals.user` (middleware).
  - API-GEN-004: Rate limit: 5/min per user – oczekiwany problem+json (UWAGA: weryfikacja zgodności statusu → defekt jeśli != 429).
  - API-GEN-005: `x-request-id` zawsze w odpowiedzi.
- API – Flashcards (`src/pages/api/flashcards.ts:1`)
  - API-FC-001: 201/200 dla poprawnej paczki (1–100).
  - API-FC-002: 400 dla pustej tablicy/invalid `source`.
  - API-FC-003: 404 gdy `generation_id` spoza domeny usera.
  - API-FC-004: 401 gdy brak `locals.user`.
  - API-FC-005: problem+json format i `x-request-id`.
- API – Auth (`src/pages/api/auth/*.ts`)
  - API-AUTH-001: login – 200, cookies via SSR (symulacja).
  - API-AUTH-002: login – 401 invalid-credentials (map-supabase-auth).
  - API-AUTH-003: register – 201 (auto session) lub 200 z komunikatem (require email confirm).
  - API-AUTH-004: reset-password – 200 neutralny komunikat (brak enumeracji).
  - API-AUTH-005: update-password – 401 bez sesji recovery; 410 token-expired; 200 sukces.
  - API-AUTH-006: verify-otp – 200 sukces; 410 expired; 401 invalid-code; 429 limiter.
  - API-AUTH-007: resend-verification – 200 neutralny; 429 limiter.
  - API-AUTH-008: logout – 204, problem+json w razie błędu.
- Middleware (`src/middleware/index.ts:1`)
  - MID-001: ścieżki publiczne/styczne przechodzą; inne bez usera → 401 problem+json (API) lub 302 redirect (SSR).
  - MID-002: zalogowany user na `/auth/login|register` → 302 `/generate`.
  - MID-003: nagłówek `x-request-id` dokładany na wszystkich odpowiedziach.
- Hooki UI
  - HOOK-001: `useGeneration` – loading → completed; ApiError → error (code/message/meta log).
  - HOOK-002: `useSaveFlashcards` – chunking 100; sumuje `saved_count`; błędy ApiError → state error.
  - HOOK-003: `useCandidates` – accept/reject/update/undo/acceptAll i walidacje długości.
  - HOOK-004: `usePagination` – granice stron, totalPages, reset.
  - HOOK-005: `useKeyboardShortcuts` – omija input/textarea, wywołuje handlery.
  - HOOK-006: `useNavigationInterceptor` – interceptuje linki wewnętrzne przy unsaved, ignoruje zewnętrzne.
- Komponenty
  - UI-001: `SaveSummaryModal` – liczby akceptowanych, stany loading/error, akcje confirm/cancel.
  - UI-002: `AppErrorBoundary` – render fallback przy błędzie.
- Logger (`src/lib/logger.ts:1`)
  - LOG-001: redakcja wrażliwych kluczy; maskowanie e-maili; brak “cause” w serializacji.

## 10. DANE TESTOWE I FIXTURES

- Użytkownik testowy (seed): e-mail + hasło z `.env` (lokalnie).
- Źródło tekstu do generacji: min 1000 znaków (Lorem ipsum, generatory).
- Zestawy flashcards:
  - Poprawne (różne `source`).
  - Brzegowe: długości front/back, 101 elementów.
- Supabase mock:
  - Kolekcje/generations/flashcards – minimalne rekordy do walidacji referencji i uprawnień.
- Problem+json fixtures: szablony dla typowych błędów.

## 11. KOLEJNOŚĆ IMPLEMENTACJI TESTÓW

1. Błędy i HTTP helpers (szybkie i stabilne).
2. Serwisy: Flashcard/Generation (z supabase mock).
3. API endpoints: generations/flashcards + auth (mock locals.supabase + validate Zod).
4. Hooki i kluczowe komponenty (React Testing Library).
5. Middleware zachowania i kontrakty.
6. E2E smoke ścieżek krytycznych (opcjonalnie na końcu).

## 12. INTEGRACJA Z CI/CD

- Kroki pipeline:
  - Lint + typecheck → unit/integration (Vitest, report coverage) → e2e smoke (opcjonalnie).
- Bramy jakości:
  - Minimal coverage per pakiet (sekcja 4).
  - Blokada PR przy failu testów krytycznych/api kontraktów.
- Artefakty:
  - Raporty coverage, junit, zrzuty problem+json w razie błędów.

## 13. UWAGI SPECYFICZNE DLA PROJEKTU

- **RFC 7807:** Wymagane ścisłe testy kontraktowe nagłówków i treści (status + content-type + `x-request-id`).
- **Rate limiting:** część endpointów używa współdzielonego `http.rate-limit.ts`, a generacje mają własną mapę – testy powinny ujawnić niespójności (np. oczekiwane 429).
- **AI:** Testy integracyjne warunkowe (skip bez klucza), głównie jednostki + mocki.
- **SSR cookies:** testy API/middleware z mockami `cookies.setAll()` (bez realnego przeglądarkowego storage).
- **Network mocking strategy:**
  - **Domyślnie:** `vi.fn()`, `vi.mock()`, `vi.spyOn()` z Vitest (szybko, proste, wystarczające).
  - **Dla hooków/komponentów:** Mock `global.fetch` w `beforeEach()`.
  - **MSW opcjonalnie:** Tylko dla skomplikowanych scenariuszy integracyjnych gdzie potrzebne jest realistyczne HTTP mocking.
- **Test data:** Używaj `@faker-js/faker` do generowania dynamicznych fixture'ów zamiast hardcoded wartości.
- **Coverage gates:** Skonfiguruj w `vitest.config.ts`:
  - `statements: 80%`, `branches: 75%`, `functions: 80%`, `lines: 80%`.
  - Blokada PR przy spadku poniżej threshold.
- **happy-dom zamiast jsdom:** Domyślny DOM environment w `vitest.config.ts` – 10-20x szybszy, wystarczający dla tego projektu.

## 14. INSTALACJA ZALEŻNOŚCI TESTOWYCH

```bash
npm install -D \
  @testing-library/react \
  @testing-library/user-event \
  @testing-library/jest-dom \
  happy-dom \
  @vitest/ui \
  @vitest/coverage-v8 \
  @faker-js/faker \
  @playwright/test
```

**Setup files do utworzenia:**

1. `vitest.config.ts` – environment: happy-dom, coverage thresholds, setupFiles.
2. `src/tests/setup.ts` – global mocks (fetch, Sentry), custom matchers.
3. `src/tests/factories/` – Supabase mock factory pattern.
4. `playwright.config.ts` – browsers, baseURL, screenshots (visual regression).

---

## 15. ZAŁĄCZNIKI I ODNIESIENIA

- Kluczowe pliki:
  - AI Service: `src/services/ai/ai.service.ts:1`, błędy: `src/services/ai/ai.errors.ts:1`.
  - Generation: `src/services/generation/generation.service.ts:1`, błędy: `src/services/generation/generation.errors.ts:1`.
  - Flashcards: `src/services/flashcard/flashcard.service.ts:1`, błędy: `src/services/flashcard/flashcard.errors.ts:1`.
  - API: `src/pages/api/generations.ts:1`, `src/pages/api/flashcards.ts:1`, `src/pages/api/auth/*.ts`.
  - Errors core: `src/lib/errors/index.ts:1`, `src/lib/errors/http.ts:1`, `src/lib/errors/registry.ts:1`, `src/lib/errors/map-zod.ts:1`, `src/lib/errors/map-supabase-auth.ts:1`, `src/lib/errors/map-supabase.ts:1`.
  - HTTP utils: `src/lib/http/http.fetcher.ts:1`, `src/lib/http/http.responses.ts:1`, `src/lib/http/http.rate-limit.ts:1`, `src/lib/http/http.base-url.ts:1`.
  - Middleware: `src/middleware/index.ts:1`.
  - Hooki: `src/components/hooks/*`.
  - UI: `src/components/generate/*`, `src/components/AppErrorBoundary.tsx:1`.
- Istniejące testy:
  - `src/pages/api/__tests__/error-handling.test.ts:1`.
  - `src/services/ai/ai.service.test.ts:1`, `src/services/ai/ai.service.integration.test.ts:1`.

---

## 16. SCRIPT'Y NPM (REKOMENDACJA)

Dodaj do `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:watch": "vitest --watch",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug"
  }
}
```

---

**Status:** Plan zaktualizowany z rekomendacjami technologicznymi. Gotowy do implementacji.
