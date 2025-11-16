import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSaveFlashcards } from "../use-save-flashcards";
import { createMockCandidates } from "@/tests/helpers";
import type { CreateFlashcardsResponseDTO } from "@/types";

// vi.hoisted() przenosi definicje przed hoisting vi.mock()
const { mockFetchJson, mockApiError } = vi.hoisted(() => {
  const mockFetchJson = vi.fn();
  const mockApiError = class ApiError extends Error {
    constructor(
      public problem: { code: string; status: number; detail: string; title: string; meta?: unknown },
      public requestId?: string
    ) {
      super(problem.detail);
      this.name = "ApiError";
    }
  };
  return { mockFetchJson, mockApiError };
});

vi.mock("@/lib/http/http.fetcher", () => ({
  fetchJson: mockFetchJson,
  ApiError: mockApiError,
}));

describe("useSaveFlashcards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchJson.mockClear();
  });

  describe("initialization", () => {
    it("should initialize with idle status", () => {
      const { result } = renderHook(() => useSaveFlashcards());

      expect(result.current.state.status).toBe("idle");
    });
  });

  describe("saveFlashcards - success (single batch)", () => {
    it("should save flashcards successfully (< 100 items)", async () => {
      const candidates = createMockCandidates(50);
      const mockResponse: CreateFlashcardsResponseDTO = {
        saved_count: 50,
        flashcards: [],
        collection_id: 1,
        message: "Saved successfully",
      };

      mockFetchJson.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useSaveFlashcards());

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.saveFlashcards(candidates);
      });

      expect(success).toBe(true);
      expect(result.current.state.status).toBe("success");
      expect(result.current.state.message).toBe("Pomyślnie zapisano 50 fiszek");
      expect(result.current.state.savedCount).toBe(50);
      expect(mockFetchJson).toHaveBeenCalledTimes(1);
    });

    it("should call API with correct payload", async () => {
      const candidates = createMockCandidates(10);
      const mockResponse: CreateFlashcardsResponseDTO = {
        saved_count: 10,
        flashcards: [],
        collection_id: 1,
        message: "Saved",
      };

      mockFetchJson.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useSaveFlashcards());

      await act(async () => {
        await result.current.saveFlashcards(candidates, 123);
      });

      expect(mockFetchJson).toHaveBeenCalledWith("/api/flashcards", {
        method: "POST",
        body: JSON.stringify({
          flashcards: candidates.map((c) => ({
            front: c.front,
            back: c.back,
            source: c.source,
            generation_id: c.generation_id,
          })),
          collection_id: 123,
        }),
      });
    });
  });

  describe("saveFlashcards - batch processing", () => {
    it("should chunk into batches of 100 items", async () => {
      const candidates = createMockCandidates(250); // 3 batches
      const mockResponse: CreateFlashcardsResponseDTO = {
        saved_count: 100,
        flashcards: [],
        collection_id: 1,
        message: "Saved",
      };

      mockFetchJson.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useSaveFlashcards());

      await act(async () => {
        await result.current.saveFlashcards(candidates);
      });

      expect(mockFetchJson).toHaveBeenCalledTimes(3); // 3 batches
      expect(result.current.state.status).toBe("success");
      expect(result.current.state.savedCount).toBe(300); // 100 * 3
    });

    it("should track progress for multiple batches", async () => {
      const candidates = createMockCandidates(150); // 2 batches
      const mockResponse: CreateFlashcardsResponseDTO = {
        saved_count: 100,
        flashcards: [],
        collection_id: 1,
        message: "Saved",
      };

      mockFetchJson.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useSaveFlashcards());

      await act(async () => {
        await result.current.saveFlashcards(candidates);
      });

      expect(result.current.state.totalBatches).toBe(2);
      expect(result.current.state.currentBatch).toBeUndefined(); // Reset after completion
    });

    it("should handle exactly 100 items (single batch)", async () => {
      const candidates = createMockCandidates(100);
      const mockResponse: CreateFlashcardsResponseDTO = {
        saved_count: 100,
        flashcards: [],
        collection_id: 1,
        message: "Saved",
      };

      mockFetchJson.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useSaveFlashcards());

      await act(async () => {
        await result.current.saveFlashcards(candidates);
      });

      expect(mockFetchJson).toHaveBeenCalledTimes(1);
    });
  });

  describe("saveFlashcards - RFC 7807 errors", () => {
    it("should handle ApiError with problem code", async () => {
      const candidates = createMockCandidates(10);
      const apiError = new mockApiError(
        {
          code: "VALIDATION_ERROR",
          status: 400,
          detail: "Validation failed",
          title: "errors.flashcard.validation_failed",
        },
        "req-123"
      );

      mockFetchJson.mockRejectedValue(apiError);

      const { result } = renderHook(() => useSaveFlashcards());

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.saveFlashcards(candidates);
      });

      expect(success).toBe(false);
      expect(result.current.state.status).toBe("error");
      expect(result.current.state.errorCode).toBe("VALIDATION_ERROR");
      expect(result.current.state.message).toBe("Validation failed");
    });

    it("should handle different error codes", async () => {
      const candidates = createMockCandidates(10);
      const apiError = new mockApiError(
        {
          code: "RESOURCE_CONFLICT",
          status: 409,
          detail: "Resource conflict",
          title: "errors.flashcard.conflict",
        },
        "req-456"
      );

      mockFetchJson.mockRejectedValue(apiError);

      const { result } = renderHook(() => useSaveFlashcards());

      await act(async () => {
        await result.current.saveFlashcards(candidates);
      });

      expect(result.current.state.status).toBe("error");
      expect(result.current.state.errorCode).toBe("RESOURCE_CONFLICT");
    });
  });

  describe("saveFlashcards - network errors", () => {
    it("should handle network errors", async () => {
      const candidates = createMockCandidates(10);
      const networkError = new Error("Network request failed");

      mockFetchJson.mockRejectedValue(networkError);

      const { result } = renderHook(() => useSaveFlashcards());

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.saveFlashcards(candidates);
      });

      expect(success).toBe(false);
      expect(result.current.state.status).toBe("error");
      expect(result.current.state.errorCode).toBe("NETWORK_ERROR");
      expect(result.current.state.message).toBe("Network request failed");
    });
  });

  describe("saveFlashcards - unknown errors", () => {
    it("should handle unknown errors", async () => {
      const candidates = createMockCandidates(10);

      mockFetchJson.mockRejectedValue("Unknown error");

      const { result } = renderHook(() => useSaveFlashcards());

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.saveFlashcards(candidates);
      });

      expect(success).toBe(false);
      expect(result.current.state.status).toBe("error");
      expect(result.current.state.errorCode).toBe("UNKNOWN_ERROR");
      expect(result.current.state.message).toBe("Nieznany błąd");
    });
  });

  describe("saveFlashcards - empty array", () => {
    it("should return false for empty candidates array", async () => {
      const { result } = renderHook(() => useSaveFlashcards());

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.saveFlashcards([]);
      });

      expect(success).toBe(false);
      expect(result.current.state.status).toBe("error");
      expect(result.current.state.message).toBe("Brak kart do zapisania");
      expect(mockFetchJson).not.toHaveBeenCalled();
    });
  });

  describe("reset", () => {
    it("should reset state to idle", async () => {
      const candidates = createMockCandidates(10);
      const mockResponse: CreateFlashcardsResponseDTO = {
        saved_count: 10,
        flashcards: [],
        collection_id: 1,
        message: "Saved",
      };

      mockFetchJson.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useSaveFlashcards());

      await act(async () => {
        await result.current.saveFlashcards(candidates);
      });

      expect(result.current.state.status).toBe("success");

      act(() => {
        result.current.reset();
      });

      expect(result.current.state.status).toBe("idle");
    });
  });

  describe("saveFlashcards - collection_id handling", () => {
    it("should handle null collection_id", async () => {
      const candidates = createMockCandidates(10);
      const mockResponse: CreateFlashcardsResponseDTO = {
        saved_count: 10,
        flashcards: [],
        collection_id: null,
        message: "Saved",
      };

      mockFetchJson.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useSaveFlashcards());

      await act(async () => {
        await result.current.saveFlashcards(candidates, null);
      });

      expect(mockFetchJson).toHaveBeenCalledTimes(1);
      const callArgs = mockFetchJson.mock.calls[0];
      expect(callArgs[0]).toBe("/api/flashcards");
      expect(callArgs[1]).toMatchObject({
        method: "POST",
      });
      const body = JSON.parse(callArgs[1].body);
      expect(body).toMatchObject({
        flashcards: expect.any(Array),
        collection_id: null,
      });
      expect(body.flashcards).toHaveLength(10);
    });
  });
});
