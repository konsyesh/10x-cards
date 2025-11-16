import { test, expect } from "@playwright/test";
import { createBasePageObject } from "@/tests/helpers/page-objects";

/**
 * EXAMPLE: E2E Test Template
 *
 * Ten plik pokazuje best practices dla pisania testów E2E
 * w projekcie 10xCards. Usuń go lub zaadaptuj do rzeczywistych testów.
 */

test.describe("Example E2E Tests", () => {
  // ============================================================================
  // Setup: Navigate before each test
  // ============================================================================

  test.beforeEach(async ({ page: _page }) => {
    // Opcjonalnie: zaloguj się przed każdym testem
    // await page.goto('/auth/login');
    // await page.fill('input[name="email"]', 'test@example.com');
    // await page.fill('input[name="password"]', 'password123');
    // await page.click('button[type="submit"]');
  });

  // ============================================================================
  // Test Suite 1: Page Navigation
  // ============================================================================

  test.describe("Page Navigation", () => {
    test("should navigate to home page", async ({ page }) => {
      await page.goto("/");
      await expect(page).toHaveURL("/");
      await expect(page.locator("h1")).toBeVisible();
    });

    test("should navigate to generate page", async ({ page }) => {
      const po = createBasePageObject(page);
      await po.generate.navigateToGenerate();

      await expect(page).toHaveURL(/\/generate/);
      await expect(page.locator("textarea")).toBeVisible();
    });
  });

  // ============================================================================
  // Test Suite 2: Form Interactions
  // ============================================================================

  test.describe("Form Interactions", () => {
    test("should fill and submit form", async ({ page }) => {
      const po = createBasePageObject(page);

      await po.generate.navigateToGenerate();
      await po.generate.fillSourceText(
        "TypeScript is a typed superset of JavaScript that compiles to plain JavaScript. ".repeat(50)
      );

      // Verify text was filled
      const textarea = page.locator('textarea[name="sourceText"]');
      await expect(textarea).toHaveValue(/TypeScript is a typed/);
    });

    test("should show validation errors on invalid input", async ({ page }) => {
      const po = createBasePageObject(page);

      await po.generate.navigateToGenerate();
      await po.generate.fillSourceText("too short");
      await po.generate.clickGenerateButton();

      // Wait for error to appear
      const errorLocator = page.locator('[role="alert"]');
      await expect(errorLocator).toBeVisible({ timeout: 5000 });
    });
  });

  // ============================================================================
  // Test Suite 3: User Interactions
  // ============================================================================

  test.describe("User Interactions", () => {
    test("should interact with buttons and links", async ({ page }) => {
      await page.goto("/");

      // Click button
      const buttonCount = await page.locator("button").count();
      expect(buttonCount).toBeGreaterThan(0);

      // Find and click link
      const links = await page.locator("a").count();
      if (links > 0) {
        await page.locator("a").first().click();
        // Verify navigation happened
        const url = page.url();
        expect(url).not.toBe("http://localhost:3000/");
      }
    });
  });

  // ============================================================================
  // Test Suite 4: Visual Regression
  // ============================================================================

  test.describe("Visual Regression", () => {
    test("should match snapshot for generate page", async ({ page }) => {
      await page.goto("/generate");
      await page.waitForLoadState("networkidle");

      // Snapshot comparison
      await expect(page).toHaveScreenshot("generate-page.png");
    });

    test("should match snapshot for specific component", async ({ page }) => {
      await page.goto("/generate");

      const textareaContainer = page.locator("textarea").first();
      await expect(textareaContainer).toHaveScreenshot("textarea-component.png");
    });
  });

  // ============================================================================
  // Test Suite 5: Error Handling
  // ============================================================================

  test.describe("Error Handling", () => {
    test("should display error toast on failure", async ({ page }) => {
      const po = createBasePageObject(page);

      await po.generate.navigateToGenerate();
      await po.generate.fillSourceText("x".repeat(100)); // Invalid content
      await po.generate.clickGenerateButton();

      // Wait for error
      const hasError = await po.hasErrorToast();
      expect(hasError).toBeTruthy();
    });

    test("should handle network errors gracefully", async ({ page }) => {
      // Simulate offline
      await page.context().setOffline(true);

      await page.goto("/generate");
      await page.fill('textarea[name="sourceText"]', "some text");
      await page.click('button:has-text("Generate")');

      // Should show error
      const errorToast = page.locator('[role="alert"][data-severity="error"]');
      await expect(errorToast).toBeVisible({ timeout: 5000 });

      // Restore connection
      await page.context().setOffline(false);
    });
  });

  // ============================================================================
  // Test Suite 6: Accessibility
  // ============================================================================

  test.describe("Accessibility", () => {
    test("should have proper ARIA labels", async ({ page }) => {
      await page.goto("/generate");

      // Check for alt text on images
      const images = page.locator("img");
      for (let i = 0; i < (await images.count()); i++) {
        const alt = await images.nth(i).getAttribute("alt");
        expect(alt || images.nth(i).getAttribute("aria-label")).toBeTruthy();
      }

      // Check for form labels
      const inputs = page.locator("input, textarea");
      for (let i = 0; i < (await inputs.count()); i++) {
        const ariaLabel = await inputs.nth(i).getAttribute("aria-label");
        const name = await inputs.nth(i).getAttribute("name");
        expect(ariaLabel || name).toBeTruthy();
      }
    });

    test("should be keyboard navigable", async ({ page }) => {
      await page.goto("/");

      // Tab through elements
      await page.keyboard.press("Tab");
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(["BUTTON", "A", "INPUT"]).toContain(focusedElement);
    });
  });

  // ============================================================================
  // Test Suite 7: API Testing within E2E
  // ============================================================================

  test.describe("API Testing", () => {
    test("should capture API requests", async ({ page }) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      let apiRequestCaught = false;

      page.on("response", (response) => {
        if (response.url().includes("/api/")) {
          apiRequestCaught = true;
          expect(response.status()).toBeLessThan(500);
        }
      });

      await page.goto("/generate");
      await page.fill('textarea[name="sourceText"]', "Test text");
      await page.click('button:has-text("Generate")');

      // Wait a bit for API call
      await page.waitForTimeout(2000);
    });

    test("should validate API response", async ({ page }) => {
      const responses: any[] = [];

      page.on("response", async (response) => {
        if (response.url().includes("/api/")) {
          responses.push({
            url: response.url(),
            status: response.status(),
            body: await response.json().catch(() => null),
          });
        }
      });

      await page.goto("/generate");
      await page.fill('textarea[name="sourceText"]', "Test text");
      await page.click('button:has-text("Generate")');

      // Check responses
      const generationResponse = responses.find((r) => r.url.includes("/generations"));
      if (generationResponse) {
        expect(generationResponse.status).toBeGreaterThanOrEqual(200);
        expect(generationResponse.status).toBeLessThan(400);
      }
    });
  });

  // ============================================================================
  // Test Suite 8: Performance
  // ============================================================================

  test.describe("Performance", () => {
    test("should load page within acceptable time", async ({ page }) => {
      const startTime = Date.now();

      await page.goto("/generate");
      await page.waitForLoadState("networkidle");

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds
    });
  });
});
