/**
 * src/lib/errors/map-supabase-auth.ts
 *
 * Mapowanie błędów Supabase Auth na DomainError dla domeny auth
 * Obsługuje kody błędów z Supabase Auth API zgodnie z auth-spec-codex.md
 */

import { authErrors } from "@/services/auth/auth.errors";

interface SupabaseAuthError {
  message?: string;
  status?: number;
  code?: string;
  name?: string;
}

/**
 * Mapuj błąd Supabase Auth na odpowiedni DomainError
 *
 * Mapowanie zgodne z specyfikacją:
 * - invalid_credentials → auth/invalid-credentials (401)
 * - user_exists/user_already_registered → auth/user-exists (409)
 * - email_not_confirmed → auth/email-not-confirmed (403)
 * - rate_limit → auth/rate-limited (429)
 * - provider errors → auth/provider-error (502)
 *
 * @param err Błąd z Supabase Auth API
 * @returns DomainError z odpowiednim kodem i statusem
 */
export function fromSupabaseAuth(err: SupabaseAuthError) {
  const message = err.message ?? "";
  const code = err.code ?? err.name ?? "";
  const status = err.status;

  // 429 Rate Limit (zbyt wiele prób logowania/reset)
  if (status === 429 || code === "rate_limit_exceeded" || message.toLowerCase().includes("rate limit")) {
    return authErrors.creators.RateLimited({
      detail: "Zbyt wiele prób. Spróbuj ponownie za chwilę.",
      cause: err,
    });
  }

  // 401 Invalid Credentials (błędne dane logowania)
  if (
    status === 400 ||
    code === "invalid_credentials" ||
    code === "invalid_grant" ||
    message.toLowerCase().includes("invalid login") ||
    message.toLowerCase().includes("invalid password") ||
    message.toLowerCase().includes("email not found")
  ) {
    return authErrors.creators.InvalidCredentials({
      detail: "Nieprawidłowy e-mail lub hasło",
      cause: err,
    });
  }

  // 409 User Exists (email już zarejestrowany)
  if (
    status === 422 ||
    code === "user_already_registered" ||
    code === "signup_disabled" ||
    message.toLowerCase().includes("user already registered") ||
    message.toLowerCase().includes("already registered") ||
    message.toLowerCase().includes("email address already registered")
  ) {
    return authErrors.creators.UserExists({
      detail: "Konto z tym adresem e-mail już istnieje",
      cause: err,
    });
  }

  // 403 Email Not Confirmed (konto nieaktywne)
  if (
    code === "email_not_confirmed" ||
    code === "email_address_not_authorized" ||
    message.toLowerCase().includes("email not confirmed") ||
    message.toLowerCase().includes("email not verified")
  ) {
    return authErrors.creators.EmailNotConfirmed({
      detail: "Konto nie zostało aktywowane. Sprawdź skrzynkę e-mail.",
      cause: err,
    });
  }

  // 502 Provider Error (błąd dostawcy/usługi Supabase)
  if (
    status === 502 ||
    status === 503 ||
    code === "provider_error" ||
    message.toLowerCase().includes("provider error") ||
    message.toLowerCase().includes("service unavailable")
  ) {
    return authErrors.creators.ProviderError({
      detail: "Błąd usługi autoryzacji. Spróbuj ponownie za chwilę.",
      cause: err,
    });
  }

  // Fallback - dla nieznanych błędów zwracamy ProviderError
  // (lepiej niż Unexpected, bo to błąd zewnętrznej usługi)
  return authErrors.creators.ProviderError({
    detail: message || "Błąd autoryzacji",
    cause: err,
  });
}
