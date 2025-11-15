import { expect, afterEach, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom';

/**
 * Global test setup file
 * Configures mocks, matchers, and environment for all Vitest tests
 */

// ============================================================================
// Global Mocks
// ============================================================================

/**
 * Mock global fetch for all tests
 * Each test can override with vi.mocked(global.fetch).mockImplementation()
 */
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

/**
 * Mock console methods to reduce noise during tests
 */
global.console = {
  ...console,
  // Keep error for debugging, suppress others
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  // error: console.error, // Keep real errors
} as any;

/**
 * Disable Sentry for tests
 */
process.env.SENTRY_ENABLED = 'false';

// ============================================================================
// Environment Variables
// ============================================================================

process.env.PUBLIC_SITE_URL = process.env.PUBLIC_SITE_URL || 'http://localhost:3000';
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key';

// ============================================================================
// Test Hooks
// ============================================================================

/**
 * Before each test: reset all mocks and timers
 */
beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockClear();
});

/**
 * After each test: ensure no pending timers
 */
afterEach(() => {
  vi.clearAllTimers();
});

// ============================================================================
// Custom Matchers
// ============================================================================

/**
 * Custom matcher for validating problem+json RFC 7807 structure
 */
expect.extend({
  toBeProblemJSON(received: any) {
    const pass =
      typeof received === 'object' &&
      received !== null &&
      'type' in received &&
      'title' in received &&
      'status' in received &&
      typeof received.status === 'number';

    return {
      pass,
      message: () =>
        pass
          ? `Expected not to be a valid problem+json response`
          : `Expected a valid problem+json response with type, title, status fields`,
    };
  },
});

/**
 * Custom matcher for validating API Error responses with requestId
 */
expect.extend({
  toBeApiError(received: any) {
    const pass =
      typeof received === 'object' &&
      received !== null &&
      'message' in received &&
      'code' in received &&
      'requestId' in received &&
      typeof received.requestId === 'string';

    return {
      pass,
      message: () =>
        pass
          ? `Expected not to be a valid ApiError`
          : `Expected a valid ApiError with message, code, and requestId`,
    };
  },
});

// ============================================================================
// Type Augmentation (for TypeScript)
// ============================================================================

declare module 'vitest' {
  interface Assertion<T = any> {
    toBeProblemJSON(): T;
    toBeApiError(): T;
  }
  interface AsymmetricMatchersContaining {
    toBeProblemJSON(): any;
    toBeApiError(): any;
  }
}

