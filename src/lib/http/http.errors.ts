// src/lib/http/http.errors.ts
import { errorResponse, type FieldError } from "./http.responses";

// 415 - zły lub brak Content-Type
export function unsupportedMediaType(instance: string): Response {
  return errorResponse({
    code: "UNSUPPORTED_MEDIA_TYPE",
    message: "Nieobsługiwany Content-Type. Użyj application/json.",
    status: 415,
    instance,
  });
}

// 429 - za dużo żądań
export function rateLimitExceeded(instance: string): Response {
  return errorResponse({
    code: "RATE_LIMIT_EXCEEDED",
    message: "Przekroczono limit żądań. Limit: 5 na minutę.",
    status: 429,
    instance,
    hint: "Odczekaj chwilę i spróbuj ponownie.",
  });
}

// 400 - body nie jest poprawnym JSON-em
export function badJson(instance: string): Response {
  return errorResponse({
    code: "INVALID_JSON",
    message: "Niepoprawny format JSON w body żądania.",
    status: 400,
    instance,
    hint: "Upewnij się, że wysyłasz poprawny JSON i Content-Type: application/json.",
  });
}

// 404
export function notFound(message: string, instance: string): Response {
  return errorResponse({
    code: "RESOURCE_NOT_FOUND",
    message,
    status: 404,
    instance,
  });
}

// 403
export function forbidden(message: string, instance: string): Response {
  return errorResponse({
    code: "FORBIDDEN",
    message,
    status: 403,
    instance,
  });
}

// 422 - JSON się sparsował, ale walidacja Zod nie przeszła
export function validationFailed(details: FieldError[] | undefined, instance: string): Response {
  return errorResponse({
    code: "VALIDATION_ERROR",
    message: "Walidacja parametrów nie powiodła się.",
    status: 422,
    details,
    instance,
    hint: "Popraw pola wymienione w 'details' i spróbuj ponownie.",
  });
}

// 503 - nasza infrastruktura (DB itp.) jest chwilowo niedostępna
export function serviceUnavailable(instance: string): Response {
  return errorResponse({
    code: "SERVICE_UNAVAILABLE",
    message: "Usługa jest tymczasowo niedostępna. Spróbuj ponownie później.",
    status: 503,
    instance,
  });
}

// 503 - LLM nieosiągalne / wykrzaczyło się upstream
export function llmUnavailable(instance: string): Response {
  return errorResponse({
    code: "SERVICE_UNAVAILABLE",
    message: "Usługa LLM jest tymczasowo niedostępna. Spróbuj ponownie później.",
    status: 503,
    instance,
  });
}

// 504 - timeout u dostawcy LLM / generowanie za długo trwało
export function llmTimeout(instance: string): Response {
  return errorResponse({
    code: "GATEWAY_TIMEOUT",
    message: "Żądanie do usługi LLM przekroczyło limit czasu. Spróbuj z krótszym tekstem.",
    status: 504,
    instance,
    hint: "Możesz spróbować skrócić tekst wejściowy.",
  });
}

// 500 - nieoczekiwany wyjątek
export function internalError(instance: string): Response {
  return errorResponse({
    code: "INTERNAL_SERVER_ERROR",
    message: "Podczas przetwarzania żądania wystąpił nieoczekiwany błąd.",
    status: 500,
    instance,
  });
}
