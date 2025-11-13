/**
 * src/services/auth/auth.errors.ts
 *
 * Domainowe błędy dla domeny auth
 * Zgodne z RFC 7807 i specyfikacją auth-spec-codex.md
 */

import { defineDomain } from "@/lib/errors/registry";

export const authErrors = defineDomain("auth", {
  Unauthorized: {
    code: "auth/unauthorized",
    status: 401,
    title: "errors.auth.unauthorized",
  },
  Forbidden: {
    code: "auth/forbidden",
    status: 403,
    title: "errors.auth.forbidden",
  },
  InvalidCredentials: {
    code: "auth/invalid-credentials",
    status: 401,
    title: "errors.auth.invalid_credentials",
  },
  ValidationFailed: {
    code: "auth/validation-failed",
    status: 400,
    title: "errors.auth.validation_failed",
  },
  UserExists: {
    code: "auth/user-exists",
    status: 409,
    title: "errors.auth.user_exists",
  },
  EmailNotConfirmed: {
    code: "auth/email-not-confirmed",
    status: 403,
    title: "errors.auth.email_not_confirmed",
  },
  RateLimited: {
    code: "auth/rate-limited",
    status: 429,
    title: "errors.auth.rate_limited",
  },
  ProviderError: {
    code: "auth/provider-error",
    status: 502,
    title: "errors.auth.provider_error",
  },
});
