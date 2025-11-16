import { describe, it, expect, beforeEach, vi } from "vitest";
import { GenerationService } from "../generation.service";
import { createMockSupabaseClient, createMockGeneration, createMockQueryBuilder } from "@/tests/helpers";
import { AIService } from "@/services/ai/ai.service";
import type { SupabaseClient } from "@supabase/supabase-js";

// Mock AIService
vi.mock("@/services/ai/ai.service", () => {
  const defaultInstance = {
    setModel: vi.fn().mockReturnThis(),
    setSystemPrompt: vi.fn().mockReturnThis(),
    setUserPrompt: vi.fn().mockReturnThis(),
    setSchema: vi.fn().mockReturnThis(),
    generateObject: vi.fn().mockResolvedValue({
      flashcards: [
        { front: "Question 1?", back: "Answer 1" },
        { front: "Question 2?", back: "Answer 2" },
      ],
    }),
    setParameters: vi.fn().mockReturnThis(),
    setRetryPolicy: vi.fn().mockReturnThis(),
  };

  // Use vi.fn() with function constructor (not arrow function) to work with 'new' operator
  // This allows both 'new AIService()' and 'vi.mocked(AIService).mockImplementationOnce()'
  const MockAIService = vi.fn().mockImplementation(function AIService(_config?: unknown) {
    return { ...defaultInstance };
  });

  return {
    AIService: MockAIService,
  };
});

