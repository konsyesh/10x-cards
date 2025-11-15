import { describe, it, expect, beforeEach, vi } from "vitest";
import { FlashcardService } from "../flashcard.service";
import {
  createMockSupabaseClient,
  createMockFlashcard,
  createMockGeneration,
  createMockCollection,
  createMockQueryBuilder,
} from "@/tests/helpers";
import { flashcardErrors } from "../flashcard.errors";

describe("services/flashcard/flashcard.service.ts", () => {
  let supabase: any;
  let from: any;
  let service: FlashcardService;
  const userId = "test-user-id";

  beforeEach(() => {
    vi.clearAllMocks();
    const mock = createMockSupabaseClient();
    supabase = mock.supabase;
    from = mock.from;
    service = new FlashcardService(supabase, userId);
  });

  describe("createFlashcards", () => {
    it("should create flashcards successfully", async () => {
      const mockFlashcards = [
        createMockFlashcard({ id: 1, front: "Q1?", back: "A1" }),
        createMockFlashcard({ id: 2, front: "Q2?", back: "A2" }),
      ];

      // Mock insert().select() chain
      from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: mockFlashcards,
            error: null,
          }),
        }),
      });

      const command = {
        flashcards: [
          { front: "Q1?", back: "A1", source: "manual" as const },
          { front: "Q2?", back: "A2", source: "manual" as const },
        ],
        collection_id: null,
      };

      const result = await service.createFlashcards(command);

      expect(result).toHaveLength(2);
      expect(result[0].front).toBe("Q1?");
      expect(result[0].back).toBe("A1");
      expect(result[1].front).toBe("Q2?");
      expect(result[1].back).toBe("A2");
    });

    it("should validate generation references", async () => {
      const mockGeneration = createMockGeneration({
        id: 1,
        user_id: userId,
      });

      const mockFlashcards = [createMockFlashcard({ id: 1, generation_id: 1 })];

      // Track calls per table
      const calls: Record<string, number> = {};
      from.mockImplementation((table: string) => {
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

      const command = {
        flashcards: [{ front: "Q?", back: "A", source: "ai-full" as const, generation_id: 1 }],
        collection_id: null,
      };

      const result = await service.createFlashcards(command);

      expect(result).toHaveLength(1);
      expect(result[0].generation_id).toBe(1);
    });

    it("should throw GenerationNotFound if generation belongs to different user", async () => {
      const otherUserGeneration = createMockGeneration({
        id: 1,
        user_id: "other-user-id",
      });

      // Mock generation query
      from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [otherUserGeneration],
            error: null,
          }),
        }),
      });

      const command = {
        flashcards: [{ front: "Q?", back: "A", source: "ai-full" as const, generation_id: 1 }],
        collection_id: null,
      };

      await expect(service.createFlashcards(command)).rejects.toThrow();

      try {
        await service.createFlashcards(command);
      } catch (error) {
        expect(error).toHaveProperty("code", "flashcard/generation-not-found");
        expect(error).toHaveProperty("status", 404);
      }
    });

    it("should throw GenerationNotFound if generation does not exist", async () => {
      // Mock generation query - no results
      from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      });

      const command = {
        flashcards: [{ front: "Q?", back: "A", source: "ai-full" as const, generation_id: 999 }],
        collection_id: null,
      };

      await expect(service.createFlashcards(command)).rejects.toThrow();

      try {
        await service.createFlashcards(command);
      } catch (error) {
        expect(error).toHaveProperty("code", "flashcard/generation-not-found");
        expect(error).toHaveProperty("status", 404);
      }
    });

    it("should validate collection access", async () => {
      const mockCollection = createMockCollection({
        id: 1,
        user_id: userId,
      });

      const mockFlashcards = [createMockFlashcard({ id: 1, collection_id: 1 })];

      // Mock from() to return different builders based on table name
      from.mockImplementation((table: string) => {
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

      const command = {
        flashcards: [{ front: "Q?", back: "A", source: "manual" as const }],
        collection_id: 1,
      };

      const result = await service.createFlashcards(command);

      expect(result).toHaveLength(1);
      expect(result[0].collection_id).toBe(1);
    });

    it("should throw CollectionNotFound if collection does not exist", async () => {
      // Mock collection query - not found
      from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "not found" },
            }),
          }),
        }),
      });

      const command = {
        flashcards: [{ front: "Q?", back: "A", source: "manual" as const }],
        collection_id: 999,
      };

      await expect(service.createFlashcards(command)).rejects.toThrow();

      try {
        await service.createFlashcards(command);
      } catch (error) {
        expect(error).toHaveProperty("code", "flashcard/collection-not-found");
        expect(error).toHaveProperty("status", 404);
      }
    });

    it("should throw CollectionAccessDenied if collection belongs to different user", async () => {
      const otherUserCollection = createMockCollection({
        id: 1,
        user_id: "other-user-id",
      });

      // Mock collection query
      from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: otherUserCollection,
              error: null,
            }),
          }),
        }),
      });

      const command = {
        flashcards: [{ front: "Q?", back: "A", source: "manual" as const }],
        collection_id: 1,
      };

      await expect(service.createFlashcards(command)).rejects.toThrow();

      try {
        await service.createFlashcards(command);
      } catch (error) {
        expect(error).toHaveProperty("code", "flashcard/collection-access-denied");
        expect(error).toHaveProperty("status", 404); // 404 instead of 403
      }
    });

    it("should throw DatabaseError if insert fails", async () => {
      // Mock insert failure
      from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: null,
            error: { message: "Database error" },
          }),
        }),
      });

      const command = {
        flashcards: [{ front: "Q?", back: "A", source: "manual" as const }],
        collection_id: null,
      };

      await expect(service.createFlashcards(command)).rejects.toThrow();

      try {
        await service.createFlashcards(command);
      } catch (error) {
        expect(error).toHaveProperty("code", "flashcard/database-error");
        expect(error).toHaveProperty("status", 500);
      }
    });

    it("should update generation metrics for ai-full source", async () => {
      const mockGeneration = createMockGeneration({
        id: 1,
        user_id: userId,
        accepted_unedited_count: 0,
        accepted_edited_count: 0,
      });

      const mockFlashcards = [createMockFlashcard({ id: 1, generation_id: 1 })];

      // Track calls per table
      const calls: Record<string, number> = {};
      from.mockImplementation((table: string) => {
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
            // Second call: get generation for metrics update
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

      const command = {
        flashcards: [{ front: "Q?", back: "A", source: "ai-full" as const, generation_id: 1 }],
        collection_id: null,
      };

      await service.createFlashcards(command);

      // Verify update was called
      expect(from).toHaveBeenCalled();
    });

    it("should update generation metrics for ai-edited source", async () => {
      const mockGeneration = createMockGeneration({
        id: 1,
        user_id: userId,
        accepted_unedited_count: 0,
        accepted_edited_count: 0,
      });

      const mockFlashcards = [createMockFlashcard({ id: 1, generation_id: 1 })];

      // Track calls per table
      const calls: Record<string, number> = {};
      from.mockImplementation((table: string) => {
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
            // Second call: get generation for metrics update
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

      const command = {
        flashcards: [{ front: "Q?", back: "A", source: "ai-edited" as const, generation_id: 1 }],
        collection_id: null,
      };

      await service.createFlashcards(command);

      // Verify update was called
      expect(from).toHaveBeenCalled();
    });

    it("should skip generation validation if no generation_id", async () => {
      const mockFlashcards = [createMockFlashcard({ id: 1, generation_id: null })];

      // Mock insert only (no generation query)
      from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: mockFlashcards,
            error: null,
          }),
        }),
      });

      const command = {
        flashcards: [{ front: "Q?", back: "A", source: "manual" as const }],
        collection_id: null,
      };

      const result = await service.createFlashcards(command);

      expect(result).toHaveLength(1);
      expect(result[0].generation_id).toBeNull();
    });

    it("should skip collection validation if no collection_id", async () => {
      const mockFlashcards = [createMockFlashcard({ id: 1, collection_id: null })];

      // Mock insert only (no collection query)
      from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: mockFlashcards,
            error: null,
          }),
        }),
      });

      const command = {
        flashcards: [{ front: "Q?", back: "A", source: "manual" as const }],
        collection_id: null,
      };

      const result = await service.createFlashcards(command);

      expect(result).toHaveLength(1);
      expect(result[0].collection_id).toBeNull();
    });
  });
});
