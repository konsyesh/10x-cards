import type { APIRoute } from "astro";
import { z } from "zod";
import { DEFAULT_USER_ID } from "../../db/supabase.client";
import { FlashcardService } from "../../lib/services/flashcard.service";
import { validateBody } from "../../lib/http/http.validate-body";
import { successResponse } from "../../lib/http/http.responses";
import { notFound, serviceUnavailable, internalError } from "../../lib/http/http.errors";

import {
  GenerationNotFoundError,
  CollectionNotFoundError,
  CollectionAccessError,
  SchedulerError,
} from "../../lib/errors/flashcard.errors";

import type { CreateFlashcardsCommand, CreateFlashcardsResponseDTO } from "../../types";

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
 * Bezpośrednio odbiera strukturę z frontendu
 */
const createFlashcardsCommandSchema = z.object({
  flashcards: z
    .array(createFlashcardItemSchema)
    .min(1, "flashcards array must have at least 1 item")
    .max(100, "flashcards array exceeds maximum size of 100 items"),
  collection_id: z.number().int().positive().optional().nullable(),
});

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
 *
 * @example
 * POST /api/flashcards
 * {
 *   "flashcards": [
 *     {
 *       "front": "Co to jest fotosynteza?",
 *       "back": "Proces biologiczny zamieniający energię światła...",
 *       "source": "manual",
 *       "generation_id": null
 *     }
 *   ],
 *   "collection_id": null
 * }
 *
 * Response 201:
 * {
 *   "data": {
 *     "saved_count": 1,
 *     "flashcards": [...],
 *     "collection_id": null,
 *     "message": "1 flashcards successfully saved"
 *   },
 *   "meta": { "timestamp": "...", "status": "success" }
 * }
 */
export const POST: APIRoute = async ({ url, request, locals }) => {
  // TODO: Na etapie wdrażania middleware JWT będzie weryfikować token
  // Dla teraz używamy DEFAULT_USER_ID
  const userId = DEFAULT_USER_ID;
  const instance = url.pathname; // np. "/api/flashcards"

  // Krok 1: Walidacja JSON body + schema
  const validation = await validateBody(request, createFlashcardsCommandSchema, instance);
  if (!validation.success) {
    return validation.response as Response;
  }

  // Krok 2: Tworzenie serwisu flashcard'ów i przetwarzanie żądania
  const flashcardService = new FlashcardService(locals.supabase, userId);

  try {
    // Normalizuj collection_id: undefined -> null
    const commandData: CreateFlashcardsCommand = {
      ...(validation.data as CreateFlashcardsCommand),
      collection_id: (validation.data as CreateFlashcardsCommand).collection_id ?? null,
    };

    const savedFlashcards = await flashcardService.createFlashcards(commandData);

    // Krok 3: Przygotowanie response DTO (typowany)
    const responseData: CreateFlashcardsResponseDTO = {
      saved_count: savedFlashcards.length,
      flashcards: savedFlashcards,
      collection_id: commandData.collection_id,
      message: `${savedFlashcards.length} flashcards successfully saved`,
    };

    // Krok 4: Zwrócenie sukcesu (201 Created)
    return successResponse(responseData, 201);
  } catch (err) {
    // Obsługa błędów z serwisu flashcard'ów
    const errorMessage = err instanceof Error ? err.message : "Unknown error";

    // eslint-disable-next-line no-console
    console.error("[POST /api/flashcards]", {
      userId,
      timestamp: new Date().toISOString(),
      error: errorMessage,
    });

    // Mapowanie domenowych wyjątków na odpowiednie kody HTTP
    if (err instanceof GenerationNotFoundError) {
      return notFound(err.message, instance); // 404
    }

    if (err instanceof CollectionNotFoundError) {
      return notFound(err.message, instance); // 404
    }

    if (err instanceof CollectionAccessError) {
      // Zwracamy 404 zamiast 403, żeby nie ujawniać istnienia cudzych kolekcji (security best practice)
      return notFound(err.message, instance); // 404
    }

    if (err instanceof SchedulerError) {
      return serviceUnavailable(instance); // 503
    }

    // Fallback → 500
    return internalError(instance); // 500
  }
};
