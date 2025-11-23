/**
 * GET /api/flashcards/:flashcard_id
 * PATCH /api/flashcards/:flashcard_id
 * DELETE /api/flashcards/:flashcard_id
 *
 * Operacje na pojedynczej flashcard
 *
 * @endpoint GET /api/flashcards/:flashcard_id
 * @endpoint PATCH /api/flashcards/:flashcard_id
 * @endpoint DELETE /api/flashcards/:flashcard_id
 */

import type { APIRoute } from "astro";
import { authErrors } from "@/services/auth/auth.errors";
import { FlashcardService } from "@/services/flashcard/flashcard.service";
import { validateBody } from "@/lib/http/http.validate-body";
import { successResponse } from "@/lib/http/http.responses";
import { withProblemHandling, systemErrors } from "@/lib/errors/http";
import { flashcardErrors } from "@/services/flashcard/flashcard.errors";
import { flashcardIdParamSchema, updateFlashcardCommandSchema } from "@/lib/http/flashcard.validators";
import type { FlashcardDTO, UpdateFlashcardCommand, UpdateFlashcardResponseDTO, DeleteResponseDTO } from "@/types";
import { isFeatureEnabled } from "@/features";

export const prerender = false;

/**
 * GET /api/flashcards/:flashcard_id
 *
 * Pobiera szczegóły pojedynczej flashcard
 *
 * @returns FlashcardDTO (200 OK)
 */
export const GET: APIRoute = withProblemHandling(async ({ params, locals }) => {
  if (!isFeatureEnabled("flashcards")) {
    throw systemErrors.creators.FeatureDisabled({
      detail: "Flashcards feature is disabled in this environment",
      meta: { feature: "flashcards" },
    });
  }

  if (!locals.user) {
    throw authErrors.creators.Unauthorized({ detail: "Wymagana autoryzacja" });
  }
  const userId = locals.user.id;

  // Walidacja route parameter
  const flashcardIdResult = flashcardIdParamSchema.safeParse(params.flashcard_id);
  if (!flashcardIdResult.success) {
    throw flashcardErrors.creators.ValidationFailed({
      detail: "Invalid flashcard_id parameter",
      meta: flashcardIdResult.error.flatten(),
      cause: flashcardIdResult.error,
    });
  }
  const flashcardId = flashcardIdResult.data;

  const flashcardService = new FlashcardService(locals.supabase, userId);
  const flashcard: FlashcardDTO = await flashcardService.getFlashcardById(flashcardId);

  return successResponse(flashcard);
});

/**
 * PATCH /api/flashcards/:flashcard_id
 *
 * Aktualizuje flashcard
 *
 * @body UpdateFlashcardCommand { front?, back?, collection_id? }
 * @returns UpdateFlashcardResponseDTO (200 OK)
 */
export const PATCH: APIRoute = withProblemHandling(async ({ params, request, locals }) => {
  if (!isFeatureEnabled("flashcards")) {
    throw systemErrors.creators.FeatureDisabled({
      detail: "Flashcards feature is disabled in this environment",
      meta: { feature: "flashcards" },
    });
  }

  if (!locals.user) {
    throw authErrors.creators.Unauthorized({ detail: "Wymagana autoryzacja" });
  }
  const userId = locals.user.id;

  // Walidacja route parameter
  const flashcardIdResult = flashcardIdParamSchema.safeParse(params.flashcard_id);
  if (!flashcardIdResult.success) {
    throw flashcardErrors.creators.ValidationFailed({
      detail: "Invalid flashcard_id parameter",
      meta: flashcardIdResult.error.flatten(),
      cause: flashcardIdResult.error,
    });
  }
  const flashcardId = flashcardIdResult.data;

  // Walidacja body
  const commandData: UpdateFlashcardCommand = await validateBody(request, updateFlashcardCommandSchema);

  const flashcardService = new FlashcardService(locals.supabase, userId);
  const updatedFlashcard: UpdateFlashcardResponseDTO = await flashcardService.updateFlashcard(flashcardId, commandData);

  return successResponse(updatedFlashcard);
});

/**
 * DELETE /api/flashcards/:flashcard_id
 *
 * Usuwa flashcard
 *
 * @returns DeleteResponseDTO (200 OK)
 */
export const DELETE: APIRoute = withProblemHandling(async ({ params, locals }) => {
  if (!isFeatureEnabled("flashcards")) {
    throw systemErrors.creators.FeatureDisabled({
      detail: "Flashcards feature is disabled in this environment",
      meta: { feature: "flashcards" },
    });
  }

  if (!locals.user) {
    throw authErrors.creators.Unauthorized({ detail: "Wymagana autoryzacja" });
  }
  const userId = locals.user.id;

  // Walidacja route parameter
  const flashcardIdResult = flashcardIdParamSchema.safeParse(params.flashcard_id);
  if (!flashcardIdResult.success) {
    throw flashcardErrors.creators.ValidationFailed({
      detail: "Invalid flashcard_id parameter",
      meta: flashcardIdResult.error.flatten(),
      cause: flashcardIdResult.error,
    });
  }
  const flashcardId = flashcardIdResult.data;

  const flashcardService = new FlashcardService(locals.supabase, userId);
  const result: DeleteResponseDTO = await flashcardService.deleteFlashcard(flashcardId);

  return successResponse(result);
});
