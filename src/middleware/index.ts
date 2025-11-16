/**
 * src/middleware/index.ts
 *
 * Middleware Astro dla autentykacji i korelacji X-Request-ID w SSR
 *
 * Funkcjonalności:
 * - Tworzy SSR instance Supabase z cookies
 * - Pobiera sesję/użytkownika i zapisuje do locals
 * - Chroni zasoby (redirect dla SSR, 401 dla API)
 * - Przekierowuje zalogowanych z /auth/login i /auth/register do /generate
 * - Dodaje X-Request-ID do wszystkich odpowiedzi
 */

import { defineMiddleware } from "astro:middleware";
import { requestId } from "@/lib/errors/http";
import { createSupabaseServerInstance } from "../db/supabase.client";
import { authErrors } from "@/services/auth/auth.errors";
import { jsonProblem, toProblem } from "@/lib/errors/http";

// Publiczne ścieżki - dostępne bez autentykacji
const PUBLIC_PATHS = [
  // Strony auth (SSR)
  "/auth/login",
  "/auth/register",
  "/auth/reset-password",
  "/auth/new-password",
  "/auth/callback",
  "/auth/verify-email",
  // Endpointy auth API
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/reset-password",
  "/api/auth/update-password",
  "/api/auth/verify-otp",
  "/api/auth/resend-verification",
];

// Statyczne zasoby (favicon, assets)
const isStaticAsset = (pathname: string): boolean => {
  return (
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/assets/") ||
    pathname.startsWith("/_astro/") ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff|woff2|ttf|eot)$/i)
  );
};

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, request, cookies, redirect, locals } = context;
  const pathname = url.pathname;

  // Generuj lub odczytaj X-Request-ID
  const reqId = requestId(request.headers);

  // Pomiń autentykację dla statycznych zasobów
  if (isStaticAsset(pathname)) {
    const response = await next();
    response.headers.set("x-request-id", reqId);
    return response;
  }

  // Utwórz SSR instance Supabase
  const supabase = createSupabaseServerInstance({
    headers: request.headers,
    cookies,
  });

  // Zapisz do locals (używane w endpointach i stronach)
  locals.supabase = supabase;

  // Pobierz sesję/użytkownika
  const {
    data: { user, session },
  } = await supabase.auth.getUser();

  // Zapisz do locals
  if (user) {
    locals.user = {
      id: user.id,
      email: user.email ?? undefined,
    };
    locals.session = session
      ? {
          access_token: session.access_token,
          expires_at: session.expires_at ?? undefined,
        }
      : null;
  } else {
    locals.user = null;
    locals.session = null;
  }

  // Jeśli zalogowany i wchodzi na /auth/login lub /auth/register → redirect do /generate
  if (user && (pathname === "/auth/login" || pathname === "/auth/register")) {
    return redirect("/generate", 302);
  }

  // Sprawdź czy ścieżka jest publiczna
  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  // Jeśli nie jest publiczna i brak sesji → wymagana autentykacja
  if (!isPublicPath && !user) {
    // Dla API zwracamy 401 problem+json (RFC 7807)
    if (pathname.startsWith("/api/")) {
      const error = authErrors.creators.Unauthorized({
        detail: "Wymagana autoryzacja",
      });
      const problem = toProblem(error, pathname);
      const response = jsonProblem(problem, {
        status: 401,
        headers: { "x-request-id": reqId },
      });
      return response;
    }

    // Dla stron SSR → redirect do logowania z redirectTo
    const redirectTo = encodeURIComponent(pathname);
    return redirect(`/auth/login?redirectTo=${redirectTo}`, 302);
  }

  // Wykonaj middleware chain
  const response = await next();

  // Dodaj X-Request-ID do response headers
  response.headers.set("x-request-id", reqId);

  return response;
});
