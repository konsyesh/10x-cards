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
 */

import type { APIRoute } from "astro";
import { z } from "zod";
import { DEFAULT_USER_ID } from "@/db/supabase.client";
import { GenerationService } from "@/services/generation/generation.service";
import { validateBody } from "@/lib/http/http.validate-body";
import { createdResponse, successResponse } from "@/lib/http/http.responses";
import { withProblemHandling } from "@/lib/errors/http";
import { generationErrors } from "@/services/generation/generation.errors";
import { flashcardErrors } from "@/services/flashcard/flashcard.errors";
import type { CreateGenerationCommand } from "@/types";

export const prerender = false;

/**
 * Supported LLM models whitelist
 */
const SUPPORTED_MODELS = ["gpt-4o-mini"] as const;

/**
 * Zod schema do walidacji komendy tworzenia sesji generowania
 */
const createGenerationCommandSchema = z.object({
  source_text: z
    .string()
    .min(1000, "Tekst źródłowy musi zawierać co najmniej 1000 znaków")
    .max(50000, "Tekst źródłowy nie może przekraczać 50000 znaków")
    .describe("Tekst źródłowy do analizy (1000-50000 znaków)"),

  model: z
    .enum(SUPPORTED_MODELS, {
      errorMap: () => ({
        message: `Obsługiwany model to: ${SUPPORTED_MODELS.join(", ")}`,
      }),
    })
    .default("gpt-4o-mini")
    .describe("Model LLM do użycia w generowaniu"),
});

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
 */
function checkRateLimit(userId: string): boolean {
  const now = new Date();
  const userLimit = rateLimitMap.get(userId);

  if (!userLimit || now > userLimit.resetAt) {
    rateLimitMap.set(userId, {
      count: 1,
      resetAt: new Date(now.getTime() + RATE_LIMIT_WINDOW_MS),
    });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT_REQUESTS) {
    return false;
  }

  userLimit.count += 1;
  return true;
}

export const POST: APIRoute = withProblemHandling(async ({ request, locals }) => {
  const userId = DEFAULT_USER_ID;

  // Rate limiting check - rzuć DomainError jeśli limit przekroczony
  if (!checkRateLimit(userId)) {
    throw generationErrors.creators.ProviderError({
      detail: "Limit żądań przekroczony. Maksymalnie 5 żądań na minutę.",
      cause: new Error("RATE_LIMIT_EXCEEDED"),
    });
    // Note: withProblemHandling zmieni status na 429
  }

  // Walidacja body (rzuca DomainError jeśli fail)
  const commandData: CreateGenerationCommand = await validateBody(request, createGenerationCommandSchema);

  try {
    const generationService = new GenerationService(locals.supabase, userId);
    const generationResponse = await generationService.createGeneration(commandData);

    return successResponse(generationResponse);
  } catch (err) {
    // Jeśli już to DomainError - propaguj
    if (err instanceof Error && "code" in err) {
      throw err;
    }

    // Fallback - rzuć aby withProblemHandling go obsłużył
    throw err;
  }
});
