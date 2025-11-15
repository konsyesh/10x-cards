/**
 * src/pages/api/auth/reset-password.ts
 *
 * Endpoint POST /api/auth/reset-password
 *
 * Żądanie resetu hasła przez Supabase Auth
 * Zgodne z auth-spec-codex.md i US-003
 *
 * Request: { email: string }
 * Response: 200 { message: string } - zawsze neutralny komunikat (bez enumeracji kont)
 * Errors: 400 auth/validation-failed, 429 auth/rate-limited, 500 system/unexpected
 */

import type { APIRoute } from "astro";
import { withProblemHandling } from "@/lib/errors/http";
import { fromSupabaseAuth } from "@/lib/errors/map-supabase-auth";
import { successResponse } from "@/lib/http/http.responses";
import { authErrors } from "@/services/auth/auth.errors";
import { validateAuthBody } from "@/lib/http/http.validate-body";
import { ResetPasswordRequestSchema } from "@/services/auth/auth.schema";
import { getBaseUrl } from "@/lib/http/http.base-url";
import { createInMemoryRateLimiter, makeKeyIpEmail } from "@/lib/http/http.rate-limit";

export const prerender = false;

// 5 prób/min per IP+email
const resetPasswordLimiter = createInMemoryRateLimiter({ windowMs: 60_000, max: 5 });

export const POST: APIRoute = withProblemHandling(async ({ request, locals }) => {
  // Walidacja body
  const { email } = await validateAuthBody(request, ResetPasswordRequestSchema);

  // Rate limit
  const key = makeKeyIpEmail(request.headers, email);
  if (!resetPasswordLimiter.check(key)) {
    throw authErrors.creators.RateLimited({ detail: "Zbyt wiele prób. Spróbuj za chwilę." });
  }

  // Supabase SSR instance (już utworzona przez middleware)
  const supabase = locals.supabase;

  // BASE_URL dla emailRedirectTo (callback handler)
  const baseUrl = getBaseUrl(request);
  const emailRedirectTo = `${baseUrl}/auth/callback?type=recovery`;

  // Wysłanie linku resetującego przez Supabase Auth
  // Supabase zawsze zwraca sukces (nawet jeśli email nie istnieje) - bezpieczeństwo przez brak enumeracji
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: emailRedirectTo,
  });

  // Obsługa błędów Supabase Auth
  if (error) {
    throw fromSupabaseAuth(error);
  }

  // Zawsze zwracamy neutralny komunikat sukcesu (bez enumeracji kont)
  // Zgodnie z US-003 i best practices bezpieczeństwa
  return successResponse(
    {
      message: "Jeśli adres istnieje w systemie, wysłaliśmy wiadomość z linkiem resetującym hasło.",
    },
    { status: 200 }
  );
});
