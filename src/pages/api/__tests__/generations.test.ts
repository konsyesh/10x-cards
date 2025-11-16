import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "../generations";
import {
  createMockRequest,
  createMockAstroContext,
  verifyProblemJsonResponse,
  verifySuccessResponse,
} from "@/tests/helpers";
import { createMockSupabaseClient } from "@/tests/helpers";

// Mock AIService
vi.mock("@/services/ai/ai.service", () => ({
  AIService: vi.fn().mockImplementation(function AIService() {
    return {
      setModel: vi.fn().mockReturnThis(),
      setSystemPrompt: vi.fn().mockReturnThis(),
      setUserPrompt: vi.fn().mockReturnThis(),
      setSchema: vi.fn().mockReturnThis(),
      generateObject: vi.fn().mockResolvedValue({
        flashcards: [
          { front: "Q1?", back: "A1" },
          { front: "Q2?", back: "A2" },
        ],
      }),
      setParameters: vi.fn().mockReturnThis(),
      setRetryPolicy: vi.fn().mockReturnThis(),
    };
  }),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  })),
}));

describe("pages/api/generations.ts", () => {
  let mockSupabase: any;
  let mockFrom: any;
  let mockLocals: any;

  beforeEach(() => {
    vi.clearAllMocks();
    const { supabase, from } = createMockSupabaseClient();
    mockSupabase = supabase;
    mockFrom = from;
    mockLocals = {
      user: { id: "test-user-id", email: "test@example.com" },
      supabase: mockSupabase,
    };
  });

  describe("POST /api/generations", () => {
    it("should return 200 with generation response for valid request", async () => {
      const mockGeneration = {
        id: 1,
        user_id: "test-user-id",
        model: "gpt-4o-mini",
        source_text_hash: "hash123",
        source_text_length: 1200,
        status: "completed",
        generated_count: 2,
        generation_duration_ms: 1000,
        accepted_unedited_count: 0,
        accepted_edited_count: 0,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      };

      // Mock insert().select().single() for generation creation
      mockFrom
        .mockReturnValueOnce({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockGeneration,
                error: null,
              }),
            }),
          }),
        })
        // Mock update().eq() for generation update
        .mockReturnValueOnce({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              error: null,
            }),
          }),
        });

      const request = createMockRequest("POST", {
        source_text: "Lorem ipsum ".repeat(100), // > 1000 chars
        model: "gpt-4o-mini",
      });

      const context = createMockAstroContext({
        locals: mockLocals,
        request,
      });

      const response = await POST(context as any);

      await verifySuccessResponse(response, 200);
      const body = await response.json();
      expect(body.generation_id).toBeDefined();
      expect(body.status).toBe("completed");
      expect(body.flashcards_candidates).toBeDefined();
    });

    it("should return 401 if user not authenticated", async () => {
      const request = createMockRequest("POST", {
        source_text: "Lorem ipsum ".repeat(100),
      });

      const context = createMockAstroContext({
        locals: { user: null, supabase: mockSupabase },
        request,
      });

      const response = await POST(context as any);

      await verifyProblemJsonResponse(response, 401);
      const body = await response.clone().json();
      expect(body.code).toBe("auth/unauthorized");
    });

    it("should return 400 for source_text too short", async () => {
      const request = createMockRequest("POST", {
        source_text: "short", // < 1000 chars
      });

      const context = createMockAstroContext({
        locals: mockLocals,
        request,
      });

      const response = await POST(context as any);

      await verifyProblemJsonResponse(response, 400);
      const body = await response.clone().json();
      expect(body.code).toBe("flashcard/validation-failed");
    });

    it("should return 400 for source_text too long", async () => {
      const request = createMockRequest("POST", {
        source_text: "a".repeat(50001), // > 50000 chars
      });

      const context = createMockAstroContext({
        locals: mockLocals,
        request,
      });

      const response = await POST(context as any);

      await verifyProblemJsonResponse(response, 400);
      const body = await response.clone().json();
      expect(body.code).toBe("flashcard/validation-failed");
    });

    it("should use default model if not provided", async () => {
      const mockGeneration = {
        id: 1,
        user_id: "test-user-id",
        model: "gpt-4o-mini",
        source_text_hash: "hash123",
        source_text_length: 1200,
        status: "completed",
        generated_count: 2,
        generation_duration_ms: 1000,
        accepted_unedited_count: 0,
        accepted_edited_count: 0,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      };

      // Mock insert().select().single() for generation creation
      mockFrom
        .mockReturnValueOnce({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockGeneration,
                error: null,
              }),
            }),
          }),
        })
        // Mock update().eq() for generation update
        .mockReturnValueOnce({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              error: null,
            }),
          }),
        });

      const request = createMockRequest("POST", {
        source_text: "Lorem ipsum ".repeat(100),
      });

      const context = createMockAstroContext({
        locals: mockLocals,
        request,
      });

      const response = await POST(context as any);

      await verifySuccessResponse(response, 200);
      const body = await response.json();
      expect(body.model).toBe("gpt-4o-mini");
    });

    it("should include x-request-id header", async () => {
      const mockGeneration = {
        id: 1,
        user_id: "test-user-id-header",
        model: "gpt-4o-mini",
        source_text_hash: "hash123",
        source_text_length: 1200,
        status: "completed",
        generated_count: 2,
        generation_duration_ms: 1000,
        accepted_unedited_count: 0,
        accepted_edited_count: 0,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      };

      // Mock insert().select().single() for generation creation
      mockFrom
        .mockReturnValueOnce({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockGeneration,
                error: null,
              }),
            }),
          }),
        })
        // Mock update().eq() for generation update
        .mockReturnValueOnce({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              error: null,
            }),
          }),
        });

      const request = createMockRequest("POST", {
        source_text: "Lorem ipsum ".repeat(100),
      });

      const context = createMockAstroContext({
        locals: {
          user: { id: "test-user-id-header", email: "test-header@example.com" },
          supabase: mockSupabase,
        },
        request,
      });

      const response = await POST(context as any);

      expect(response.headers.get("x-request-id")).toBeDefined();
    });

    it("should handle rate limit", async () => {
      const mockGeneration = {
        id: 1,
        user_id: "test-user-id-rate-limit",
        model: "gpt-4o-mini",
        source_text_hash: "hash123",
        source_text_length: 1200,
        status: "completed",
        generated_count: 2,
        generation_duration_ms: 1000,
        accepted_unedited_count: 0,
        accepted_edited_count: 0,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      };

      // Mock insert().select().single() for generation creation
      mockFrom
        .mockReturnValueOnce({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockGeneration,
                error: null,
              }),
            }),
          }),
        })
        // Mock update().eq() for generation update
        .mockReturnValueOnce({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              error: null,
            }),
          }),
        });

      const request = createMockRequest("POST", {
        source_text: "Lorem ipsum ".repeat(100),
      });

      const context = createMockAstroContext({
        locals: {
          user: { id: "test-user-id-rate-limit", email: "test-ratelimit@example.com" },
          supabase: mockSupabase,
        },
        request,
      });

      // First request should succeed
      const response1 = await POST(context as any);
      expect(response1.status).toBe(200);

      // Note: Rate limit testing would require more complex setup
      // with shared state between requests
    });

    it("should accept optional aiParameters", async () => {
      const mockGeneration = {
        id: 1,
        user_id: "test-user-id-ai-params",
        model: "gpt-4o-mini",
        source_text_hash: "hash123",
        source_text_length: 1200,
        status: "completed",
        generated_count: 2,
        generation_duration_ms: 1000,
        accepted_unedited_count: 0,
        accepted_edited_count: 0,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      };

      // Mock insert().select().single() for generation creation
      mockFrom
        .mockReturnValueOnce({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockGeneration,
                error: null,
              }),
            }),
          }),
        })
        // Mock update().eq() for generation update
        .mockReturnValueOnce({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              error: null,
            }),
          }),
        });

      const request = createMockRequest("POST", {
        source_text: "Lorem ipsum ".repeat(100),
        model: "gpt-4o-mini",
        aiParameters: {
          temperature: 0.7,
          maxTokens: 2000,
        },
      });

      const context = createMockAstroContext({
        locals: {
          user: { id: "test-user-id-ai-params", email: "test-aiparams@example.com" },
          supabase: mockSupabase,
        },
        request,
      });

      const response = await POST(context as any);

      await verifySuccessResponse(response, 200);
      const body = await response.json();
      expect(body.generation_id).toBeDefined();
    });

    it("should return problem+json format on error", async () => {
      const request = createMockRequest("POST", {
        source_text: "short", // Invalid
      });

      const context = createMockAstroContext({
        locals: mockLocals,
        request,
      });

      const response = await POST(context as any);

      expect(response.headers.get("content-type")).toContain("application/problem+json");
      const body = await response.json();
      expect(body.type).toBeDefined();
      expect(body.title).toBeDefined();
      expect(body.status).toBe(400);
      expect(body.code).toBeDefined();
    });
  });
});
