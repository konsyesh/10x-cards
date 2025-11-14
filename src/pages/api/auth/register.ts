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
import { z } from "zod";
import { withProblemHandling } from "@/lib/errors/http";
import { fromZodAuth } from "@/lib/errors/map-zod";
import { fromSupabaseAuth } from "@/lib/errors/map-supabase-auth";
import { successResponse, createdResponse } from "@/lib/http/http.responses";
import { authErrors } from "@/services/auth/auth.errors";
import { validateAuthBody } from "@/lib/http/http.validate-body";
import { RegisterCredentialsSchema } from "@/services/auth/auth.schema";

export const prerender = false;

/**
 * Pobiera PUBLIC_SITE_URL dla emailRedirectTo
 * Priorytet: zmienna środowiskowa PUBLIC_SITE_URL, fallback: origin z request URL
 */
function getBaseUrl(request: Request): string {
  const envUrl = process.env.PUBLIC_SITE_URL ?? import.meta.env.PUBLIC_SITE_URL ?? "";

  if (typeof envUrl === "string" && envUrl.length > 0) {
    // return envUrl.replace(/\/$/, "");
    return envUrl;
  }
  return new URL(request.url).origin;
}

export const POST: APIRoute = withProblemHandling(async ({ request, locals }) => {
  // Walidacja body
  const { email, password } = await validateAuthBody(request, RegisterCredentialsSchema);

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
