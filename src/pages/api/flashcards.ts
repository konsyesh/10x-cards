import type { AstroGlobal } from "astro";
import { supabaseClient, DEFAULT_USER_ID } from "../../db/supabase.client";
import { validateCreateFlashcardsCommand } from "../../lib/validators/flashcards.validator";
import { FlashcardService } from "../../lib/services/flashcard.service";

import { successResponse, type FieldError } from "../../lib/http/http.responses";
import { badJson, validationFailed, notFound, serviceUnavailable, internalError } from "../../lib/http/http.errors";

import {
  GenerationNotFoundError,
  CollectionNotFoundError,
  CollectionAccessError,
  SchedulerError,
} from "../../lib/errors/flashcard.errors";

export const prerender = false;

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
export const POST = async (context: AstroGlobal) => {
  // TODO: Na etapie wdrażania middleware JWT będzie weryfikować token
  // Dla teraz używamy DEFAULT_USER_ID
  const userId = DEFAULT_USER_ID;
  const instance = context.url.pathname; // np. "/api/flashcards"

  // Krok 1: Parsowanie JSON body → 400 jeśli JSON niepoprawny
  let bodyData: unknown;

  try {
    bodyData = await context.request.json();
  } catch {
    return badJson(instance);
  }

  // Krok 2: Walidacja struktury za pomocą Zod → 422 przy błędach pól
  const validationResult = validateCreateFlashcardsCommand(bodyData);

  if (!validationResult.success) {
    return validationFailed(validationResult.errors as FieldError[] | undefined, instance);
  }

  // Gwarancja że .data istnieje, bo success === true
  if (!validationResult.data) {
    return internalError(instance);
  }

  // Krok 3: Tworzenie serwisu flashcard'ów i przetwarzanie żądania
  const flashcardService = new FlashcardService(supabaseClient, userId);

  try {
    // Normalizuj collection_id: undefined -> null
    const commandData = {
      ...validationResult.data,
      collection_id: validationResult.data.collection_id ?? null,
    };

    const savedFlashcards = await flashcardService.createFlashcards(commandData);

    // Krok 4: Przygotowanie response'u
    const responseData = {
      saved_count: savedFlashcards.length,
      flashcards: savedFlashcards,
      collection_id: commandData.collection_id,
      message: `${savedFlashcards.length} flashcards successfully saved`,
    };

    // Krok 5: Zwrócenie sukcesu (201 Created)
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
