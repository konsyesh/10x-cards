import type { APIRoute } from "astro";
import { DEFAULT_USER_ID } from "../../db/supabase.client";
import { validateGenerationCommand } from "../../lib/validators/generation.validator";
import { GenerationService } from "../../lib/services/generation.service";

import { successResponse, type FieldError } from "../../lib/http/http.responses";
import {
  rateLimitExceeded,
  badJson,
  validationFailed,
  serviceUnavailable,
  llmUnavailable,
  llmTimeout,
  internalError,
} from "../../lib/http/http.errors";

export const prerender = false;

/**
 * In-memory rate limiter: przechowuje informacje o liczbie żądań per user_id
 * Struktura: Map<userId, { count: number; resetAt: Date }>
 * TTL: 60 sekund
 */
const rateLimitMap = new Map<string, { count: number; resetAt: Date }>();

/**
 * Rate limit constants
 */
const RATE_LIMIT_REQUESTS = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 60 sekund

/**
 * Sprawdza rate limit dla użytkownika
 * Zwraca true jeśli użytkownik może wykonać żądanie
 * Zwraca false jeśli limit został przekroczony
 *
 * @param userId - ID użytkownika
 * @returns boolean - Czy żądanie jest dozwolone
 */
function checkRateLimit(userId: string): boolean {
  const now = new Date();
  const userLimit = rateLimitMap.get(userId);

  // Jeśli nie ma limitu lub wygasł - reset
  if (!userLimit || now > userLimit.resetAt) {
    rateLimitMap.set(userId, {
      count: 1,
      resetAt: new Date(now.getTime() + RATE_LIMIT_WINDOW_MS),
    });
    return true;
  }

  // Sprawdzenie czy nie przekroczono limitu
  if (userLimit.count >= RATE_LIMIT_REQUESTS) {
    return false;
  }

  // Inkrementacja licznika
  userLimit.count += 1;
  return true;
}

/**
 * POST /api/generations
 *
 * Tworzy nową sesję generowania flashcard'ów z tekstu źródłowego
 * Inicjuje przetwarzanie tekstu za pośrednictwem AI i zwraca wygenerowanych kandydatów
 *
 * Autoryzacja: Wymaga JWT (będzie zweryfikowany w middleware)
 * Rate limit: 5 żądań na minutę na użytkownika
 *
 * @endpoint POST /api/generations
 * @body CreateGenerationCommand { source_text, model }
 * @returns GenerationResponseDTO (201 Created)
 *
 * @example
 * POST /api/generations
 * {
 *   "source_text": "Long text content...",
 *   "model": "gpt-4o-mini"
 * }
 *
 * Response 201:
 * {
 *   "data": {
 *     "generation_id": 1,
 *     "status": "completed",
 *     "model": "gpt-4o-mini",
 *     "generated_count": 5,
 *     "generation_duration_ms": 1200,
 *     "flashcards_candidates": [...],
 *     "message": "Wygenerowano 5 flashcard'ów."
 *   },
 *   "meta": { "timestamp": "...", "status": "success" }
 * }
 */
export const POST: APIRoute = async ({ url, request, locals }) => {
  // TODO: Na etapie wdrażania middleware JWT będzie weryfikować token
  // Dla teraz używamy DEFAULT_USER_ID
  const userId = DEFAULT_USER_ID;
  const instance = url.pathname; // np. "/api/generations"

  // Krok 1: Rate limiting check
  if (!checkRateLimit(userId)) {
    return rateLimitExceeded(instance);
  }

  // Krok 2: Parsowanie JSON body
  let bodyData: unknown;

  try {
    bodyData = await request.json();
  } catch {
    return badJson(instance);
  }

  // Krok 3: Walidacja danych za pomocą Zod
  const validationResult = validateGenerationCommand(bodyData);

  if (!validationResult.success || !validationResult.data) {
    return validationFailed(validationResult.errors as FieldError[] | undefined, instance);
  }

  // Krok 4: Tworzenie serwisu generowania i przetwarzanie żądania
  const generationService = new GenerationService(locals.supabase, userId);

  try {
    const generationResponse = await generationService.createGeneration(validationResult.data);

    // Krok 5: Zwrócenie sukcesu (201 Created)
    return successResponse(generationResponse, 201);
  } catch (error) {
    // Obsługa błędów z serwisu generowania
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // eslint-disable-next-line no-console
    console.error("[POST /api/generations]", {
      userId,
      timestamp: new Date().toISOString(),
      error: errorMessage,
    });

    // Mapowanie błędów na odpowiednie kody HTTP
    if (errorMessage === "GENERATION_CREATE_FAILED" || errorMessage === "GENERATION_UPDATE_FAILED") {
      return serviceUnavailable(instance); // 503
    }

    if (errorMessage === "LLM_SERVICE_UNAVAILABLE") {
      return llmUnavailable(instance); // 503
    }

    if (errorMessage === "LLM_GENERATION_FAILED" || errorMessage === "LLM_TIMEOUT") {
      return llmTimeout(instance); // 504
    }

    // Ogólny błąd serwera
    return internalError(instance); // 500
  }
};
