/**
 * src/lib/http/http.fetcher.ts
 *
 * Frontend HTTP client kompatybilny z RFC 7807
 * - Rozpoznaje problem+json i rzuca ApiError
 * - Automatycznie dodaje credentials: include (httpOnly cookies)
 * - Zwraca raw dane na sukces
 * - Loguje X-Request-ID dla supportu
 */

import type { ProblemDetails } from "@/lib/errors/index";

/**
 * Niestandardowy błąd dla RFC 7807 problem+json responses
 * Zawiera strukturyzowane dane problemu i request ID do korelacji logów
 */
export class ApiError extends Error {
  constructor(
    public problem: ProblemDetails,
    public requestId?: string
  ) {
    super(problem.detail ?? problem.title);
    this.name = "ApiError";
  }
}

/**
 * Fetch wrapper dla API calls z obsługą problem+json
 *
 * Przepływ:
 * 1. Wysyła żądanie z Content-Type: application/json
 * 2. Automatycznie dodaje credentials: include (cookies)
 * 3. Na error (4xx/5xx):
 *    - Jeśli content-type to problem+json → rzuca ApiError(ProblemDetails)
 *    - Inaczej → rzuca Error(HTTP status)
 * 4. Na sukces (2xx):
 *    - Zwraca parsed JSON jako T
 * 5. Zawsze wyodrębnia X-Request-ID z nagłówka
 *
 * @template T Typ oczekiwanej odpowiedzi
 * @param input URL lub Request URL string
 * @param init Opcje fetch (method, headers, body)
 * @returns Promise<T> Sparsowana odpowiedź
 * @throws ApiError jeśli problem+json
 * @throws Error dla innych błędów HTTP
 *
 * @example
 * try {
 *   const data = await fetchJson<GenerationResponseDTO>("/api/generations", {
 *     method: "POST",
 *     body: JSON.stringify({ source_text: "..." }),
 *   });
 *   console.log(data.generation_id);
 * } catch (err) {
 *   if (err instanceof ApiError) {
 *     console.error("RFC 7807 Problem:", err.problem);
 *     console.log("Request ID:", err.requestId);
 *   } else {
 *     console.error("Network error:", err.message);
 *   }
 * }
 */
export async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    // Automatycznie dodaj credentials dla httpOnly cookies
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  // Wyodrębnij X-Request-ID z nagłówka (dla korelacji logów)
  const requestId = res.headers.get("x-request-id") ?? undefined;
  const contentType = res.headers.get("content-type") ?? "";

  // Obsługa błędów HTTP
  if (!res.ok) {
    // Sprawdź czy to problem+json (RFC 7807)
    if (contentType.includes("application/problem+json")) {
      const problem: ProblemDetails = await res.json();
      throw new ApiError(problem, requestId);
    }

    // Fallback dla innych typów błędów
    throw new Error(`HTTP ${res.status}`);
  }

  // Sukces - zwróć sparsowany JSON
  if (contentType.includes("application/json")) {
    return res.json() as Promise<T>;
  }

  // Jeśli nie ma JSON w odpowiedzi (np. 204 No Content)
  return undefined as T;
}
