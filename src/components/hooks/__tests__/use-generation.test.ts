import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { GenerationResponseDTO, CandidateVM } from "@/types";

// Mock ApiError class - musi być zgodny z rzeczywistą klasą
vi.mock("@/lib/http/http.fetcher", () => {
  class MockApiError extends Error {
    constructor(
      public problem: {
        type: string;
        code: string;
        status: number;
        detail?: string;
        title: string;
        meta?: Record<string, unknown>;
      },
      public requestId?: string
    ) {
      super(problem.detail ?? problem.title);
      this.name = "ApiError";
    }
  }

  return {
    fetchJson: vi.fn(),
    ApiError: MockApiError,
  };
});

import { useGeneration } from "../use-generation";
import { fetchJson, ApiError } from "@/lib/http/http.fetcher";

describe("useGeneration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initialization", () => {
    it("should initialize with idle status", () => {
      const { result } = renderHook(() => useGeneration());

      expect(result.current.state.status).toBe("idle");
    });
  });

  describe("generate - success", () => {
    it("should generate candidates successfully", async () => {
      const mockResponse: GenerationResponseDTO = {
        generation_id: 123,
        status: "completed",
        model: "gpt-4o-mini",
        flashcards_candidates: [
          { front: "Question 1?", back: "Answer 1", source: "ai-full" },
          { front: "Question 2?", back: "Answer 2", source: "ai-full" },
        ],
        generated_count: 2,
        generation_duration_ms: 1500,
        message: "Successfully generated 2 flashcards",
      };

      vi.mocked(fetchJson).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useGeneration());

      let candidates: CandidateVM[] | null = null;
      await act(async () => {
        const generated = await result.current.generate("Test source text");
        candidates = generated;
      });

      expect(result.current.state.status).toBe("completed");
      expect(result.current.state.message).toBe("Successfully generated 2 flashcards");
      expect(result.current.state.meta?.generationId).toBe(123);
      expect(result.current.state.meta?.generatedCount).toBe(2);
      expect(result.current.state.meta?.durationMs).toBe(1500);

      expect(candidates).not.toBeNull();
      if (!candidates) throw new Error("Candidates should not be null");
      expect(candidates).toHaveLength(2);
      const candidatesArray = candidates as unknown as CandidateVM[];
      expect(candidatesArray[0].front).toBe("Question 1?");
      expect(candidatesArray[0].back).toBe("Answer 1");
      expect(candidatesArray[0].source).toBe("ai-full");
      expect(candidatesArray[0].decision).toBe("pending");
      expect(candidatesArray[0].generation_id).toBe(123);
      expect(candidatesArray[0].localId).toBeDefined();
      expect(candidatesArray[0].original.front).toBe("Question 1?");
      expect(candidatesArray[0].original.back).toBe("Answer 1");
      expect(candidatesArray[0].original.source).toBe("ai-full");
    });

    it("should generate unique localId for each candidate", async () => {
      const mockResponse: GenerationResponseDTO = {
        generation_id: 123,
        status: "completed",
        model: "gpt-4o-mini",
        flashcards_candidates: [
          { front: "Q1?", back: "A1", source: "ai-full" },
          { front: "Q2?", back: "A2", source: "ai-full" },
        ],
        generated_count: 2,
        generation_duration_ms: 1000,
        message: "Success",
      };

      vi.mocked(fetchJson).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useGeneration());

      let candidates: CandidateVM[] | null = null;
      await act(async () => {
        candidates = await result.current.generate("Test");
      });

      expect(candidates).not.toBeNull();
      if (!candidates) throw new Error("Candidates should not be null");
      const candidatesArray = candidates as unknown as CandidateVM[];
      expect(candidatesArray).toHaveLength(2);
      expect(candidatesArray[0].localId).toBeDefined();
      expect(candidatesArray[1].localId).toBeDefined();
      expect(candidatesArray[0].localId).not.toBe(candidatesArray[1].localId);
    });

    it("should call fetchJson with correct parameters", async () => {
      const mockResponse: GenerationResponseDTO = {
        generation_id: 123,
        status: "completed",
        model: "gpt-4o-mini",
        flashcards_candidates: [],
        generated_count: 0,
        generation_duration_ms: 1000,
        message: "Success",
      };

      vi.mocked(fetchJson).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useGeneration());

      await act(async () => {
        await result.current.generate("Test source text");
      });

      expect(fetchJson).toHaveBeenCalledWith("/api/generations", {
        method: "POST",
        body: JSON.stringify({
          source_text: "Test source text",
          model: "gpt-4o-mini",
        }),
      });
    });
  });

  describe("generate - RFC 7807 errors", () => {
    it("should handle ApiError with problem code", async () => {
      const apiError = new ApiError(
        {
          type: "https://docs.app.dev/problems/generation/rate-limit-exceeded",
          code: "RATE_LIMIT_EXCEEDED",
          status: 429,
          detail: "Rate limit exceeded",
          title: "errors.generation.rate_limit_exceeded",
        },
        "req-123"
      );

      vi.mocked(fetchJson).mockRejectedValue(apiError);

      const { result } = renderHook(() => useGeneration());

      let candidates: CandidateVM[] | null = null;
      await act(async () => {
        candidates = await result.current.generate("Test");
      });

      expect(result.current.state.status).toBe("error");
      expect(result.current.state.errorCode).toBe("RATE_LIMIT_EXCEEDED");
      expect(result.current.state.message).toBe("Rate limit exceeded");
      expect(candidates).toBeNull();
    });

    it("should handle different error codes", async () => {
      const apiError = new ApiError(
        {
          type: "https://docs.app.dev/problems/generation/service-unavailable",
          code: "SERVICE_UNAVAILABLE",
          status: 503,
          detail: "Service unavailable",
          title: "errors.generation.service_unavailable",
        },
        "req-456"
      );

      vi.mocked(fetchJson).mockRejectedValue(apiError);

      const { result } = renderHook(() => useGeneration());

      await act(async () => {
        await result.current.generate("Test");
      });

      expect(result.current.state.status).toBe("error");
      expect(result.current.state.errorCode).toBe("SERVICE_UNAVAILABLE");
    });
  });

  describe("generate - network errors", () => {
    it("should handle network errors", async () => {
      const networkError = new Error("Network request failed");
      vi.mocked(fetchJson).mockRejectedValue(networkError);

      const { result } = renderHook(() => useGeneration());

      let candidates: CandidateVM[] | null = null;
      await act(async () => {
        candidates = await result.current.generate("Test");
      });

      expect(result.current.state.status).toBe("error");
      expect(result.current.state.errorCode).toBe("NETWORK_ERROR");
      // Network error message comes from Error.message
      expect(result.current.state.message).toBe("Network request failed");
      expect(candidates).toBeNull();
    });
  });

  describe("generate - unknown errors", () => {
    it("should handle unknown errors", async () => {
      vi.mocked(fetchJson).mockRejectedValue("Unknown error");

      const { result } = renderHook(() => useGeneration());

      let candidates: CandidateVM[] | null = null;
      await act(async () => {
        candidates = await result.current.generate("Test");
      });

      expect(result.current.state.status).toBe("error");
      expect(result.current.state.errorCode).toBe("UNKNOWN_ERROR");
      expect(result.current.state.message).toBe("Unknown error occurred");
      expect(candidates).toBeNull();
    });
  });

  describe("retry", () => {
    it("should retry generation with same source text", async () => {
      const mockResponse: GenerationResponseDTO = {
        generation_id: 123,
        status: "completed",
        model: "gpt-4o-mini",
        flashcards_candidates: [{ front: "Q?", back: "A", source: "ai-full" }],
        generated_count: 1,
        generation_duration_ms: 1000,
        message: "Success",
      };

      vi.mocked(fetchJson).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useGeneration());

      await act(async () => {
        await result.current.retry("Test source");
      });

      expect(fetchJson).toHaveBeenCalledWith("/api/generations", {
        method: "POST",
        body: JSON.stringify({
          source_text: "Test source",
          model: "gpt-4o-mini",
        }),
      });
    });
  });

  describe("reset", () => {
    it("should reset state to idle", async () => {
      const mockResponse: GenerationResponseDTO = {
        generation_id: 123,
        status: "completed",
        model: "gpt-4o-mini",
        flashcards_candidates: [],
        generated_count: 0,
        generation_duration_ms: 1000,
        message: "Success",
      };

      vi.mocked(fetchJson).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useGeneration());

      await act(async () => {
        await result.current.generate("Test");
      });

      expect(result.current.state.status).toBe("completed");

      act(() => {
        result.current.reset();
      });

      expect(result.current.state.status).toBe("idle");
    });
  });
});
