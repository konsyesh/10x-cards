# 🧪 Środowisko Testów – Setup & Wdrożenie

**Status:** ✅ GOTOWE DO UŻYTKU

Dokument opisuje pełne środowisko testów wdrożone dla projektu 10xCards zgodnie z rekomendacjami z `test-plan-codex.md`.

## 📋 Co zostało wdrożone

### 1. ✅ Zależności testowe

- `@testing-library/react` – testowanie komponentów React
- `@testing-library/user-event` – symulacja interakcji użytkownika
- `@testing-library/jest-dom` – custom matchers dla DOM
- `happy-dom` – lekki DOM environment (10-20x szybszy niż jsdom)
- `@vitest/ui` – dashboard Vitest w przeglądarce
- `@vitest/coverage-v8` – raport pokrycia kodu
- `@faker-js/faker` – generowanie dynamicznych danych testowych
- `@playwright/test` – E2E testing framework

**Instalacja:** Już zainstalowane (`npm install -D ...`)

### 2. ✅ Konfiguracja Vitest

**Plik:** `vitest.config.ts`

```typescript
- Environment: happy-dom (zamiast jsdom)
- Setup: src/tests/setup.ts
- Coverage thresholds:
  - statements: 80%
  - branches: 75%
  - functions: 80%
  - lines: 80%
- Global test timeout: 10s
- Isolated environment per test
```

### 3. ✅ Konfiguracja Playwright

**Plik:** `playwright.config.ts`

```typescript
- Browsers: Chromium, WebKit, Firefox
- Web server: Astro dev (auto-start)
- Screenshots: Na failure
- Videos: Na failure
- Traces: Na first retry
- Parallel execution: Enabled
- Base URL: http://localhost:3000
- Test directory: src/tests/e2e/
```

### 4. ✅ Setup file Vitest

**Plik:** `src/tests/setup.ts`

Zawiera:

- Global fetch mock
- Console mocks (reduce noise)
- Environment variables
- Custom matchers:
  - `toBeProblemJSON()` – validacja RFC 7807
  - `toBeApiError()` – validacja ApiError
- Test hooks (beforeEach, afterEach)

### 5. ✅ Factories & Mocks

**Plik:** `src/tests/factories/supabase.factory.ts`

Fabryki dla:

- Mock users & sessions
- Mock query builders
- Mock Supabase client
- Mock flashcards, generations, collections
- Helper do mockowania zapytań

### 6. ✅ Test Helpers

**Katalog:** `src/tests/helpers/`

#### `fetch.mock.ts`

- `mockFetchJsonSuccess()` – sukces JSON
- `mockFetchJsonError()` – błąd (problem+json)
- `mockFetchNetworkError()` – błąd sieci
- `mockFetchByUrl()` – różne response'y dla różnych URL'i

#### `api.mock.ts`

- `createMockRequest()` – mock Request z headersami
- `createMockAstroContext()` – mock Astro context
- `createMockCookies()` – mock cookies
- `verifyProblemJsonResponse()` – asertacja RFC 7807
- `verifySuccessResponse()` – asertacja success

#### `page-objects.ts`

- Page Object Models:
  - `AuthPageObject` – auth page interactions
  - `GeneratePageObject` – generate page interactions
  - `CollectionPageObject` – collection management
- `createBasePageObject()` – helper factory

### 7. ✅ Struktura katalogów

```
src/tests/
├── setup.ts                 # Global Vitest setup
├── factories/
│   └── supabase.factory.ts  # Mock factories
├── helpers/
│   ├── fetch.mock.ts        # Fetch mocks
│   ├── api.mock.ts          # API helpers
│   ├── page-objects.ts      # Playwright POM
│   └── index.ts             # Centralized exports
├── e2e/
│   ├── __snapshots__/       # Visual regression
│   ├── auth.e2e.ts          # (do implementacji)
│   ├── generate-save.e2e.ts # (do implementacji)
│   └── fixtures.ts          # (do implementacji)
├── examples/
│   ├── example.unit.test.ts # Unit test template
│   └── example.e2e.test.ts  # E2E test template
└── README.md                # Testing guide
```

### 8. ✅ NPM Scripts

```json
"test": "vitest"                    # Run all tests
"test:watch": "vitest --watch"      # Watch mode
"test:ui": "vitest --ui"            # Dashboard
"test:coverage": "vitest --coverage" # Coverage report
"test:e2e": "playwright test"       # E2E tests
"test:e2e:ui": "playwright test --ui" # E2E dashboard
"test:e2e:debug": "playwright test --debug" # E2E debugger
```

### 9. ✅ CI/CD Pipeline

**Plik:** `.github/workflows/test.yml`

- Unit/Integration tests (Node 18 & 20)
- E2E tests (Chromium, WebKit, Firefox)
- Coverage check (80% thresholds)
- Artifacts upload (coverage, Playwright reports)
- Supabase service (dla E2E)

### 10. ✅ Dokumentacja

**Plik:** `src/tests/README.md`

Zawiera:

