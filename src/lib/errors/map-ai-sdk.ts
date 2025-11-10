/**
 * src/lib/errors/map-ai-sdk.ts
 *
 * Mapowanie błędów z AI SDK v5 / OpenRouter na DomainError
 */

import { aiErrors } from "@/services/ai/ai.errors";

interface AISDKError {
  code?: string;
  name?: string;
  message?: string;
  status?: number;
  statusCode?: number;
  error?: {
    code?: string;
    message?: string;
  };
}

/**
 * Mapuj błąd z AI SDK na domenowy błąd AI
 * Heurystyka: szuka kodu/statusu i mapuje na odpowiedni aiErrors.creators.*
 */
export function fromAISDK(err: AISDKError) {
  const code = err?.code ?? err?.name ?? "";
  const status = err?.status ?? err?.statusCode;

  // Rate limit (429)
  if (code === "rate_limit_exceeded" || status === 429) {
    return aiErrors.creators.RateLimited({
      detail: err?.message ?? "Rate limit exceeded",
      meta: { originalCode: code, status },
      cause: err,
    });
  }

  // Timeout (408)
  if (code === "timeout" || code === "ETIMEDOUT") {
    return aiErrors.creators.Timeout({
      detail: err?.message ?? "Request timeout",
      meta: { originalCode: code },
      cause: err,
    });
  }

  // Unauthorized (401)
  if (status === 401 || code === "unauthorized") {
    return aiErrors.creators.Unauthorized({
      detail: err?.message ?? "Unauthorized",
      meta: { status },
      cause: err,
    });
  }

  // Forbidden (403)
  if (status === 403) {
    return aiErrors.creators.Forbidden({
      detail: err?.message ?? "Forbidden",
      meta: { status },
      cause: err,
    });
  }

  // Bad request (400)
  if (status === 400 || code === "bad_request") {
    return aiErrors.creators.BadRequest({
      detail: err?.message ?? "Bad request",
      meta: { status, code },
      cause: err,
    });
  }

  // Service unavailable (503)
  if (status === 503 || code === "model_unavailable" || code === "service_unavailable") {
    return aiErrors.creators.ServiceUnavailable({
      detail: err?.message ?? "Service unavailable",
      meta: { status, code },
      cause: err,
    });
  }

  // Provider error (5xx)
  if (status && status >= 500) {
    return aiErrors.creators.ProviderError({
      detail: err?.message ?? "Provider error",
      meta: { status },
      cause: err,
    });
  }

  // Fallback - validation failed
  return aiErrors.creators.ValidationFailed({
    detail: err?.message ?? "Unknown AI SDK error",
    meta: { code, status },
    cause: err,
  });
}

