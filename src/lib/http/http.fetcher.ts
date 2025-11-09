/**
 * src/lib/http/http.fetcher.ts
 *
 * HTTP fetcher dla frontendu
 * Rozpoznaje problem+json, rzuca ApiError, używa credentials: include
 */

import type { ProblemDetails } from "@/lib/errors/index";

/**
 * Błąd API - wrappuje RFC 7807 ProblemDetails
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
 * Typowa zapaytanie HTTP z rozpoznawaniem problem+json
 * Domyślnie używa credentials: include (httpOnly cookies)
 *
 * Przepływ:
 * 1. Wysyła żądanie z credentials: include
 * 2. Odczytuje Content-Type
 * 3. Jeśli error i problem+json → rzuca ApiError
 * 4. Jeśli error i inny typ → rzuca Error z kodem HTTP
 * 5. Jeśli sukces → parsuje JSON lub zwraca undefined
 *
 * @param input - URL lub Request
 * @param init - RequestInit (będzie merged z defaults)
 * @returns Parsowane dane typu T lub undefined
 * @throws ApiError (dla problem+json) lub Error (dla innego formatu)
 */
export async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    credentials: "include", // httpOnly cookies
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const requestId = res.headers.get("x-request-id") ?? undefined;
  const contentType = res.headers.get("content-type") ?? "";

  // Error response
  if (!res.ok) {
    if (contentType.includes("application/problem+json")) {
      const problem: ProblemDetails = await res.json();
      throw new ApiError(problem, requestId);
    }
    throw new Error(`HTTP ${res.status}`);
  }

  // Success response
  if (contentType.includes("application/json")) {
    return res.json();
  }

  return undefined as T;
}

