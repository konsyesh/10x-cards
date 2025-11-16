# 🚀 QUICK START – Testy w 5 minut

## ⚡ Najszybszy początek

### 1. Uruchom tests

```bash
npm test
```

### 2. Otwórz dashboard

```bash
npm run test:ui
```

### 3. Obserwuj zmiany

```bash
npm run test:watch
```

### 4. Sprawdź pokrycie

```bash
npm run test:coverage
# Otwórz: coverage/index.html
```

### 5. E2E testy

```bash
# Terminal 1
npm run dev

# Terminal 2
npm run test:e2e
```

---

## 📁 Gdzie pisać testy?

```typescript
// Unit test
src/lib/**/__tests__/*.test.ts

// Service test
src/services/**/__tests__/*.test.ts

// API endpoint test
src/pages/api/__tests__/*.test.ts

// React component test
src/components/**/__tests__/*.test.tsx

// E2E test
src/tests/e2e/*.e2e.ts
```

---

## 📚 Copy-Paste Templates

### Unit Test

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockFetchJsonSuccess } from "@/tests/helpers";

describe("My Feature", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should do something", async () => {
    global.fetch = mockFetchJsonSuccess({ id: "123" });

    const response = await fetch("/api/test");
    const data = await response.json();

    expect(data.id).toBe("123");
  });
});
```

### Component Test

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { MyButton } from './MyButton';

describe('MyButton', () => {
  it('should render and click', async () => {
    const user = userEvent.setup();
    render(<MyButton>Click</MyButton>);

    const button = screen.getByRole('button', { name: /click/i });
    await user.click(button);

    expect(button).toBeInTheDocument();
  });
});
```

### E2E Test

```typescript
import { test, expect } from "@playwright/test";
import { createBasePageObject } from "@/tests/helpers/page-objects";

test("should generate flashcards", async ({ page }) => {
  const po = createBasePageObject(page);

  await po.generate.navigateToGenerate();
  await po.generate.fillSourceText("Lorem ipsum...");
  await po.generate.clickGenerateButton();
  await po.generate.waitForGenerationResult();

  const count = await po.generate.getFlashcardCount();
  expect(count).toBeGreaterThan(0);
});
```

---

## 🧪 Helpers Cheat Sheet

### Fetch Mocks

```typescript
import { mockFetchJsonSuccess, mockFetchJsonError, mockFetchNetworkError } from "@/tests/helpers";

// Success
global.fetch = mockFetchJsonSuccess({ id: "123" });

// Error
global.fetch = mockFetchJsonError(400, { type: "error" });

// Network error
global.fetch = mockFetchNetworkError("Connection failed");
```

### Supabase Mocks

```typescript
import { createMockSupabaseClient, createMockFlashcard, createMockGeneration } from "@/tests/helpers";

const { supabase, from } = createMockSupabaseClient();
const flashcard = createMockFlashcard({ front: "Q?", back: "A" });
const generation = createMockGeneration({ status: "completed" });
```

### API Mocks

```typescript
import { createMockRequest, createMockAstroContext, verifyProblemJsonResponse } from "@/tests/helpers";

const request = createMockRequest("POST", { sourceText: "test" });
const context = createMockAstroContext({
  locals: { user: { id: "user-123", email: "test@example.com" } },
});

// Verify RFC 7807
await verifyProblemJsonResponse(response, 400);
```

### Page Objects (E2E)

```typescript
import { createBasePageObject } from "@/tests/helpers/page-objects";

const po = createBasePageObject(page);

await po.auth.navigateToLogin();
await po.auth.fillLoginForm("test@example.com", "password");
await po.auth.submitForm();
await po.auth.isLoggedIn(); // true

await po.generate.navigateToGenerate();
await po.generate.fillSourceText("text");
await po.generate.clickGenerateButton();
```

---

## 💡 Porady

### Uruchom konkretny test

```bash
npm test -- --grep "should do something"
```

### Uruchom jeden plik

```bash
npm test -- src/lib/errors/__tests__/my.test.ts
```

### Debug test

```bash
npm test -- --inspect-brk
# Otwórz: chrome://inspect
```

### Update snapshoty (E2E)

```bash
UPDATE_SNAPSHOTS=true npm run test:e2e
```

---

## 📊 Coverage Requirements

| Pakiet                 | Target |
| ---------------------- | ------ |
| `src/lib/errors`       | 80%    |
| `src/lib/http`         | 80%    |
| `src/services/*`       | 80%    |
| `src/components/hooks` | 70%    |

Sprawdzaj: `npm run test:coverage`

---

## 📚 Dokumentacja Pełna

- **`src/tests/README.md`** – Kompletny przewodnik
- **`.ai/testing-environment-setup.md`** – Setup details
- **`.ai/test-plan-codex.md`** – Test plan

---

## ✅ Status

**🟢 READY FOR CODING**

Wszystko jest gotowe. Zacznij pisać testy! 🎉
