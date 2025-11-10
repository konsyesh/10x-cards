/**
 * src/lib/errors/map-supabase.ts
 *
 * Mapowanie Supabase/PostgrestError na DomainError
 * Obsługuje 404, 429, rate limits i inne błędy bazy danych
 */

import { flashcardErrors } from "@/services/flashcard/flashcard.errors";

interface SupabaseError {
  code?: string;
  message: string;
  status?: number;
}

/**
 * Mapuj Supabase error na odpowiedni DomainError
 * - 404 → flashcard/not-found
 * - 429 → rate limit (status override na 429)
 * - inne → flashcard/database-error (500)
 */
export function fromSupabase(err: SupabaseError) {
  // 404 Not Found
  if (err.status === 404 || err.code === "PGRST116") {
    return flashcardErrors.creators.NotFound({
      detail: "Zasób nie istnieje",
      cause: err,
    });
  }

  // 429 Rate Limit
  if (err.status === 429) {
    const rateLimitError = flashcardErrors.creators.DatabaseError({
      detail: "Limit zapytań przekroczony",
      cause: err,
    });
    return {
      ...rateLimitError,
      status: 429,
      title: "errors.common.rate_limit_exceeded",
    };
  }

  // Fallback → 500 Database Error
  return flashcardErrors.creators.DatabaseError({
    detail: err.message ?? "Błąd bazy danych",
    cause: err,
  });
}
