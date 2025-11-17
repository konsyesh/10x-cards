/**
 * src/lib/http/http.validate-query.ts
 *
 * Walidacja query parameters z URL searchParams używając Zod schema
 * Mapuje błędy na DomainError poprzez fromZod mapper
 * Rzuca błąd zamiast zwracać Response (obsługiwane przez withProblemHandling)
 */

import type { ZodTypeAny } from "zod";
import { fromZod } from "@/lib/errors/map-zod";

/**
 * Waliduj query parameters z URL względem Zod schema
 * W przypadku błędu walidacji rzuca DomainError (mapowany przez fromZod)
 *
 * Przepływ:
 * 1. Parsuje URL z request.url
 * 2. Ekstraktuje searchParams
 * 3. Konwertuje string values na odpowiednie typy (number, boolean, etc.)
 * 4. Waliduje schema.safeParse()
 * 5. Jeśli sukces → zwraca dane
 * 6. Jeśli błąd → rzuca DomainError
 *
 * @param request - Astro request object
 * @param schema - Zod schema (może być ZodEffects z transform)
 * @returns Walidowane dane typu T
 * @throws DomainError (flashcard/validation-failed)
 */
export function validateQuery<T>(request: Request, schema: ZodTypeAny): T {
  const url = new URL(request.url);
  const searchParams = url.searchParams;

  // Konwertuj searchParams na obiekt - wszystkie wartości jako stringi
  // Zod schema będzie odpowiedzialna za transformację typów
  const queryObject: Record<string, string | undefined> = {};

  for (const [key, value] of searchParams.entries()) {
    queryObject[key] = value || undefined;
  }

  const result = schema.safeParse(queryObject);

  if (!result.success) {
    throw fromZod(result.error);
  }

  return result.data;
}

