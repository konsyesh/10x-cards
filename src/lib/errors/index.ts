/**
 * src/lib/errors/index.ts
 *
 * Rdzeń architektury obsługi błędów RFC 7807.
 * Definiuje typy DomainError i ProblemDetails dla ustandaryzowanego formatu odpowiedzi.
 */

export type Domain = "flashcard" | "generation" | "auth" | "system" | "ai";

/**
 * Domenowy błąd wewnętrzny (wewnątrz serwera)
 * Zawiera techniczne szczegóły dla logów i debugowania
 */
export interface DomainError {
  domain: Domain;
  code: string; // np. "flashcard/not-found"
  status: number; // HTTP status
  title: string; // klucz i18n (tłumaczenie po stronie klienta, np. "errors.flashcard.not_found")
  message?: string; // techniczny opis dla logów/devtools
  meta?: Record<string, unknown>; // dane do UI/logów (bez PII)
  cause?: unknown; // oryginalna przyczyna (nigdy nie serializować do JSON)
}

/**
 * RFC 7807 Problem Details
 * Standardowy format odpowiedzi dla błędów HTTP
 * https://tools.ietf.org/html/rfc7807
 */
export interface ProblemDetails {
  type: string; // np. "https://docs.app.dev/problems/flashcard/not-found"
  title: string; // klucz i18n (klient tłumaczy za pomocą i18n)
  status: number; // HTTP status code
  detail?: string; // szczegółowy opis błędu (dostępny dla UI)
  instance?: string; // ścieżka URL (bez query string)
  code: string; // np. "flashcard/not-found" (dla maszynowego parsowania)
  meta?: Record<string, unknown>; // dodatkowe dane (np. zod.flatten())
}

/**
 * Type guard do sprawdzenia czy wartość to DomainError
 */
export function isDomainError(e: unknown): e is DomainError {
  return !!e && typeof e === "object" && "code" in (e as any) && "status" in (e as any);
}

/**
 * Fabryka do tworzenia DomainError z schowaną właściwością `cause`
 * `cause` jest przechowywane ale nie serializowane do JSON
 */
export function createDomainError(error: DomainError): DomainError {
  const { cause, ...serializableError } = error;

  return Object.create(Object.getPrototypeOf(serializableError), {
    ...Object.getOwnPropertyDescriptors(serializableError),
    cause: {
      value: cause,
      enumerable: false,
      writable: true,
      configurable: true,
    },
    toJSON: {
      value: function () {
        const { cause: _cause, ...json } = error as any;
        return json;
      },
      enumerable: false,
    },
  });
}
