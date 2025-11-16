import type { AstroGlobal } from "astro";

/**
 * API Endpoint Test Helpers
 * Utilities for testing Astro API routes with mocked dependencies
 */

// ============================================================================
// Mock Request Builders
// ============================================================================

/**
 * Create a mock Request object for API testing
 */
export const createMockRequest = (method = "GET", body?: any, headers?: Record<string, string>): Request => {
  const requestBody = body ? JSON.stringify(body) : undefined;

  return new Request("http://localhost:3000/api/test", {
    method,
    body: requestBody,
    headers: {
      "Content-Type": "application/json",
      "x-request-id": "test-request-id-123",
      ...headers,
    },
  });
};

/**
 * Create mock Request with cookies (for auth tests)
 */
export const createMockRequestWithCookies = (cookies: Record<string, string>, method = "POST", body?: any): Request => {
  const cookieString = Object.entries(cookies)
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");

  return createMockRequest(method, body, {
    Cookie: cookieString,
  });
};

// ============================================================================
// Mock Astro Context (locals)
// ============================================================================

export interface MockAstroLocals {
  user?: { id: string; email: string };
  supabase?: any;
  requestId?: string;
}

/**
 * Create mock Astro context.locals
 */
export const createMockAstroLocals = (overrides?: MockAstroLocals): MockAstroLocals => ({
  requestId: "test-request-id-123",
  ...overrides,
});

/**
 * Create mock Astro context with all dependencies
 */
export const createMockAstroContext = (
  overrides?: Partial<{
    locals: MockAstroLocals;
    request: Request;
  }>
): Partial<AstroGlobal> => ({
  locals: createMockAstroLocals(overrides?.locals),
  request: overrides?.request || createMockRequest(),
});

// ============================================================================
// Mock Response Helpers
// ============================================================================

/**
 * Create mock Response for successful API response
 */
export const createMockApiResponse = <T>(data: T, status = 200, headers?: Record<string, string>): Response => {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "x-request-id": "test-request-id-123",
      ...headers,
    },
  });
};

/**
 * Create mock Response for problem+json error
 */
export const createMockErrorResponse = (status: number, problemDetails: Record<string, any>): Response => {
  return new Response(JSON.stringify(problemDetails), {
    status,
    headers: {
      "Content-Type": "application/problem+json",
      "x-request-id": "test-request-id-123",
    },
  });
};

// ============================================================================
// Mock Cookies Helper
// ============================================================================

export const createMockCookies = () => {
  const cookies: Record<string, string> = {};

  return {
    get: (name: string) => cookies[name],
    set: (name: string, value: string) => {
      cookies[name] = value;
    },
    delete: (name: string) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [name]: _, ...rest } = cookies;
      Object.assign(cookies, rest);
    },
    setAll: (newCookies: { name: string; value: string }[]) => {
      newCookies.forEach(({ name, value }) => {
        cookies[name] = value;
      });
    },
    getAll: () => Object.entries(cookies).map(([name, value]) => ({ name, value })),
    has: (name: string) => name in cookies,
    clear: () => {
      Object.keys(cookies).forEach((key) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [key]: _, ...rest } = cookies;
        Object.assign(cookies, rest);
      });
    },
  };
};

// ============================================================================
// Assertion Helpers
// ============================================================================

/**
 * Parse response body as JSON
 */
export const parseResponseBody = async (response: Response): Promise<any> => {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

/**
 * Verify response is valid problem+json (RFC 7807)
 * Note: This function clones the response to avoid "Body has already been used" errors
 */
export const verifyProblemJsonResponse = async (response: Response, expectedStatus: number) => {
  expect(response.status).toBe(expectedStatus);
  expect(response.headers.get("content-type")).toContain("application/problem+json");
  expect(response.headers.get("x-request-id")).toBeDefined();

  // Clone response to avoid "Body has already been used" error
  const clonedResponse = response.clone();
  const body = await parseResponseBody(clonedResponse);
  expect(body).toHaveProperty("type");
  expect(body).toHaveProperty("title");
  expect(body).toHaveProperty("status");
  expect(body.status).toBe(expectedStatus);
};

/**
 * Verify response is valid success response
 */
export const verifySuccessResponse = async (response: Response, expectedStatus = 200) => {
  expect(response.status).toBe(expectedStatus);
  expect(response.headers.get("content-type")).toContain("application/json");
  expect(response.headers.get("x-request-id")).toBeDefined();
};
