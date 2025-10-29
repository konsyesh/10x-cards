import { z } from "zod";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { CreateFlashcardsCommand, ValidationErrorDetail } from "../../types";

/**
 * Zod schema dla pojedynczej karty do zapisania
 */
const createFlashcardItemSchema = z.object({
  front: z.string().min(1, "front must have at least 1 character").max(200, "front must not exceed 200 characters"),
  back: z.string().min(1, "back must have at least 1 character").max(500, "back must not exceed 500 characters"),
  source: z.enum(["manual", "ai-full", "ai-edited"], {
    errorMap: () => ({
      message: "source must be one of: manual, ai-full, ai-edited",
    }),
  }),
  generation_id: z.number().int().positive().optional().nullable(),
});

/**
 * Zod schema dla całego żądania tworzenia fiszek
 * Design: Schema structure is validated at runtime against CreateFlashcardsCommand
 * This ensures type safety between Zod validation and API request handler
 */
export const createFlashcardsCommandSchema = z.object({
  flashcards: z
    .array(createFlashcardItemSchema)
    .min(1, "flashcards array must have at least 1 item")
    .max(100, "flashcards array exceeds maximum size of 100 items"),
  collection_id: z.number().int().positive().optional().nullable(),
});

/**
 * Typ dla wyniku walidacji
 */
export interface CreateFlashcardsValidationResult {
  success: boolean;
  data?: z.infer<typeof createFlashcardsCommandSchema>;
  errors?: ValidationErrorDetail[];
}

/**
 * Waliduje komendę tworzenia fiszek
 * Zwraca szczegółowe informacje o błędach w formacie ValidationErrorDetail
 *
 * @param data - Dane do walidacji
 * @returns CreateFlashcardsValidationResult z data lub errors
 */
export function validateCreateFlashcardsCommand(data: unknown): CreateFlashcardsValidationResult {
  const result = createFlashcardsCommandSchema.safeParse(data);

  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      field: issue.path.join(".") || "unknown",
      message: issue.message,
    }));

    return { success: false, errors };
  }

  return { success: true, data: result.data };
}
