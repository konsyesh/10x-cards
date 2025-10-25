import { z } from "zod";

/**
 * Supported LLM models whitelist
 */
const SUPPORTED_MODELS = ["gpt-4o-mini"] as const;

/**
 * Zod schema do walidacji komendy tworzenia sesji generowania
 * Sprawdza:
 * - source_text: 1000-50000 znaków, wymagane, string
 * - model: z whitelist obsługiwanych modeli
 */
export const createGenerationCommandSchema = z.object({
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
 * Typ dla walidowanych danych (inferred z schematu)
 */
export type ValidatedGenerationCommand = z.infer<typeof createGenerationCommandSchema>;

/**
 * Waliduje dane wejściowe dla komendy tworzenia sesji generowania
 *
 * @param data - Dane do walidacji
 * @returns Walidowane dane lub error details
 *
 * @example
 * const result = validateGenerationCommand({ source_text: "...", model: "gpt-4o-mini" });
 * if (result.success) {
 *   // Użyj result.data
 * } else {
 *   // Obsłuż błędy z result.errors
 * }
 */
export function validateGenerationCommand(data: unknown): {
  success: boolean;
  data?: ValidatedGenerationCommand;
  errors?: { field: string; message: string }[];
} {
  const result = createGenerationCommandSchema.safeParse(data);

  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      field: issue.path.join(".") || "unknown",
      message: issue.message,
    }));

    return { success: false, errors };
  }

  return { success: true, data: result.data };
}
