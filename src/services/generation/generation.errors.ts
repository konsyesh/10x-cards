/**
 * src/services/generation/generation.errors.ts
 *
 * Domainowe błędy dla domeny generation (AI)
 */

import { defineDomain } from "@/lib/errors/registry";

export const generationErrors = defineDomain("generation", {
  ValidationFailed: {
    code: "generation/validation-failed",
    status: 400,
    title: "errors.generation.validation_failed",
  },
  ContentBlocked: {
    code: "generation/content-blocked",
    status: 422,
    title: "errors.generation.content_blocked",
  },
  ModelUnavailable: {
    code: "generation/model-unavailable",
    status: 503,
    title: "errors.generation.model_unavailable",
  },
  ProviderError: {
    code: "generation/provider-error",
    status: 502,
    title: "errors.generation.provider_error",
  },
  TimeoutError: {
    code: "generation/timeout",
    status: 504,
    title: "errors.generation.timeout",
  },
});

