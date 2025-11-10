/**
 * src/services/ai/ai.errors.ts
 *
 * Domainowe błędy dla domeny AI (AIService)
 */

import { defineDomain } from "@/lib/errors/registry";

export const aiErrors = defineDomain("ai", {
  InvalidInput: {
    code: "ai/invalid-input",
    status: 400,
    title: "errors.ai.invalid_input",
  },
  InvalidConfig: {
    code: "ai/invalid-config",
    status: 400,
    title: "errors.ai.invalid_config",
  },
  Unauthorized: {
    code: "ai/unauthorized",
    status: 401,
    title: "errors.ai.unauthorized",
  },
  Forbidden: {
    code: "ai/forbidden",
    status: 403,
    title: "errors.ai.forbidden",
  },
  BadRequest: {
    code: "ai/bad-request",
    status: 400,
    title: "errors.ai.bad_request",
  },
  RateLimited: {
    code: "ai/rate-limited",
    status: 429,
    title: "errors.ai.rate_limited",
  },
  Timeout: {
    code: "ai/timeout",
    status: 408,
    title: "errors.ai.timeout",
  },
  ProviderError: {
    code: "ai/provider-error",
    status: 502,
    title: "errors.ai.provider_error",
  },
  ServiceUnavailable: {
    code: "ai/service-unavailable",
    status: 503,
    title: "errors.ai.service_unavailable",
  },
  SchemaError: {
    code: "ai/schema-error",
    status: 422,
    title: "errors.ai.schema_error",
  },
  ValidationFailed: {
    code: "ai/validation-failed",
    status: 422,
    title: "errors.ai.validation_failed",
  },
  ParseError: {
    code: "ai/parse-error",
    status: 422,
    title: "errors.ai.parse_error",
  },
  RetryExhausted: {
    code: "ai/retry-exhausted",
    status: 503,
    title: "errors.ai.retry_exhausted",
  },
});

