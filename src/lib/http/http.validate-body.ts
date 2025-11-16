/**
 * src/lib/http/http.validate-body.ts
 *
 * Walidacja JSON body z Zod schema
 * Mapuje błędy na DomainError poprzez fromZod mapper
 * Rzuca błąd zamiast zwracać Response (obsługiwane przez withProblemHandling)
 */

import type { ZodSchema } from "zod";
import { fromZod } from "@/lib/errors/map-zod";
import { fromZodAuth } from "@/lib/errors/map-zod";

/**
 * Waliduj JSON body żądania względem Zod schema
 * W przypadku błędu walidacji rzuca DomainError (mapowany przez fromZod)
 * Błędy JSON również rzucane jako DomainError
 *
 * Przepływ:
 * 1. Parsuje request.json()
 * 2. Waliduje schema.safeParse()
 * 3. Jeśli sukces → zwraca dane
 * 4. Jeśli błąd → rzuca DomainError
 *
 * @param request - Astro request object
 * @param schema - Zod schema
 * @returns Walidowane dane typu T
 * @throws DomainError (flashcard/validation-failed)
 */
export async function validateBody<T>(request: Request, schema: ZodSchema<T>): Promise<T> {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    // JSON parse error → rzuć jako validation error
    throw fromZod({
      issues: [
        {
          code: "custom",
          message: "Invalid JSON",
          path: [],
        },
      ],
      addIssue: () => {
        // Empty function for Zod error mock
      },
      flatten: () => ({
        formErrors: ["Invalid JSON"],
        fieldErrors: {},
      }),
    } as any);
  }

  const result = schema.safeParse(payload);

  if (!result.success) {
    throw fromZod(result.error);
  }

  return result.data;
}

export async function validateAuthBody<T>(request: Request, schema: ZodSchema<T>): Promise<T> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    throw fromZodAuth({
      issues: [{ code: "custom", message: "Invalid JSON", path: [] }],
      addIssue: () => {
        // Empty function for Zod error mock
      },
      flatten: () => ({ formErrors: ["Invalid JSON"], fieldErrors: {} }),
    } as any);
  }

  const result = schema.safeParse(payload);
  if (!result.success) {
    throw fromZodAuth(result.error);
  }
  return result.data;
}
