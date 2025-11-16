/**
 * src/services/flashcard/flashcard.errors.ts
 *
 * Domainowe błędy dla domeny flashcard
 */

import { defineDomain } from "@/lib/errors/registry";

export const flashcardErrors = defineDomain("flashcard", {
  NotFound: {
    code: "flashcard/not-found",
    status: 404,
    title: "errors.flashcard.not_found",
  },
  ValidationFailed: {
    code: "flashcard/validation-failed",
    status: 400,
    title: "errors.flashcard.validation_failed",
  },
  DatabaseError: {
    code: "flashcard/database-error",
    status: 500,
    title: "errors.flashcard.database_error",
  },
  GenerationNotFound: {
    code: "flashcard/generation-not-found",
    status: 404,
    title: "errors.flashcard.generation_not_found",
  },
  CollectionNotFound: {
    code: "flashcard/collection-not-found",
    status: 404,
    title: "errors.flashcard.collection_not_found",
  },
  CollectionAccessDenied: {
    code: "flashcard/collection-access-denied",
    status: 404, // 404 zamiast 403, żeby nie ujawniać istnienia cudzych kolekcji
    title: "errors.flashcard.collection_access_denied",
  },
  SchedulerUnavailable: {
    code: "flashcard/scheduler-unavailable",
    status: 503,
    title: "errors.flashcard.scheduler_unavailable",
  },
});
