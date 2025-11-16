/**
 * src/lib/errors/map-ai.ts
 *
 * Mapowanie AI SDK errors (Vercel AI SDK, OpenRouter itp.) na DomainError
 * Obsługuje:
 * - content_blocked → 422 Unprocessable Entity
 * - model_unavailable → 503 Service Unavailable
 * - rate_limit_exceeded → 429 Too Many Requests
 * - inne → 502 Bad Gateway
 */

import { generationErrors } from "@/services/generation/generation.errors";

interface AIError {
  code?: string;
  name?: string;
  message?: string;
  provider?: string;
  policy?: string;
  status?: number;
}

/**
 * Mapuj AI SDK error na generation domain error
 * Heurystyka:
 * - Szukaj kodu/nazwy błędu: content_blocked, model_unavailable, rate_limit_exceeded
 * - Zwróć odpowiedni status (422, 503, 429, 502)
 *
 * @param err Błąd z AI SDK
 * @returns DomainError z odpowiednim kodem i statusem
 */
export function fromAI(err: AIError) {
  const code = err?.code ?? err?.name ?? "";

  // Content policy blocked (422 Unprocessable Entity)
  if (code === "content_blocked" || err?.policy === "blocked") {
    return generationErrors.creators.ContentBlocked({
      detail: err.message ?? "Treść odrzucona przez model",
      meta: { provider: err?.provider, originalCode: code },
      cause: err,
    });
  }

  // Model niedostępny (503 Service Unavailable)
  if (code === "model_unavailable") {
    return generationErrors.creators.ModelUnavailable({
      detail: err.message ?? "Model niedostępny",
      meta: { provider: err?.provider, originalCode: code },
      cause: err,
    });
  }

  // Timeout (504 Gateway Timeout)
  if (code === "timeout" || err?.status === 504) {
    return generationErrors.creators.TimeoutError({
      detail: err.message ?? "Timeout podczas generowania",
      meta: { provider: err?.provider, originalCode: code },
      cause: err,
    });
  }

  // Rate limit (429 Too Many Requests, ale mapowany na ProviderError)
  if (code === "rate_limit_exceeded") {
    const rateLimitError = generationErrors.creators.ProviderError({
      detail: err.message ?? "Limit dostawcy AI",
      meta: { provider: err?.provider, originalCode: code },
      cause: err,
    });
    // Override statusu na 429
    return {
      ...rateLimitError,
      status: 429,
    };
  }

  // Fallback - provider error (502 Bad Gateway)
  return generationErrors.creators.ProviderError({
    detail: err.message ?? "Błąd dostawcy AI",
    meta: { provider: err?.provider, originalCode: code },
    cause: err,
  });
}
