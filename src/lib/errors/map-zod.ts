/**
 * src/lib/errors/map-zod.ts
 *
 * Mapowanie Zod errors na DomainError
 * Zawsze zwraca 400 Bad Request z flatten() metadata
 */

import type { ZodError } from "zod";
import { flashcardErrors } from "@/services/flashcard/flashcard.errors";
import { authErrors } from "@/services/auth/auth.errors";

/**
 * Mapuj ZodError na flashcard/validation-failed
 * Zawiera pełny flatten() w meta dla frontendu
 * 
 * Używane dla błędów walidacji w domenie flashcard
 */
export function fromZod(err: ZodError): typeof flashcardErrors.creators.ValidationFailed {
  return flashcardErrors.creators.ValidationFailed({
    detail: "Sprawdź pola formularza",
    meta: err.flatten(),
    cause: err,
  });
}

/**
 * Mapuj ZodError na auth/validation-failed
 * Zawiera pełny flatten() w meta dla frontendu
 * 
 * Używane dla błędów walidacji w endpointach auth
 * Zgodne z auth-spec-codex.md wymaganiem: fromZod() → auth/validation-failed
 */
export function fromZodAuth(err: ZodError): typeof authErrors.creators.ValidationFailed {
  return authErrors.creators.ValidationFailed({
    detail: "Sprawdź pola formularza",
    meta: err.flatten(),
    cause: err,
  });
}
