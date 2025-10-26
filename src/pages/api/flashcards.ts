import type { AstroGlobal } from "astro";
import { supabaseClient, DEFAULT_USER_ID } from "../../db/supabase.client";
import { validateCreateFlashcardsCommand } from "../../lib/validators/flashcards.validator";
import { FlashcardService } from "../../lib/services/flashcard.service";
import type { ApiErrorResponse, ApiSuccessResponse, CreateFlashcardsResponseDTO } from "../../types";
import {
  GenerationNotFoundError,
  CollectionNotFoundError,
  CollectionAccessError,
  SchedulerError,
} from "../../lib/errors/flashcard.errors";

export const prerender = false;

/**
 * Zwraca zunifikowaną odpowiedź błędu API
 */
function createErrorResponse(
  code: string,
  message: string,
  statusCode: number,
  details?: { field: string; message: string }[]
): { status: number; body: ApiErrorResponse } {
  return {
    status: statusCode,
    body: {
      error: {
        code,
        message,
        details,
      },
      meta: {
        timestamp: new Date().toISOString(),
        status: "error",
      },
    },
  };
}

/**
 * Zwraca zunifikowaną odpowiedź sukcesu API
 */
function createSuccessResponse<T>(data: T, statusCode = 200): { status: number; body: ApiSuccessResponse<T> } {
  return {
    status: statusCode,
    body: {
      data,
      meta: {
        timestamp: new Date().toISOString(),
        status: "success",
      },
    },
  };
}

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
  // MVP: Używamy DEFAULT_USER_ID, na etapie 2 będzie JWT middleware
  const userId = DEFAULT_USER_ID;

  // Krok 1: Parsowanie JSON body
  let bodyData: unknown;

  try {
    bodyData = await context.request.json();
  } catch {
    const response = createErrorResponse("VALIDATION_ERROR", "Niepoprawny format JSON w body żądania", 400);
    return new Response(JSON.stringify(response.body), { status: response.status });
  }

  // Krok 2: Walidacja struktury za pomocą Zod
  const validationResult = validateCreateFlashcardsCommand(bodyData);

  if (!validationResult.success) {
    const response = createErrorResponse(
      "VALIDATION_ERROR",
      "Walidacja parametrów nie powiodła się",
      400,
      validationResult.errors
    );
    return new Response(JSON.stringify(response.body), { status: response.status });
  }

  // Krok 3: Tworzenie serwisu flashcard'ów i przetwarzanie żądania
  const flashcardService = new FlashcardService(supabaseClient, userId);

  try {
    const savedFlashcards = await flashcardService.createFlashcards(validationResult.data);

    // Krok 4: Przygotowanie response'u
    const responseData: CreateFlashcardsResponseDTO = {
      saved_count: savedFlashcards.length,
      flashcards: savedFlashcards,
      collection_id: validationResult.data?.collection_id ?? null,
      message: `${savedFlashcards.length} flashcards successfully saved`,
    };

    // Krok 5: Zwrócenie sukcesu (201 Created)
    const response = createSuccessResponse(responseData, 201);
    return new Response(JSON.stringify(response.body), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Obsługa błędów z serwisu flashcard'ów
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // eslint-disable-next-line no-console
    console.error("[POST /api/flashcards]", {
      userId,
      timestamp: new Date().toISOString(),
      error: errorMessage,
    });

    // Mapowanie custom errors na odpowiednie kody HTTP
    if (error instanceof GenerationNotFoundError) {
      const response = createErrorResponse("RESOURCE_NOT_FOUND", error.message, 404);
      return new Response(JSON.stringify(response.body), { status: response.status });
    }

    if (error instanceof CollectionNotFoundError) {
      const response = createErrorResponse("RESOURCE_NOT_FOUND", error.message, 404);
      return new Response(JSON.stringify(response.body), { status: response.status });
    }

    if (error instanceof CollectionAccessError) {
      const response = createErrorResponse("FORBIDDEN", error.message, 403);
      return new Response(JSON.stringify(response.body), { status: response.status });
    }

    if (error instanceof SchedulerError) {
      const response = createErrorResponse("SERVICE_UNAVAILABLE", error.message, 503);
      return new Response(JSON.stringify(response.body), { status: response.status });
    }

    // Ogólny błąd serwera
    const response = createErrorResponse(
      "INTERNAL_SERVER_ERROR",
      "Podczas przetwarzania żądania wystąpił nieoczekiwany błąd.",
      500
    );
    return new Response(JSON.stringify(response.body), { status: response.status });
  }
};
