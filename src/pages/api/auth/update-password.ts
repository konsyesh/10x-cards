/**
 * src/pages/api/auth/update-password.ts
 *
 * Endpoint POST /api/auth/update-password
 *
 * Aktualizacja hasła użytkownika przez Supabase Auth
 * Wymaga aktywnej sesji recovery (ustawionej przez /auth/callback?type=recovery)
 * Zgodne z auth-spec-codex.md i US-003
 *
 * Request: { password: string, confirmPassword: string }
 * Response: 200 { message: string }
 * Errors: 400 auth/validation-failed, 401 auth/unauthorized, 410 auth/token-expired, 500 system/unexpected
 */

import type { APIRoute } from "astro";
import { withProblemHandling, systemErrors } from "@/lib/errors/http";
import { fromSupabaseAuth } from "@/lib/errors/map-supabase-auth";
import { successResponse } from "@/lib/http/http.responses";
import { authErrors } from "@/services/auth/auth.errors";
import { validateAuthBody } from "@/lib/http/http.validate-body";
import { UpdatePasswordSchema } from "@/services/auth/auth.schema";
import { isFeatureEnabled } from "@/features";

export const prerender = false;

export const POST: APIRoute = withProblemHandling(async ({ request, locals }) => {
  if (!isFeatureEnabled("auth")) {
    throw systemErrors.creators.FeatureDisabled({
      detail: "Auth feature is disabled in this environment",
      meta: { feature: "auth" },
    });
  }

  // Sprawdź czy użytkownik ma aktywną sesję (wymagana sesja recovery z callback)
  if (!locals.user) {
    throw authErrors.creators.Unauthorized({
      detail: "Wymagana sesja do zmiany hasła. Kliknij w link z e-maila.",
    });
  }

  // Walidacja body (password + confirmPassword)
  const { password } = await validateAuthBody(request, UpdatePasswordSchema);

  // Supabase SSR instance (już utworzona przez middleware)
  const supabase = locals.supabase;

  // Aktualizacja hasła przez Supabase Auth
  // Po sukcesie sesja recovery staje się normalną sesją (użytkownik jest zalogowany)
  const { error } = await supabase.auth.updateUser({
    password,
  });

  // Obsługa błędów Supabase Auth
  if (error) {
    // Sprawdź czy to błąd wygasłego tokenu/sesji
    const errorMessage = error.message?.toLowerCase() || "";
    const errorCode = error.code || "";

    if (
      errorMessage.includes("expired") ||
      errorMessage.includes("wygasł") ||
      errorCode === "token_expired" ||
      errorCode === "session_expired"
    ) {
      throw authErrors.creators.TokenExpired({
        detail: "Link wygasł lub jest nieprawidłowy. Poproś o nowy link resetujący hasło.",
        cause: error,
      });
    }

    // Fallback - użyj standardowego mapowania
    throw fromSupabaseAuth(error);
  }

  // Sukces - hasło zostało zaktualizowane
  // Sesja recovery została przekształcona w normalną sesję (użytkownik jest zalogowany)
  // Frontend przekieruje do /auth/login zgodnie z UpdatePasswordForm.tsx
  return successResponse(
    {
      message: "Hasło zostało zaktualizowane. Możesz się teraz zalogować.",
    },
    { status: 200 }
  );
});
