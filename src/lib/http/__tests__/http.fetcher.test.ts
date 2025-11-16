import { describe, it, expect, beforeEach, vi } from "vitest";
import { fetchJson, ApiError } from "../http.fetcher";
import type { ProblemDetails } from "@/lib/errors/index";
import { mockFetchJsonSuccess, mockFetchNetworkError } from "@/tests/helpers";

describe("lib/http/http.fetcher.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ApiError", () => {
    it("should create ApiError with problem details", () => {
      const problem: ProblemDetails = {
        type: "https://docs.app.dev/problems/flashcard/not-found",
        title: "errors.flashcard.not_found",
        status: 404,
        detail: "Flashcard not found",
        code: "flashcard/not-found",
      };

      const error = new ApiError(problem, "req-123");

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe("ApiError");
      expect(error.message).toBe("Flashcard not found");
      expect(error.problem).toEqual(problem);
      expect(error.requestId).toBe("req-123");
    });

    it("should use title as message if detail is missing", () => {
      const problem: ProblemDetails = {
        type: "https://docs.app.dev/problems/flashcard/not-found",
        title: "errors.flashcard.not_found",
        status: 404,
        code: "flashcard/not-found",
      };

      const error = new ApiError(problem);

      expect(error.message).toBe("errors.flashcard.not_found");
    });
  });

  describe("fetchJson", () => {
    it("should return parsed JSON on success", async () => {
      const mockData = { id: "123", name: "Test" };
      global.fetch = mockFetchJsonSuccess(mockData);

      const result = await fetchJson<typeof mockData>("/api/test");

      expect(result).toEqual(mockData);
    });

    it("should add credentials: include automatically", async () => {
      const mockData = { success: true };
      global.fetch = mockFetchJsonSuccess(mockData);

      await fetchJson("/api/test");

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/test",
        expect.objectContaining({
          credentials: "include",
        })
      );
    });

    it("should add content-type: application/json header", async () => {
      const mockData = { success: true };
      global.fetch = mockFetchJsonSuccess(mockData);

      await fetchJson("/api/test");

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/test",
        expect.objectContaining({
          headers: expect.objectContaining({
            "content-type": "application/json",
          }),
        })
      );
    });

    it("should merge custom headers", async () => {
      const mockData = { success: true };
      global.fetch = mockFetchJsonSuccess(mockData);

      await fetchJson("/api/test", {
        headers: { Authorization: "Bearer token" },
      });

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/test",
        expect.objectContaining({
          headers: expect.objectContaining({
            "content-type": "application/json",
            Authorization: "Bearer token",
          }),
        })
      );
    });

    it("should throw ApiError for problem+json responses", async () => {
      const problem: ProblemDetails = {
        type: "https://docs.app.dev/problems/flashcard/validation-failed",
        title: "errors.flashcard.validation_failed",
        status: 400,
        detail: "Validation failed",
        code: "flashcard/validation-failed",
      };

      // Mock fetch to return a new Response each time (to avoid "Body has already been used")
      global.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify(problem), {
          status: 400,
          headers: {
            "Content-Type": "application/problem+json",
            "x-request-id": "test-req-id",
          },
        })
      );

      await expect(fetchJson("/api/test")).rejects.toThrow(ApiError);

      // Reset mock for second call
      global.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify(problem), {
          status: 400,
          headers: {
            "Content-Type": "application/problem+json",
            "x-request-id": "test-req-id",
          },
        })
      );

      try {
        await fetchJson("/api/test");
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        if (error instanceof ApiError) {
          expect(error.problem).toEqual(problem);
          expect(error.requestId).toBeDefined();
        }
      }
    });

    it("should extract x-request-id from response headers", async () => {
      const problem: ProblemDetails = {
        type: "https://docs.app.dev/problems/flashcard/not-found",
        title: "errors.flashcard.not_found",
        status: 404,
        code: "flashcard/not-found",
      };

      global.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify(problem), {
          status: 404,
          headers: {
            "content-type": "application/problem+json",
            "x-request-id": "req-123",
          },
        })
      );

      try {
        await fetchJson("/api/test");
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        if (error instanceof ApiError) {
          expect(error.requestId).toBe("req-123");
        }
      }
    });

    it("should throw Error for non-problem+json error responses", async () => {
      global.fetch = vi.fn().mockResolvedValue(
        new Response("Not Found", {
          status: 404,
          headers: { "content-type": "text/plain" },
        })
      );

      await expect(fetchJson("/api/test")).rejects.toThrow("HTTP 404");
    });

    it("should handle network errors", async () => {
      global.fetch = mockFetchNetworkError("Network error");

      await expect(fetchJson("/api/test")).rejects.toThrow("Network error");
    });

    it("should return undefined for 204 No Content", async () => {
      global.fetch = vi.fn().mockResolvedValue(
        new Response(null, {
          status: 204,
        })
      );

      const result = await fetchJson("/api/test");

      expect(result).toBeUndefined();
    });

    it("should handle non-JSON success responses", async () => {
      global.fetch = vi.fn().mockResolvedValue(
        new Response("text response", {
          status: 200,
          headers: { "content-type": "text/plain" },
        })
      );

      const result = await fetchJson("/api/test");

      expect(result).toBeUndefined();
    });
  });
});
