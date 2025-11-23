/**
 * src/pages/api/auth/register.ts
 *
 * Endpoint POST /api/auth/register
 *
 * Rejestracja użytkownika przez Supabase Auth
 * Zgodne z auth-spec-codex.md i US-001
 *
 * Request: { email: string, password: string }
 * Response:
 *   - 201 { user_id: string, message: string } - jeśli automatyczne logowanie (brak wymaganego potwierdzenia email)
 *   - 200 { message: string } - jeśli wymagane potwierdzenie email
 * Errors: 400 auth/validation-failed, 409 auth/user-exists, 500 system/unexpected
 */

import type { APIRoute } from "astro";
import { withProblemHandling, systemErrors } from "@/lib/errors/http";
import { fromSupabaseAuth } from "@/lib/errors/map-supabase-auth";
import { successResponse, createdResponse } from "@/lib/http/http.responses";
import { authErrors } from "@/services/auth/auth.errors";
import { validateAuthBody } from "@/lib/http/http.validate-body";
import { RegisterCredentialsSchema } from "@/services/auth/auth.schema";
import { getBaseUrl } from "@/lib/http/http.base-url";
import { createInMemoryRateLimiter, makeKeyIpEmail } from "@/lib/http/http.rate-limit";
import { isFeatureEnabled } from "@/features";

export const prerender = false;

// 5 prób/min per IP+email
const registerLimiter = createInMemoryRateLimiter({ windowMs: 60_000, max: 5 });

export const POST: APIRoute = withProblemHandling(async ({ request, locals }) => {
  if (!isFeatureEnabled("auth")) {
    throw systemErrors.creators.FeatureDisabled({
      detail: "Auth feature is disabled in this environment",
      meta: { feature: "auth" },
    });
  }

  // Walidacja body
  const { email, password } = await validateAuthBody(request, RegisterCredentialsSchema);

  // Rate limit
  const key = makeKeyIpEmail(request.headers, email);
  if (!registerLimiter.check(key)) {
    throw authErrors.creators.RateLimited({ detail: "Zbyt wiele prób. Spróbuj za chwilę." });
  }

  // Supabase SSR instance (już utworzona przez middleware)
  const supabase = locals.supabase;

  // BASE_URL dla emailRedirectTo (callback handler)
  const baseUrl = getBaseUrl(request);
  const emailRedirectTo = `${baseUrl}/auth/callback?type=signup`;

  // Rejestracja przez Supabase Auth
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo,
    },
  });

  // Obsługa błędów Supabase Auth
  if (error) {
    throw fromSupabaseAuth(error);
  }

  // Sprawdź czy użytkownik został utworzony
  if (!data.user) {
    throw authErrors.creators.ProviderError({
      detail: "Nie udało się utworzyć konta. Spróbuj ponownie.",
      cause: new Error("User is null after signUp"),
    });
  }

  // Sprawdź czy sesja jest dostępna (automatyczne logowanie)
  // Jeśli Supabase wymaga potwierdzenia email, data.session będzie null
  const hasSession = data.session !== null && data.session !== undefined;

  if (hasSession) {
    // Automatyczne logowanie - cookies są automatycznie ustawione przez Supabase SSR (setAll)
    // Zwracamy 201 Created zgodnie ze specyfikacją
    return createdResponse(
      {
        user_id: data.user.id,
        message: "Rejestracja udana. Zostałeś automatycznie zalogowany.",
      },
      undefined,
      { status: 201 }
    );
  } else {
    // Wymagane potwierdzenie email - zwracamy 200 z komunikatem
    return successResponse(
      {
        message: "Wysłaliśmy link aktywacyjny na Twój adres e-mail.",
      },
      { status: 200 }
    );
  }
});
