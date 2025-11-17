/**
 * src/lib/http/flashcard.validators.ts
 *
 * Zod schemas dla walidacji requestów związanych z flashcards
 */

import { z } from "zod";

/**
 * Schema dla query parameters GET /api/flashcards
 * Query params są zawsze stringami, więc parsujemy je do odpowiednich typów
 */
export const listFlashcardsQuerySchema = z
  .object({
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 1))
      .pipe(z.number().int().positive()),
    per_page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 20))
      .pipe(z.number().int().min(1).max(100)),
    search: z.string().optional(),
    collection_id: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined))
      .pipe(z.number().int().positive().optional()),
    source: z.enum(["manual", "ai-full", "ai-edited"]).optional(),
    sort: z.enum(["created_at", "updated_at", "front"]).optional(),
    order: z.enum(["asc", "desc"]).optional(),
  })
  .transform((data) => ({
    page: data.page,
    per_page: data.per_page,
    search: data.search,
    collection_id: data.collection_id,
    source: data.source,
    sort: (data.sort ?? "created_at") as "created_at" | "updated_at" | "front",
    order: (data.order ?? "desc") as "asc" | "desc",
  }));

/**
 * Schema dla body PATCH /api/flashcards/:flashcard_id
 */
export const updateFlashcardCommandSchema = z.object({
  front: z
    .string()
    .min(1, "front must have at least 1 character")
    .max(200, "front must not exceed 200 characters")
    .optional(),
  back: z
    .string()
    .min(1, "back must have at least 1 character")
    .max(500, "back must not exceed 500 characters")
    .optional(),
  collection_id: z.number().int().positive().nullable().optional(),
});

/**
 * Schema dla route parameter flashcard_id
 */
export const flashcardIdParamSchema = z
  .string()
  .transform((val) => parseInt(val, 10))
  .pipe(z.number().int().positive({ message: "flashcard_id must be a positive integer" }));
