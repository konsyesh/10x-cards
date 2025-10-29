import type { ZodSchema } from "zod";
import { badJson, validationFailed } from "./http.errors";
import type { FieldError } from "./http.responses";

/**
 * Wynik walidacji body — sukces lub błąd
 * Jeśli walidacja się nie powiodła, zwraca gotowy Response do wysłania
 */
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  response?: Response; // Jeśli validation nie przeszła, tu jest gotowy Response (400 lub 422)
}

/**
 * Centralizowany helper do walidacji JSON body + Zod schema
 *
 * Przepływ:
 * 1. Parsuje request.json() — jeśli fail → badJson (400)
 * 2. Waliduje Zodem — jeśli fail → validationFailed (422)
 * 3. Zwraca ValidationResult<T> — albo success: true z data, albo success: false z response
 *
 * Zastosowanie w endpoincie:
 * ```ts
 * const validation = await validateBody(request, MyCommandSchema, instance);
 * if (!validation.success) {
 *   return validation.response!;
 * }
 *
 * const command = validation.data; // TypeScript wie że to nie undefined
 * // ... dalej logika ...
 * ```
 *
 * @param request - Astro request object
 * @param schema - Zod schema do walidacji
 * @param instance - API endpoint path (do logów i error response)
 * @returns ValidationResult<T> — struktura z success lub response błędu
 *
 * @example
 * const validation = await validateBody(request, createUserSchema, "/api/users");
 * if (!validation.success) return validation.response!;
 *
 * const user = await userService.create(validation.data);
 * return successResponse(user, 201);
 */
export async function validateBody<T>(
  request: Request,
  schema: ZodSchema<T>,
  instance: string
): Promise<ValidationResult<T>> {
  // Krok 1: Parsowanie JSON
  let bodyData: unknown;

  try {
    bodyData = await request.json();
  } catch {
    return {
      success: false,
      response: badJson(instance),
    };
  }

  // Krok 2: Walidacja Zodem
  const result = schema.safeParse(bodyData);

  if (!result.success) {
    // Mapowanie issues na FieldError[]
    const errors = result.error.issues.map((issue) => ({
      field: issue.path.join(".") || "unknown",
      message: issue.message,
    }));

    return {
      success: false,
      response: validationFailed(errors as FieldError[], instance),
    };
  }

  // Krok 3: Sukces — zwróć data
  return {
    success: true,
    data: result.data,
  };
}
