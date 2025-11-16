/**
 * src/lib/errors/map-zod.ts
 *
 * Mapowanie Zod errors na DomainError
 * Zawsze zwraca 400 Bad Request z flatten() metadata
 */

import type { ZodError } from "zod";
import { flashcardErrors } from "@/services/flashcard/flashcard.errors";

/**
 * Mapuj ZodError na flashcard/validation-failed
 * Zawiera pełny flatten() w meta dla frontendu
 */
export function fromZod(err: ZodError): typeof flashcardErrors.creators.ValidationFailed {
  return flashcardErrors.creators.ValidationFailed({
    detail: "Sprawdź pola formularza",
    meta: err.flatten(),
    cause: err,
  });
}
