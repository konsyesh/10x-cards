import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "../flashcards";
import {
  createMockRequest,
  createMockAstroContext,
  verifyProblemJsonResponse,
  verifySuccessResponse,
} from "@/tests/helpers";
import { createMockSupabaseClient, createMockQueryBuilder } from "@/tests/helpers";
import { authErrors } from "@/services/auth/auth.errors";
import { flashcardErrors } from "@/services/flashcard/flashcard.errors";

describe("pages/api/flashcards.ts", () => {
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

  describe("POST /api/flashcards", () => {
    it("should return 200 with saved flashcards for valid request", async () => {
      const mockFlashcards = [
        {
          id: 1,
          front: "Q1?",
          back: "A1",
          source: "manual",
          generation_id: null,
          collection_id: null,
          user_id: "test-user-id",
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        },
        {
          id: 2,
          front: "Q2?",
          back: "A2",
          source: "manual",
          generation_id: null,
          collection_id: null,
          user_id: "test-user-id",
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        },
      ];

      // Mock insert().select() chain
      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: mockFlashcards,
            error: null,
          }),
        }),
      });

      const request = createMockRequest("POST", {
        flashcards: [
          { front: "Q1?", back: "A1", source: "manual" },
          { front: "Q2?", back: "A2", source: "manual" },
        ],
        collection_id: null,
      });

      const context = createMockAstroContext({
        locals: mockLocals,
        request,
      });

      const response = await POST(context as any);

      await verifySuccessResponse(response, 200);
      const body = await response.json();
      expect(body.saved_count).toBe(2);
      expect(body.flashcards).toHaveLength(2);
      expect(body.collection_id).toBeNull();
      expect(body.message).toContain("successfully saved");
    });

    it("should return 401 if user not authenticated", async () => {
      const request = createMockRequest("POST", {
        flashcards: [{ front: "Q?", back: "A", source: "manual" }],
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

    it("should return 400 for empty flashcards array", async () => {
      const request = createMockRequest("POST", {
        flashcards: [],
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

    it("should return 400 for flashcards array exceeding 100 items", async () => {
      const flashcards = Array.from({ length: 101 }, (_, i) => ({
        front: `Q${i}?`,
        back: `A${i}`,
        source: "manual" as const,
      }));

      const request = createMockRequest("POST", {
        flashcards,
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

    it("should return 400 for invalid front length", async () => {
      const request = createMockRequest("POST", {
        flashcards: [
          { front: "", back: "Answer", source: "manual" }, // Empty front
        ],
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

    it("should return 400 for front exceeding 200 characters", async () => {
      const request = createMockRequest("POST", {
        flashcards: [{ front: "a".repeat(201), back: "Answer", source: "manual" }],
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

    it("should return 400 for invalid back length", async () => {
      const request = createMockRequest("POST", {
        flashcards: [
          { front: "Question?", back: "", source: "manual" }, // Empty back
        ],
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

    it("should return 400 for back exceeding 500 characters", async () => {
      const request = createMockRequest("POST", {
        flashcards: [{ front: "Question?", back: "a".repeat(501), source: "manual" }],
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

    it("should return 400 for invalid source value", async () => {
      const request = createMockRequest("POST", {
        flashcards: [{ front: "Q?", back: "A", source: "invalid" as any }],
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

    it("should accept valid source values", async () => {
      const sources = ["manual", "ai-full", "ai-edited"] as const;

      for (const source of sources) {
        const mockFlashcards = [
          {
            id: 1,
            front: "Q?",
            back: "A",
            source,
            generation_id: null,
            collection_id: null,
            user_id: "test-user-id",
            created_at: "2025-01-01T00:00:00Z",
            updated_at: "2025-01-01T00:00:00Z",
          },
        ];

        // Mock insert().select() chain
        mockFrom.mockReturnValue({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({
              data: mockFlashcards,
              error: null,
            }),
          }),
        });

        const request = createMockRequest("POST", {
          flashcards: [{ front: "Q?", back: "A", source }],
        });

        const context = createMockAstroContext({
          locals: mockLocals,
          request,
        });

        const response = await POST(context as any);

        await verifySuccessResponse(response, 200);
      }
    });

    it("should accept optional generation_id", async () => {
      const mockGeneration = {
        id: 1,
        user_id: "test-user-id",
      };
      const mockFlashcards = [
        {
          id: 1,
          front: "Q?",
          back: "A",
          source: "ai-full",
          generation_id: 1,
          collection_id: null,
          user_id: "test-user-id",
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        },
      ];

      // Track calls per table
      const calls: Record<string, number> = {};
      mockFrom.mockImplementation((table: string) => {
        calls[table] = (calls[table] || 0) + 1;
        const callNum = calls[table];

        if (table === "generations") {
          if (callNum === 1) {
            // First call: validate generation references
            return {
              select: vi.fn().mockReturnValue({
                in: vi.fn().mockResolvedValue({
                  data: [mockGeneration],
                  error: null,
                }),
              }),
            };
          }
          if (callNum === 2) {
            // Second call: get generation for metrics update (select().eq().single())
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { accepted_unedited_count: 0, accepted_edited_count: 0 },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (callNum === 3) {
            // Third call: update generation metrics
            return {
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  error: null,
                }),
              }),
            };
          }
        }
        if (table === "flashcards" && callNum === 1) {
          // Insert flashcards
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockResolvedValue({
                data: mockFlashcards,
                error: null,
              }),
            }),
          };
        }
        return createMockQueryBuilder();
      });

      const request = createMockRequest("POST", {
        flashcards: [{ front: "Q?", back: "A", source: "ai-full", generation_id: 1 }],
      });

      const context = createMockAstroContext({
        locals: mockLocals,
        request,
      });

      const response = await POST(context as any);

      await verifySuccessResponse(response, 200);
      const body = await response.json();
      expect(body.saved_count).toBe(1);
    });

    it("should accept optional collection_id", async () => {
      const mockCollection = {
        id: 1,
        user_id: "test-user-id",
      };
      const mockFlashcards = [
        {
          id: 1,
          front: "Q?",
          back: "A",
          source: "manual",
          generation_id: null,
          collection_id: 1,
          user_id: "test-user-id",
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        },
      ];

      // Mock from() to return different builders based on table name
      mockFrom.mockImplementation((table: string) => {
        if (table === "collections") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockCollection,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "flashcards") {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockResolvedValue({
                data: mockFlashcards,
                error: null,
              }),
            }),
          };
        }
        return createMockQueryBuilder();
      });

      const request = createMockRequest("POST", {
        flashcards: [{ front: "Q?", back: "A", source: "manual" }],
        collection_id: 1,
      });

      const context = createMockAstroContext({
        locals: mockLocals,
        request,
      });

      const response = await POST(context as any);

      await verifySuccessResponse(response, 200);
      const body = await response.json();
      expect(body.collection_id).toBe(1);
    });

    it("should normalize undefined collection_id to null", async () => {
      const mockFlashcards = [
        {
          id: 1,
          front: "Q?",
          back: "A",
          source: "manual",
          generation_id: null,
          collection_id: null,
          user_id: "test-user-id",
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        },
      ];

      // Mock insert().select() chain
      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: mockFlashcards,
            error: null,
          }),
        }),
      });

      const request = createMockRequest("POST", {
        flashcards: [{ front: "Q?", back: "A", source: "manual" }],
        // collection_id not provided
      });

      const context = createMockAstroContext({
        locals: mockLocals,
        request,
      });

      const response = await POST(context as any);

      await verifySuccessResponse(response, 200);
      const body = await response.json();
      expect(body.collection_id).toBeNull();
    });

    it("should include x-request-id header", async () => {
      const request = createMockRequest("POST", {
        flashcards: [{ front: "Q?", back: "A", source: "manual" }],
      });

      const context = createMockAstroContext({
        locals: mockLocals,
        request,
      });

      const response = await POST(context as any);

      expect(response.headers.get("x-request-id")).toBeDefined();
    });

    it("should return problem+json format on error", async () => {
      const request = createMockRequest("POST", {
        flashcards: [], // Invalid
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

    it("should handle batch insert (up to 100 items)", async () => {
      const flashcards = Array.from({ length: 100 }, (_, i) => ({
        front: `Q${i}?`,
        back: `A${i}`,
        source: "manual" as const,
      }));

      const mockFlashcards = flashcards.map((fc, i) => ({
        id: i + 1,
        front: fc.front,
        back: fc.back,
        source: fc.source,
        generation_id: null,
        collection_id: null,
        user_id: "test-user-id",
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      }));

      // Mock insert().select() chain
      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: mockFlashcards,
            error: null,
          }),
        }),
      });

      const request = createMockRequest("POST", {
        flashcards,
      });

      const context = createMockAstroContext({
        locals: mockLocals,
        request,
      });

      const response = await POST(context as any);

      await verifySuccessResponse(response, 200);
      const body = await response.json();
      expect(body.saved_count).toBeGreaterThan(0);
    });
  });
});
