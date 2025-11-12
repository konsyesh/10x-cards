---
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
export const GET: APIRoute = async ({ request, url, cookies }) => {
  const code = url.searchParams.get("code");
  const type = url.searchParams.get("type") || "signup";

  if (!code) {
    // Brak kodu - redirect do logowania z błędem
    return new Response(null, {
      status: 302,
      headers: {
        Location: "/auth/login?error=invalid_code",
      },
    });
  }

  // TODO: Implementacja wymiany code na sesję przez Supabase SSR
  // const supabase = createSupabaseServerInstance({ headers: request.headers, cookies });
  // const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  // 
  // if (error) {
  //   return new Response(null, {
  //     status: 302,
  //     headers: {
  //       Location: "/auth/login?error=session_exchange_failed",
  //     },
  //   });
  // }

  // Tymczasowo - redirect bez wymiany sesji (backend będzie to obsługiwał)
  // Po implementacji backendu, tutaj będzie wymiana code → session

  // Redirect w zależności od typu
  const redirectUrl = type === "recovery" ? "/auth/new-password" : "/generate";

  return new Response(null, {
    status: 302,
    headers: {
      Location: redirectUrl,
    },
  });
};

