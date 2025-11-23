/**
 * POST /api/flashcards
 *
 * Tworzy fiszki w dwóch scenariuszach:
 * 1. Ręczne: użytkownik tworzy pojedynczą lub kilka fiszek
 * 2. Zbiorcze: aplikacja zapisuje fiszki wygenerowane/edytowane przez AI
 *
 * Autoryzacja: Wymaga JWT (będzie zweryfikowany w middleware)
 * Walidacja: Tablica 1-100 kart, front 1-200 znaków, back 1-500 znaków
 *
 * @endpoint POST /api/flashcards
 * @body CreateFlashcardsCommand { flashcards, collection_id }
 * @returns CreateFlashcardsResponseDTO (201 Created)
 */

import type { APIRoute } from "astro";
import { z } from "zod";
import { authErrors } from "@/services/auth/auth.errors";
import { FlashcardService } from "@/services/flashcard/flashcard.service";
import { validateBody } from "@/lib/http/http.validate-body";
import { validateQuery } from "@/lib/http/http.validate-query";
import { successResponse } from "@/lib/http/http.responses";
import { withProblemHandling, systemErrors } from "@/lib/errors/http";
import { flashcardErrors } from "@/services/flashcard/flashcard.errors";
import { listFlashcardsQuerySchema } from "@/lib/http/flashcard.validators";
import type {
  CreateFlashcardsCommand,
  CreateFlashcardsResponseDTO,
  FlashcardsListResponseDTO,
  ListFlashcardsQuery,
} from "@/types";
import { isFeatureEnabled } from "@/features";

export const prerender = false;

/**
 * Zod schema dla pojedynczej karty do zapisania
 */
const createFlashcardItemSchema = z.object({
  front: z.string().min(1, "front must have at least 1 character").max(200, "front must not exceed 200 characters"),
  back: z.string().min(1, "back must have at least 1 character").max(500, "back must not exceed 500 characters"),
  source: z.enum(["manual", "ai-full", "ai-edited"], {
    errorMap: () => ({
      message: "source must be one of: manual, ai-full, ai-edited",
    }),
  }),
  generation_id: z.number().int().positive().optional().nullable(),
});

/**
 * Zod schema dla całego żądania tworzenia fiszek
 */
const createFlashcardsCommandSchema = z.object({
  flashcards: z
    .array(createFlashcardItemSchema)
    .min(1, "flashcards array must have at least 1 item")
    .max(100, "flashcards array exceeds maximum size of 100 items"),
  collection_id: z.number().int().positive().optional().nullable(),
});

/**
 * GET /api/flashcards
 *
 * Listuje flashcards użytkownika z filtrowaniem, sortowaniem i paginacją
 *
 * @endpoint GET /api/flashcards
 * @query ListFlashcardsQuery { page, per_page, search, collection_id, source, sort, order }
 * @returns FlashcardsListResponseDTO (200 OK)
 */
export const GET: APIRoute = withProblemHandling(async ({ request, locals }) => {
  if (!isFeatureEnabled("flashcards")) {
    throw systemErrors.creators.FeatureDisabled({
      detail: "Flashcards feature is disabled in this environment",
      meta: { feature: "flashcards" },
    });
  }

  if (!locals.user) {
    throw authErrors.creators.Unauthorized({ detail: "Wymagana autoryzacja" });
  }
  const userId = locals.user.id;

  // Walidacja query parameters (rzuca DomainError jeśli fail)
  const queryData = validateQuery(request, listFlashcardsQuerySchema) as ListFlashcardsQuery;

  const flashcardService = new FlashcardService(locals.supabase, userId);
  const result = await flashcardService.listFlashcards(queryData);

  const responseData: FlashcardsListResponseDTO = {
    flashcards: result.flashcards,
    pagination: result.pagination,
  };

  return successResponse(responseData);
});

export const POST: APIRoute = withProblemHandling(async ({ request, locals }) => {
  if (!isFeatureEnabled("flashcards")) {
    throw systemErrors.creators.FeatureDisabled({
      detail: "Flashcards feature is disabled in this environment",
      meta: { feature: "flashcards" },
    });
  }

  if (!locals.user) {
    throw authErrors.creators.Unauthorized({ detail: "Wymagana autoryzacja" });
  }
  const userId = locals.user.id;

  // Walidacja body (rzuca DomainError jeśli fail)
  const commandData = await validateBody(request, createFlashcardsCommandSchema);

  // Normalizuj collection_id: undefined → null
  const normalizedCommand: CreateFlashcardsCommand = {
    flashcards: commandData.flashcards,
    collection_id: commandData.collection_id !== undefined ? commandData.collection_id : null,
  };

  try {
    const flashcardService = new FlashcardService(locals.supabase, userId);
    const savedFlashcards = await flashcardService.createFlashcards(normalizedCommand);

    const responseData: CreateFlashcardsResponseDTO = {
      saved_count: savedFlashcards.length,
      flashcards: savedFlashcards,
      collection_id: normalizedCommand.collection_id,
      message: `${savedFlashcards.length} flashcards successfully saved`,
    };

    return successResponse(responseData);
  } catch (err) {
    // Mapuj domenowe błędy na DomainError (jeśli już nie są)
    if (err instanceof Error && "code" in err) {
      throw err;
    }

    // Mapuj Supabase errors
    if (err instanceof Error && err.message.includes("not found")) {
      throw flashcardErrors.creators.NotFound({
        detail: err.message,
        cause: err,
      });
    }

    // Fallback - rzuć aby withProblemHandling go obsłużył
    throw err;
  }
});
