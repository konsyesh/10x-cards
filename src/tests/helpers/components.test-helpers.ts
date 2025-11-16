import { render, type RenderOptions } from "@testing-library/react";
import { ReactElement } from "react";
import { vi } from "vitest";

/**
 * Test Helpers for Components
 * Utilities for testing React components with React Testing Library
 */

/**
 * Render component with providers wrapper
 * Can be extended with context providers if needed
 */
export function renderWithProviders(ui: ReactElement, options?: RenderOptions) {
  return render(ui, options);
}

/**
 * Mock window.location.href for testing redirects
 */
export function mockWindowLocation() {
  const originalLocation = window.location;
  const mockLocation = {
    ...originalLocation,
    href: "",
  };

  Object.defineProperty(window, "location", {
    writable: true,
    value: mockLocation,
  });

  return {
    getHref: () => mockLocation.href,
    setHref: (href: string) => {
      mockLocation.href = href;
    },
    restore: () => {
      Object.defineProperty(window, "location", {
        writable: true,
        value: originalLocation,
      });
    },
  };
}

/**
 * Wait for navigation (redirect) to occur
 * Useful for testing redirects after form submission
 */
export async function waitForNavigation(
  locationMock: ReturnType<typeof mockWindowLocation>,
  expectedPath: string,
  timeout = 1000
): Promise<void> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (locationMock.getHref().includes(expectedPath)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`Navigation to ${expectedPath} did not occur within ${timeout}ms`);
}

/**
 * Mock setTimeout for testing delayed redirects
 */
export function mockSetTimeout() {
  const originalSetTimeout = global.setTimeout;
  const timers: NodeJS.Timeout[] = [];

  global.setTimeout = vi.fn((fn: () => void, delay?: number) => {
    const timer = originalSetTimeout(fn, delay || 0);
    timers.push(timer);
    return timer;
  }) as typeof setTimeout;

  return {
    restore: () => {
      global.setTimeout = originalSetTimeout;
      timers.forEach((timer) => clearTimeout(timer));
    },
  };
}

