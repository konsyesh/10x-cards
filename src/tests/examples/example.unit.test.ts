import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  mockFetchJsonSuccess,
  mockFetchJsonError,
  createMockRequest,
  createMockSupabaseClient,
  createMockFlashcard,
  createMockGeneration,
} from "@/tests/helpers";

/**
 * EXAMPLE: Unit Test Template
 *
 * Ten plik pokazuje best practices dla pisania testów jednostkowych
 * w projekcie 10xCards. Usuń go lub zaadaptuj do rzeczywistych testów.
 */

describe("Example Unit Tests", () => {
  // ============================================================================
  // Setup & Teardown
  // ============================================================================

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
  });

  // ============================================================================
  // Test Suite 1: Fetch Mocks
  // ============================================================================

  describe("Fetch Mocks", () => {
    it("should mock successful JSON response", async () => {
      const mockData = { id: "123", name: "Test" };
      global.fetch = mockFetchJsonSuccess(mockData);

      const response = await fetch("/api/test");
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockData);
    });

    it("should mock error response (problem+json)", async () => {
      const errorData = {
        type: "urn:error:validation",
        title: "Validation Failed",
        status: 400,
        detail: "Source text is too short",
      };

      global.fetch = mockFetchJsonError(400, errorData);

      const response = await fetch("/api/generations", {
        method: "POST",
        body: JSON.stringify({ sourceText: "short" }),
      });

      expect(response.status).toBe(400);
      expect(response.headers.get("content-type")).toContain("application/problem+json");

      const data = await response.json();
      expect(data.type).toBe("urn:error:validation");
    });

    it("should mock network error", async () => {
      global.fetch = mockFetchJsonError(500, {
        type: "urn:error:server",
        title: "Server Error",
        status: 500,
      });

      const response = await fetch("/api/test");
      expect(response.status).toBe(500);
    });
  });

  // ============================================================================
  // Test Suite 2: Supabase Mocks
  // ============================================================================

  describe("Supabase Mocks", () => {
    it("should create mocked Supabase client", () => {
      const { supabase, from, auth } = createMockSupabaseClient();

      expect(supabase).toBeDefined();
      expect(from).toBeDefined();
      expect(auth.getUser).toBeDefined();
      expect(auth.getSession).toBeDefined();
    });

    it("should mock flashcard queries", async () => {
      const mockFlashcard = createMockFlashcard({
        front: "What is TypeScript?",
        back: "A typed superset of JavaScript",
      });

      const { from } = createMockSupabaseClient();

      from.mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [mockFlashcard],
          error: null,
        }),
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: [mockFlashcard],
            error: null,
          }),
        }),
      });

      // Simulate query
      const builder = (from as any)("flashcards");
      const result = await builder.select();

      expect(result.data).toHaveLength(1);
      expect(result.data[0].front).toBe("What is TypeScript?");
    });

    it("should handle Supabase auth", async () => {
      const { auth } = createMockSupabaseClient();

      const mockUser = { id: "user-123", email: "test@example.com" };
      auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await auth.getUser();

      expect(result.data.user).toEqual(mockUser);
      expect(result.error).toBeNull();
    });
  });

  // ============================================================================
  // Test Suite 3: Data Factories
  // ============================================================================

  describe("Data Factories", () => {
    it("should create mock flashcard with defaults", () => {
      const flashcard = createMockFlashcard();

      expect(flashcard.id).toBeDefined();
      expect(flashcard.collection_id).toBe("col-test");
      expect(flashcard.front).toBe("Question?");
      expect(flashcard.back).toBe("Answer");
      expect(flashcard.source).toBe("manual");
    });

    it("should create mock flashcard with overrides", () => {
      const flashcard = createMockFlashcard({
        front: "Custom Q?",
        back: "Custom A",
        source: "ai-full",
      });

      expect(flashcard.front).toBe("Custom Q?");
      expect(flashcard.back).toBe("Custom A");
      expect(flashcard.source).toBe("ai-full");
    });

    it("should create mock generation", () => {
      const generation = createMockGeneration({
        status: "pending",
        flashcards_count: 10,
      });

      expect(generation.id).toBeDefined();
      expect(generation.user_id).toBe("test-user-id");
      expect(generation.status).toBe("pending");
      expect(generation.flashcards_count).toBe(10);
    });

    it("should create multiple fixtures with unique IDs", () => {
      const fc1 = createMockFlashcard();
      const fc2 = createMockFlashcard();

      expect(fc1.id).not.toBe(fc2.id);
    });
  });

  // ============================================================================
  // Test Suite 4: API Request Mocks
  // ============================================================================

  describe("API Request Mocks", () => {
    it("should create mock request with custom headers", () => {
      const request = createMockRequest(
        "POST",
        { test: "data" },
        {
          Authorization: "Bearer token-123",
        }
      );

      expect(request.method).toBe("POST");
      expect(request.headers.get("Authorization")).toBe("Bearer token-123");
      expect(request.headers.get("Content-Type")).toContain("application/json");
    });

    it("should create mock request with body", async () => {
      const bodyData = { sourceText: "Lorem ipsum..." };
      const request = createMockRequest("POST", bodyData);

      const body = await request.json();
      expect(body).toEqual(bodyData);
    });
  });

  // ============================================================================
  // Test Suite 5: Custom Matchers
  // ============================================================================

  describe("Custom Matchers", () => {
    it("should validate problem+json structure", () => {
      const problemJson = {
        type: "urn:error:validation",
        title: "Validation Error",
        status: 400,
        detail: "Invalid input",
      };

      expect(problemJson).toBeProblemJSON();
    });

    it("should validate API error structure", () => {
      const apiError = {
        message: "Something went wrong",
        code: "INTERNAL_ERROR",
        requestId: "req-123",
      };

      expect(apiError).toBeApiError();
    });
  });

  // ============================================================================
  // Test Suite 6: Spies
  // ============================================================================

  describe("Spies", () => {
    it("should spy on function calls", () => {
      const mockFn = vi.fn((a: number, b: number) => a + b);

      const result = mockFn(2, 3);

      expect(result).toBe(5);
      expect(mockFn).toHaveBeenCalledWith(2, 3);
      expect(mockFn).toHaveBeenCalledOnce();
    });

    it("should spy with different return values", () => {
      const mockFn = vi.fn().mockReturnValueOnce("first").mockReturnValueOnce("second").mockReturnValue("default");

      expect(mockFn()).toBe("first");
      expect(mockFn()).toBe("second");
      expect(mockFn()).toBe("default");
      expect(mockFn()).toBe("default");
    });
  });
});
