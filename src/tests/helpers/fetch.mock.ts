import { vi } from 'vitest';

/**
 * Fetch Mock Helpers
 * Utilities for mocking global fetch in unit and integration tests
 */

/**
 * Mock successful JSON response
 */
export const mockFetchJsonSuccess = <T>(data: T, init?: ResponseInit) => {
  return vi.fn().mockResolvedValue(
    new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      ...init,
    }),
  );
};

/**
 * Mock error JSON response (problem+json RFC 7807)
 */
export const mockFetchJsonError = (
  status: number,
  problemDetails: Record<string, any>,
) => {
  return vi.fn().mockResolvedValue(
    new Response(JSON.stringify(problemDetails), {
      status,
      headers: { 'Content-Type': 'application/problem+json' },
    }),
  );
};

/**
 * Mock network error (connection failure)
 */
export const mockFetchNetworkError = (message = 'Network error') => {
  return vi.fn().mockRejectedValue(new Error(message));
};

/**
 * Mock response with specific status and body
 */
export const mockFetchResponse = (status: number, body: any, contentType = 'application/json') => {
  return vi.fn().mockResolvedValue(
    new Response(typeof body === 'string' ? body : JSON.stringify(body), {
      status,
      headers: { 'Content-Type': contentType },
    }),
  );
};

/**
 * Mock fetch for specific URL patterns
 * Returns different responses for different URLs
 */
export const mockFetchByUrl = (
  responses: Record<string, { status: number; body: any }>,
) => {
  return vi.fn((url: string) => {
    const matched = Object.entries(responses).find(([pattern]) =>
      new RegExp(pattern).test(url),
    );

    if (matched) {
      const [, { status, body }] = matched;
      return Promise.resolve(
        new Response(JSON.stringify(body), {
          status,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    }

    // Default: 404
    return Promise.resolve(
      new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });
};

/**
 * Helper to reset fetch mock between tests
 */
export const resetFetchMock = () => {
  global.fetch = vi.fn();
};

/**
 * Helper to verify fetch was called with specific arguments
 */
export const expectFetchCalledWith = (
  url: string | RegExp,
  options?: Partial<RequestInit>,
) => {
  const fetchMock = global.fetch as any;
  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringMatching(typeof url === 'string' ? url : url.source),
    expect.objectContaining(options || {}),
  );
};