- Szybki start
- Przykłady pisania testów (unit, component, E2E)
- Jak używać helpers i factories
- Coverage requirements
- Debugging tips
- Best practices
- FAQ

## 🚀 Jak zacząć

### 1. Uruchom pojedynczy test

```bash
npm test -- src/tests/examples/example.unit.test.ts
```

### 2. Uruchom wszystkie testy

```bash
npm test
```

### 3. Obserwuj testy w real-time

```bash
npm run test:watch
```

### 4. Otwórz dashboard

```bash
npm run test:ui
```

Dostępny na: `http://localhost:51204/__vitest__/`

### 5. Sprawdź pokrycie kodu

```bash
npm run test:coverage
```

Raport: `coverage/index.html`

### 6. Uruchom E2E testy

```bash
# Najpierw upewnij się, że dev server działa
npm run dev

# W innym terminalu
npm run test:e2e
```

### 7. Debug E2E testy

```bash
npm run test:e2e:debug
```

## 📊 Struktura testów – gdzie pisać?

| Typ                   | Plik                                       | Framework    | Env          |
| --------------------- | ------------------------------------------ | ------------ | ------------ |
| Unit (funkcje)        | `src/lib/**/__tests__/*.test.ts`           | Vitest       | happy-dom    |
| Integration (serwisy) | `src/services/**/__tests__/*.test.ts`      | Vitest       | happy-dom    |
| API endpoints         | `src/pages/api/__tests__/*.test.ts`        | Vitest       | happy-dom    |
| React components      | `src/components/**/__tests__/*.test.tsx`   | Vitest + RTL | happy-dom    |
| Custom hooks          | `src/components/hooks/__tests__/*.test.ts` | Vitest + RTL | happy-dom    |
| E2E workflows         | `src/tests/e2e/*.e2e.ts`                   | Playwright   | Real browser |

## 🔍 Gdzie znaleźć helpers?

```typescript
// Zaimportuj z centralizowanej lokalizacji
import {
  // Fetch mocks
  mockFetchJsonSuccess,
  mockFetchJsonError,
  mockFetchNetworkError,

  // Supabase
  createMockSupabaseClient,
  createMockFlashcard,
  createMockGeneration,

  // API
  createMockRequest,
  createMockAstroContext,
  verifyProblemJsonResponse,

  // Page Objects (Playwright)
  createBasePageObject,
} from "@/tests/helpers";
```

## ✨ Best Practices (wdrożone)

✅ **Mock Isolation** – reset mocks w `beforeEach()`
✅ **Type Safety** – TypeScript types dla mocków
✅ **Custom Matchers** – `toBeProblemJSON()`, `toBeApiError()`
✅ **Setup File** – globalne konfiguracje w `setup.ts`
✅ **Factory Pattern** – reusable data creators
✅ **Page Objects** – Playwright POM pattern
✅ **Coverage Gates** – thresholds w konfiguracji
✅ **CI/CD Integration** – GitHub Actions workflow

## ⚠️ Uwagi

1. **happy-dom vs jsdom:**
   - Domyślnie: `happy-dom` (szybszy)
   - Jeśli problemy: zmień na `jsdom` w `vitest.config.ts`

2. **Network Mocking:**
   - Default: Vitest native (`vi.fn()`, `vi.mock()`)
   - MSW: opcjonalnie dla skomplikowanych scenariuszy

3. **E2E z Supabase:**
   - Local: Testcontainers (`@testcontainers/supabase`)
   - CI: Supabase service w GitHub Actions

4. **Visual Regression:**
   - Playwright screenshots automatycznie
   - Update: `UPDATE_SNAPSHOTS=true npm run test:e2e`

## 📚 Następne kroki

1. **Przejdź do kategorii testów (sekcja 11 z `test-plan-codex.md`):**
   - Tydzień 1: Błędy → HTTP helpers → Serwisy → API
   - Tydzień 2: Auth → Hooki → Komponenty → E2E

2. **Zaadaptuj template'y:**
   - `src/tests/examples/example.unit.test.ts`
   - `src/tests/examples/example.e2e.test.ts`

3. **Konfiguruj CI/CD:**
   - Test `.github/workflows/test.yml` w repozytorium
   - Ustaw secrets: `SUPABASE_URL`, `SUPABASE_ANON_KEY`

4. **Ustaw Git hooks:**
   ```bash
   npm install -D husky
   npx husky install
   npx husky add .husky/pre-commit "npm run lint && npm test -- --run"
   ```

## 🎯 Coverage Goals

| Pakiet                 | Target  |
| ---------------------- | ------- |
| `src/lib/errors`       | 80%     |
| `src/lib/http`         | 80%     |
| `src/services/*`       | 80%     |
| `src/components/hooks` | 70%     |
| **Łącznie**            | **80%** |

Sprawdzaj: `npm run test:coverage`

---

**Dokument:** `.ai/testing-environment-setup.md`
**Wersja:** 1.0
**Data:** 2025-01-15
**Status:** ✅ LIVE
