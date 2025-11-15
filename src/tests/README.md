# 10xCards Testing Guide

Kompleksowy przewodnik po wdrażaniu i uruchamianiu testów zgodnie z planem testów z `test-plan-codex.md`.

## 📁 Struktura katalogów

```
src/tests/
├── setup.ts                 # Global Vitest setup (mocks, matchers)
├── factories/
│   └── supabase.factory.ts  # Supabase mock factory pattern
├── helpers/
│   ├── fetch.mock.ts        # Global fetch mocks
│   ├── api.mock.ts          # API endpoint test helpers
│   ├── page-objects.ts      # Playwright Page Object Models
│   └── index.ts             # Centralized exports
├── e2e/
│   ├── __snapshots__/       # Playwright visual regression screenshots
│   ├── auth.e2e.ts          # Auth flow E2E tests
│   ├── generate-save.e2e.ts # Generate & Save E2E tests
│   └── fixtures.ts          # E2E test data
└── README.md                # This file
```

## 🚀 Szybki start

### 1. Uruchamianie testów jednostkowych

```bash
# Uruchom wszystkie testy
npm test

# Uruchom w trybie watch (auto-reload na zmiany)
npm run test:watch

# Uruchom z dashboard UI
npm run test:ui

# Uruchom z coverage report
npm run test:coverage
```

### 2. Uruchamianie testów E2E

```bash
# Uruchom wszystkie E2E testy
npm run test:e2e

# Uruchom z Playwright UI
npm run test:e2e:ui

# Debug mode (z inspektorem)
npm run test:e2e:debug
```

## 🧪 Pisanie testów

### Testy jednostkowe (Vitest)

**Plik:** `src/pages/api/__tests__/example.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { createMockRequest, createMockSupabaseClient, mockFetchJsonSuccess } from "@/tests/helpers";

describe("Example API Endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return success response", async () => {
    const request = createMockRequest("POST", {
      sourceText: "Lorem ipsum...",
    });

    const { supabase } = createMockSupabaseClient();
    // ... test logic
  });

  it("should handle errors gracefully", async () => {
    // ... error test
  });
});
```

### Testy komponentów React

**Plik:** `src/components/__tests__/Button.test.tsx`

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { Button } from '@/components/Button';

describe('Button Component', () => {
  it('should render and handle click', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<Button onClick={handleClick}>Click me</Button>);

    const button = screen.getByRole('button', { name: /click me/i });
    await user.click(button);

    expect(handleClick).toHaveBeenCalledOnce();
  });
});
```

### Testy E2E (Playwright)

**Plik:** `src/tests/e2e/generate-save.e2e.ts`

```typescript
import { test, expect } from "@playwright/test";
import { createBasePageObject } from "@/tests/helpers/page-objects";

test.describe("Generate & Save Flow", () => {
  test("should generate and save flashcards", async ({ page }) => {
    const po = createBasePageObject(page);

    await po.generate.navigateToGenerate();
    await po.generate.fillSourceText("Lorem ipsum dolor sit amet, consectetur adipiscing elit. ".repeat(50));

    await po.generate.clickGenerateButton();
    await po.generate.waitForGenerationResult();

    const count = await po.generate.getFlashcardCount();
    expect(count).toBeGreaterThan(0);

    await po.generate.acceptFlashcard(0);
    await po.generate.openSaveModal();
    await po.generate.waitForSaveModal();
    await po.generate.confirmSave();

    await expect(page).toHaveURL(/\/collections/);
  });
});
```

## 🔧 Helpers i Utilities

### Supabase Mocks

```typescript
import { createMockSupabaseClient, createMockFlashcard } from "@/tests/helpers";

const { supabase, from } = createMockSupabaseClient();

// Mock query builder
from.mockReturnValue({
  select: vi.fn().mockResolvedValue({
    data: [createMockFlashcard()],
    error: null,
  }),
});
```

### Fetch Mocks

```typescript
import { mockFetchJsonSuccess, mockFetchJsonError, mockFetchNetworkError } from "@/tests/helpers";

