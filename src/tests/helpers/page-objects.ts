import { Page } from '@playwright/test';

/**
 * Page Object Model Helpers for Playwright E2E Tests
 * Encapsulates selectors and interactions with page elements
 */

// ============================================================================
// Auth Page Objects
// ============================================================================

export class AuthPageObject {
  constructor(private page: Page) {}

  async navigateToLogin() {
    await this.page.goto('/auth/login');
  }

  async navigateToRegister() {
    await this.page.goto('/auth/register');
  }

  async fillLoginForm(email: string, password: string) {
    await this.page.fill('input[name="email"]', email);
    await this.page.fill('input[name="password"]', password);
  }

  async fillRegisterForm(email: string, password: string, confirmPassword: string) {
    await this.page.fill('input[name="email"]', email);
    await this.page.fill('input[name="password"]', password);
    await this.page.fill('input[name="confirmPassword"]', confirmPassword);
  }

  async submitForm() {
    await this.page.click('button[type="submit"]');
  }

  async getErrorMessage() {
    return this.page.textContent('[role="alert"]');
  }

  async isLoggedIn() {
    // Check for presence of user menu or auth-dependent elements
    return this.page.isVisible('[data-testid="user-menu"]');
  }
}

// ============================================================================
// Generate Page Objects
// ============================================================================

export class GeneratePageObject {
  constructor(private page: Page) {}

  async navigateToGenerate() {
    await this.page.goto('/generate');
  }

  async fillSourceText(text: string) {
    await this.page.fill('textarea[name="sourceText"]', text);
  }

  async clickGenerateButton() {
    await this.page.click('button:has-text("Generate")');
  }

  async waitForGenerationResult() {
    await this.page.waitForSelector('[data-testid="flashcard-candidates"]', {
      timeout: 30000,
    });
  }

  async getFlashcardCount() {
    const elements = await this.page.locator('[data-testid="flashcard-item"]').count();
    return elements;
  }

  async acceptFlashcard(index: number) {
    const acceptButton = this.page
      .locator('[data-testid="flashcard-item"]')
      .nth(index)
      .locator('button:has-text("Accept")');
    await acceptButton.click();
  }

  async rejectFlashcard(index: number) {
    const rejectButton = this.page
      .locator('[data-testid="flashcard-item"]')
      .nth(index)
      .locator('button:has-text("Reject")');
    await rejectButton.click();
  }

  async editFlashcard(index: number, front: string, back: string) {
    const flashcard = this.page.locator('[data-testid="flashcard-item"]').nth(index);
    await flashcard.fill('input[placeholder="Front"]', front);
    await flashcard.fill('input[placeholder="Back"]', back);
  }

  async openSaveModal() {
    await this.page.click('button:has-text("Save All")');
  }

  async waitForSaveModal() {
    await this.page.waitForSelector('[data-testid="save-summary-modal"]');
  }

  async confirmSave() {
    await this.page.click('[data-testid="save-summary-modal"] button:has-text("Confirm")');
  }

  async getSuccessMessage() {
    return this.page.textContent('[data-testid="success-message"]');
  }

  async getErrorMessage() {
    return this.page.textContent('[role="alert"]');
  }
}

// ============================================================================
// Collection Page Objects
// ============================================================================

export class CollectionPageObject {
  constructor(private page: Page) {}

  async navigateToCollections() {
    await this.page.goto('/collections');
  }

  async createNewCollection(name: string, description?: string) {
    await this.page.click('button:has-text("New Collection")');
    await this.page.fill('input[name="name"]', name);
    if (description) {
      await this.page.fill('textarea[name="description"]', description);
    }
    await this.page.click('button:has-text("Create")');
  }

  async selectCollection(name: string) {
    await this.page.click(`text=${name}`);
  }

  async getFlashcardCount(collectionName: string) {
    const row = this.page.locator(`tr:has-text("${collectionName}")`);
    const countText = await row.locator('[data-testid="flashcard-count"]').textContent();
    return parseInt(countText || '0');
  }

  async deleteCollection(name: string) {
    const row = this.page.locator(`tr:has-text("${name}")`);
    await row.locator('button[aria-label="Delete"]').click();
    await this.page.click('button:has-text("Confirm")');
  }
}

// ============================================================================
// Generic Helpers
// ============================================================================

export const createBasePageObject = (page: Page) => ({
  auth: new AuthPageObject(page),
  generate: new GeneratePageObject(page),
  collection: new CollectionPageObject(page),

  /**
   * Wait for page to be ready
   */
  async waitForPageReady() {
    await page.waitForLoadState('networkidle');
  },

  /**
   * Check if error toast is visible
   */
  async hasErrorToast() {
    return page.isVisible('[role="alert"][data-severity="error"]');
  },

  /**
   * Check if success toast is visible
   */
  async hasSuccessToast() {
    return page.isVisible('[role="alert"][data-severity="success"]');
  },

  /**
   * Wait for and dismiss toast
   */
  async waitAndDismissToast(type: 'error' | 'success' = 'success', timeout = 5000) {
    const selector = `[role="alert"][data-severity="${type}"]`;
    await page.waitForSelector(selector, { timeout });
    await page.click(`${selector} button[aria-label="Dismiss"]`);
  },

  /**
   * Get current URL pathname
   */
  async getCurrentPath() {
    return page.url().split('/').pop() || '';
  },
});

export type BasePageObject = ReturnType<typeof createBasePageObject>;