describe("services/generation/generation.service.ts", () => {
  let supabase: SupabaseClient;
  let from: ReturnType<typeof createMockSupabaseClient>["from"];
  let service: GenerationService;
  const userId = "test-user-id";

  beforeEach(() => {
    vi.clearAllMocks();
    const mock = createMockSupabaseClient();
    supabase = mock.supabase;
    from = mock.from;
    service = new GenerationService(supabase, userId);
  });

  describe("createGeneration", () => {
    it("should create generation record and return response", async () => {
      const mockGeneration = createMockGeneration({
        id: 1,
        user_id: userId,
        status: "pending",
      });

      // Track calls per table
      const calls: Record<string, number> = {};
      from.mockImplementation((table: string) => {
        calls[table] = (calls[table] || 0) + 1;
        const callNum = calls[table];

        if (table === "generations") {
          if (callNum === 1) {
            // First call: insert generation
            return {
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: mockGeneration,
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (callNum === 2) {
            // Second call: update generation
            return {
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  error: null,
                }),
              }),
            };
          }
        }
        if (table === "generation_error_logs") {
          // Mock insert for error logs
          return {
            insert: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          };
        }
        return createMockQueryBuilder();
      });

      const command = {
        source_text: "Lorem ipsum ".repeat(100), // > 1000 chars
        model: "gpt-4o-mini" as const,
      };

      const result = await service.createGeneration(command);

      expect(result.generation_id).toBe(mockGeneration.id);
      expect(result.status).toBe("completed");
      expect(result.model).toBe("gpt-4o-mini");
      expect(result.flashcards_candidates).toBeDefined();
      expect(result.flashcards_candidates.length).toBeGreaterThan(0);
    });

    it("should throw ProviderError if insert fails", async () => {
      from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "Database error" },
            }),
          }),
        }),
      });

      const command = {
        source_text: "Lorem ipsum ".repeat(100),
        model: "gpt-4o-mini" as const,
      };

      await expect(service.createGeneration(command)).rejects.toThrow();

      try {
        await service.createGeneration(command);
      } catch (error) {
        expect(error).toHaveProperty("code", "generation/provider-error");
        expect(error).toHaveProperty("status", 502);
      }
    });

    it("should use mock generation if AI service fails", async () => {
      const mockGeneration = createMockGeneration({
        id: 1,
        user_id: userId,
        status: "pending",
      });

      // Mock AIService to throw - override the constructor
      vi.mocked(AIService).mockImplementationOnce(function AIService(_config?: unknown) {
        return {
          setModel: vi.fn().mockReturnThis(),
          setSystemPrompt: vi.fn().mockReturnThis(),
          setUserPrompt: vi.fn().mockReturnThis(),
          setSchema: vi.fn().mockReturnThis(),
          generateObject: vi.fn().mockRejectedValue(new Error("AI service unavailable")),
          setParameters: vi.fn().mockReturnThis(),
          setRetryPolicy: vi.fn().mockReturnThis(),
        };
      });

      // Track calls per table
      const calls: Record<string, number> = {};
      from.mockImplementation((table: string) => {
        calls[table] = (calls[table] || 0) + 1;
        const callNum = calls[table];

        if (table === "generations") {
          if (callNum === 1) {
            // First call: insert generation
            return {
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: mockGeneration,
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (callNum === 2) {
            // Second call: update generation
            return {
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  error: null,
                }),
              }),
            };
          }
        }
        if (table === "generation_error_logs") {
          // Mock insert for error logs
          return {
            insert: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          };
        }
        return createMockQueryBuilder();
      });

      const command = {
        source_text: "Lorem ipsum ".repeat(100),
        model: "gpt-4o-mini" as const,
      };

      const result = await service.createGeneration(command);

      // Should fallback to mock generation
      expect(result.flashcards_candidates).toBeDefined();
      expect(result.flashcards_candidates.length).toBeGreaterThan(0);
    });

    it("should filter invalid flashcards", async () => {
      const mockGeneration = createMockGeneration({
        id: 1,
        user_id: userId,
        status: "pending",
      });

      // Mock AIService to return invalid flashcards - override the constructor
      vi.mocked(AIService).mockImplementationOnce(function AIService(_config?: unknown) {
        return {
          setModel: vi.fn().mockReturnThis(),
          setSystemPrompt: vi.fn().mockReturnThis(),
          setUserPrompt: vi.fn().mockReturnThis(),
          setSchema: vi.fn().mockReturnThis(),
          generateObject: vi.fn().mockResolvedValue({
            flashcards: [
              { front: "Valid?", back: "Valid answer" },
              { front: "", back: "Invalid front" }, // Invalid: empty front
              { front: "a".repeat(201), back: "Invalid front too long" }, // Invalid: front too long
              { front: "Valid?", back: "" }, // Invalid: empty back
              { front: "Valid?", back: "b".repeat(501) }, // Invalid: back too long
            ],
          }),
          setParameters: vi.fn().mockReturnThis(),
          setRetryPolicy: vi.fn().mockReturnThis(),
        };
      });

      // Track calls per table
      const calls: Record<string, number> = {};
      from.mockImplementation((table: string) => {
        calls[table] = (calls[table] || 0) + 1;
        const callNum = calls[table];

        if (table === "generations") {
          if (callNum === 1) {
            // First call: insert generation
            return {
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: mockGeneration,
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (callNum === 2) {
            // Second call: update generation
            return {
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  error: null,
                }),
              }),
            };
          }
        }
        if (table === "generation_error_logs") {
          // Mock insert for error logs
          return {
            insert: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          };
        }
        return createMockQueryBuilder();
      });

      const command = {
        source_text: "Lorem ipsum ".repeat(100),
        model: "gpt-4o-mini" as const,
      };

      const result = await service.createGeneration(command);

      // Should only include valid flashcards
      expect(result.flashcards_candidates.length).toBe(1);
      expect(result.flashcards_candidates[0].front).toBe("Valid?");
      expect(result.flashcards_candidates[0].back).toBe("Valid answer");
    });

    it("should apply AI parameters if provided", async () => {
      const mockGeneration = createMockGeneration({
        id: 1,
        user_id: userId,
        status: "pending",
      });

      const setParametersMock = vi.fn();
      const setRetryPolicyMock = vi.fn();

      // Mock AIService with custom mocks - override the constructor
      vi.mocked(AIService).mockImplementationOnce(function AIService(_config?: unknown) {
        return {
          setModel: vi.fn().mockReturnThis(),
          setSystemPrompt: vi.fn().mockReturnThis(),
          setUserPrompt: vi.fn().mockReturnThis(),
          setSchema: vi.fn().mockReturnThis(),
          generateObject: vi.fn().mockResolvedValue({
            flashcards: [{ front: "Q?", back: "A" }],
          }),
          setParameters: setParametersMock,
          setRetryPolicy: setRetryPolicyMock,
        };
      });

      // Track calls per table
      const calls: Record<string, number> = {};
      from.mockImplementation((table: string) => {
        calls[table] = (calls[table] || 0) + 1;
        const callNum = calls[table];

        if (table === "generations") {
          if (callNum === 1) {
            // First call: insert generation
            return {
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: mockGeneration,
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (callNum === 2) {
            // Second call: update generation
            return {
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  error: null,
                }),
              }),
            };
          }
        }
        if (table === "generation_error_logs") {
          // Mock insert for error logs
          return {
            insert: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          };
        }
        return createMockQueryBuilder();
      });

      const command = {
        source_text: "Lorem ipsum ".repeat(100),
        model: "gpt-4o-mini" as const,
        aiParameters: {
          temperature: 0.7,
          maxTokens: 2000,
          retryPolicy: { maxRetries: 3 },
        },
      };

      await service.createGeneration(command);

      expect(setParametersMock).toHaveBeenCalledWith({
        temperature: 0.7,
        maxTokens: 2000,
        topP: undefined,
      });
      expect(setRetryPolicyMock).toHaveBeenCalledWith({ maxRetries: 3 });
    });

    it("should calculate source text hash correctly", async () => {
      const mockGeneration = createMockGeneration({
        id: 1,
        user_id: userId,
        status: "pending",
      });

      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockGeneration,
            error: null,
          }),
        }),
      });

      from.mockReturnValue({
        insert: insertMock,
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: null,
          }),
        }),
      });

      const sourceText = "Test source text";
      const command = {
        source_text: sourceText,
        model: "gpt-4o-mini" as const,
      };

      await service.createGeneration(command);

      // Verify hash was calculated (MD5 of source text)
      expect(insertMock).toHaveBeenCalled();
      const insertCall = insertMock.mock.calls[0][0];
      expect(insertCall.source_text_hash).toBeDefined();
      expect(insertCall.source_text_length).toBe(sourceText.length);
    });
  });
});
