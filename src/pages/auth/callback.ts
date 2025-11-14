import type { APIRoute } from "astro";

export const prerender = false;

/**
 * Handler dla linków e-mail z Supabase Auth
 * Obsługuje: signup confirmation, password recovery, magic link
 *
 * Query params:
 * - code: kod weryfikacyjny z Supabase
 * - type: signup|recovery|magiclink
 *
 * Przepływ:
 * 1. Wymiana code na sesję przez Supabase
 * 2. Ustawienie cookies (obsługiwane przez Supabase SSR)
 * 3. Redirect:
 *    - type=recovery → /auth/new-password
 *    - pozostałe → /generate
 */
export const GET: APIRoute = async ({ url, locals }) => {
  const code = url.searchParams.get("code");
  const type = url.searchParams.get("type") || "signup";

  // TODO: Implementacja wymiany code na sesję przez Supabase SSR
  // const supabase = createSupabaseServerInstance({ headers: request.headers, cookies });

  const { error } = await locals.supabase.auth.exchangeCodeForSession(code);
  if (error) {
    // Błąd wymiany code na sesję → traktuj jako link nieprawidłowy/wygasły.
    return new Response(null, {
      status: 302,
      headers: { Location: "/auth/verify-email?reason=invalid_or_expired" },
    });
  }

  // if (!code) {
  //   // Brak code → traktuj jako link nieprawidłowy/wygasły. Nie korzystamy z hash tokenów.
  //   return new Response(null, {
  //     status: 302,
  //     headers: { Location: "/auth/verify-email?reason=invalid_or_expired" },
  //   });
  // }
  // Redirect w zależności od typu
  const redirectUrl = type === "recovery" ? "/auth/new-password" : "/generate";

  return new Response(null, {
    status: 302,
    headers: {
      Location: redirectUrl,
    },
  });
};
