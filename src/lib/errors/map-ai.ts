/**
 * src/lib/errors/map-ai.ts
 *
 * Mapowanie AI SDK (Vercel AI SDK v5) i OpenRouter errors na DomainError
 * Obsługuje content policy blocks, model unavailable, rate limits
 */

import { generationErrors } from "@/services/generation/generation.errors";

type AnyAIError = {
  code?: string;
  name?: string;
  message?: string;
  provider?: string;
  policy?: string;
  status?: number;
};

/**
 * Mapuj AI SDK error na odpowiedni DomainError
 * - content_blocked → generation/content-blocked (422)
 * - model_unavailable → generation/model-unavailable (503)
 * - rate_limit_exceeded → generation/provider-error (429)
 * - inne → generation/provider-error (502)
 */
export function fromAI(e: AnyAIError) {
  const name = e?.code ?? e?.name;

  // Content Policy Blocked (422 Unprocessable Entity)
  if (name === "content_blocked" || e?.policy === "blocked") {
    return generationErrors.creators.ContentBlocked({
      detail: "Treść odrzucona przez politykę treści modelu AI",
      meta: { provider: e?.provider },
    });
  }

  // Model Unavailable (503 Service Unavailable)
  if (name === "model_unavailable") {
    return generationErrors.creators.ModelUnavailable({
      detail: "Model AI jest tymczasowo niedostępny",
      meta: { provider: e?.provider },
    });
  }

  // Rate Limit Exceeded (429 Too Many Requests)
  if (name === "rate_limit_exceeded") {
    const providerError = generationErrors.creators.ProviderError({
      detail: "Limit dostawcy AI przekroczony",
      meta: { provider: e?.provider },
    });
    return {
      ...providerError,
      status: 429,
      title: "errors.common.rate_limit_exceeded",
    };
  }

  // Generic Provider Error (502 Bad Gateway)
  return generationErrors.creators.ProviderError({
    detail: e?.message ?? "Błąd usługi AI",
    meta: { provider: e?.provider },
  });
}

