import type { AstroGlobal } from "astro";
import { supabaseClient, DEFAULT_USER_ID } from "../../db/supabase.client";
import { validateGenerationCommand } from "../../lib/validators/generation.validator";
import { GenerationService } from "../../lib/services/generation.service";
import type { ApiErrorResponse, ApiSuccessResponse } from "../../types";

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
export const POST = async (context: AstroGlobal) => {
  // TODO: Na etapie wdrażania middleware JWT będzie weryfikować token
  // Dla teraz używamy DEFAULT_USER_ID
  const userId = DEFAULT_USER_ID;

  // Krok 1: Rate limiting check
  if (!checkRateLimit(userId)) {
    const response = createErrorResponse("RATE_LIMIT_EXCEEDED", "Przekroczono limit żądań. Limit: 5 na minutę.", 429);
    return new Response(JSON.stringify(response.body), { status: response.status });
  }

  // Krok 2: Parsowanie JSON body
  let bodyData: unknown;

  try {
    bodyData = await context.request.json();
  } catch {
    const response = createErrorResponse("VALIDATION_ERROR", "Niepoprawny format JSON w body żądania", 400);
    return new Response(JSON.stringify(response.body), { status: response.status });
  }

  // Krok 3: Walidacja danych za pomocą Zod
  const validationResult = validateGenerationCommand(bodyData);

  if (!validationResult.success || !validationResult.data) {
    const response = createErrorResponse(
      "VALIDATION_ERROR",
      "Walidacja parametrów nie powiodła się",
      400,
      validationResult.errors
    );
    return new Response(JSON.stringify(response.body), { status: response.status });
  }

  // Krok 4: Tworzenie serwisu generowania i przetwarzanie żądania
  const generationService = new GenerationService(supabaseClient, userId);

  try {
    const generationResponse = await generationService.createGeneration(validationResult.data);

    // Krok 5: Zwrócenie sukcesu (201 Created)
    const response = createSuccessResponse(generationResponse, 201);
    return new Response(JSON.stringify(response.body), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
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
    if (errorMessage === "TEXT_LENGTH_INVALID") {
      const response = createErrorResponse(
        "TEXT_LENGTH_INVALID",
        "Tekst źródłowy musi zawierać od 1000 do 50000 znaków",
        400
      );
      return new Response(JSON.stringify(response.body), { status: response.status });
    }

    if (errorMessage === "GENERATION_CREATE_FAILED" || errorMessage === "GENERATION_UPDATE_FAILED") {
      const response = createErrorResponse(
        "SERVICE_UNAVAILABLE",
        "Usługa jest tymczasowo niedostępna. Spróbuj ponownie później.",
        503
      );
      return new Response(JSON.stringify(response.body), { status: response.status });
    }

    if (errorMessage === "LLM_SERVICE_UNAVAILABLE") {
      const response = createErrorResponse(
        "SERVICE_UNAVAILABLE",
        "Usługa LLM jest tymczasowo niedostępna. Spróbuj ponownie później.",
        503
      );
      return new Response(JSON.stringify(response.body), { status: response.status });
    }

    if (errorMessage === "LLM_GENERATION_FAILED" || errorMessage === "LLM_TIMEOUT") {
      const response = createErrorResponse(
        "GATEWAY_TIMEOUT",
        "Żądanie do usługi LLM przekroczyło limit czasu. Spróbuj z krótszym tekstem.",
        504
      );
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