// Success response
global.fetch = mockFetchJsonSuccess({ id: "123" }, { status: 201 });

// Error response
global.fetch = mockFetchJsonError(400, {
  type: "urn:error:validation",
  title: "Validation Error",
  status: 400,
});

// Network error
global.fetch = mockFetchNetworkError("Connection failed");
```

### API Mocks

```typescript
import { createMockRequest, createMockAstroContext, verifyProblemJsonResponse } from "@/tests/helpers";

const request = createMockRequest("POST", { sourceText: "test" });
const context = createMockAstroContext({
  locals: {
    user: { id: "user-123", email: "test@example.com" },
  },
});
```

## 📊 Coverage Requirements

Minimalne wymagania pokrycia kodu dla różnych pakietów:

| Pakiet             | Statements | Branches | Functions | Lines |
| ------------------ | ---------- | -------- | --------- | ----- |
| `lib/errors`       | 80%        | 75%      | 80%       | 80%   |
| `lib/http`         | 80%        | 75%      | 80%       | 80%   |
| `services/*`       | 80%        | 75%      | 80%       | 80%   |
| `components/hooks` | 70%        | 65%      | 70%       | 70%   |

Uruchom: `npm run test:coverage` aby wygenerować raport.

## 🎥 Playwright Visual Regression

Testy automatycznie porównują screenshots:

```typescript
test("should match visual snapshot", async ({ page }) => {
  await page.goto("/generate");

  // Porównaj ze snapshotem
  await expect(page).toHaveScreenshot();
});
```

Aktualizuj snapshoty: `UPDATE_SNAPSHOTS=true npm run test:e2e`

## 🐛 Debugging

### Vitest UI Dashboard

```bash
npm run test:ui
```

Dostępny na: `http://localhost:51204/__vitest__/`

### Playwright Inspector

```bash
npm run test:e2e:debug
```

Interaktywny debugger z krokami po krokach.

### Playwright Trace Viewer

Traces są zapisywane w `test-results/` (tylko na failure).

```bash
npx playwright show-trace test-results/trace.zip
```

## 🔒 Best Practices

### ✅ DO:

- Testuj behavior, nie implementation details
- Używaj `vi.spyOn()` zamiast `vi.mock()` gdy możesz
- Grupuj testy w `describe()` blokach
- Zmockuj zewnętrzne API i sieć
- Pisz descriptive assertion messages
- Resetuj mocks w `beforeEach()`

### ❌ DON'T:

- Nie testuj bibliotek 3rd party (np. Zod, React Router)
- Nie fixture'uj danych bez sensu (używaj @faker-js/faker)
- Nie tul timeout'ów – zamiast tego czekaj na warunki
- Nie pisz testów dla komponentów UI bez interakcji
- Nie commituj snapshoty bez przeglądu

## 📚 Referencje

- [Vitest Docs](https://vitest.dev/)
- [Playwright Docs](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
- [RFC 7807 Problem Details](https://www.rfc-editor.org/rfc/rfc7807)
- Plan testów: `/.ai/test-plan-codex.md`

## ❓ FAQ

**P: Ile czasu powinny trwać testy?**
A: Jednostkowe < 5s, E2E < 30s per test. Optymalizuj lub splituj na równoległe.

**P: Jak mockować Supabase RLS?**
A: RLS testy poza zakresem (smoke testy E2E). Unit testy: mock factory pattern.

**P: Czy muszę pisać E2E dla każdego feature?**
A: Nie. E2E dla critical paths: auth, generate, save. Reszta: unit + integration.

**P: Czy test data powinny być w fixtures czy w fabrykach?**
A: Factory pattern (`@faker-js/faker`) dla unit/integration. Fixtures dla E2E (seed).
