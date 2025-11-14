import { createClient } from "@supabase/supabase-js";
import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";
import type { AstroCookies } from "astro";

import type { Database } from "./database.types";

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;
const isProd = import.meta.env.PROD;

/**
 * Klient Supabase dla użycia po stronie klienta (browser)
 * Używany w komponentach React działających w przeglądarce
 */
export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);

export type SupabaseClient = typeof supabaseClient;

export const DEFAULT_USER_ID = "80df6047-cf39-43ee-bfc6-115756744825";

/**
 * Opcje cookies dla Supabase SSR
 * Zgodne z best practices: httpOnly, secure, sameSite=lax
 */
export const cookieOptions: CookieOptionsWithName = {
  path: "/",
  secure: isProd,
  httpOnly: true,
  sameSite: "lax",
};

/**
 * Parsuje nagłówek Cookie na tablicę { name, value }
 * Wymagane przez @supabase/ssr dla getAll()
 */
function parseCookieHeader(cookieHeader: string): { name: string; value: string }[] {
  if (!cookieHeader) return [];
  return cookieHeader.split(";").map((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    return { name, value: rest.join("=") };
  });
}

/**
 * Tworzy instancję Supabase SSR dla użycia w Astro middleware i API routes
 *
 * Używa @supabase/ssr z metodami getAll/setAll zgodnie z best practices
 * Automatycznie obsługuje cookies (access_token, refresh_token) przez setAll
 *
 * @param context - Kontekst Astro z headers i cookies
 * @returns SupabaseClient<Database> skonfigurowany dla SSR
 *
 * @example
 * ```ts
 * const supabase = createSupabaseServerInstance({
 *   headers: request.headers,
 *   cookies: context.cookies
 * });
 * const { data: { user } } = await supabase.auth.getUser();
 * ```
 */
export function createSupabaseServerInstance(context: { headers: Headers; cookies: AstroCookies }) {
  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookieOptions,
    cookies: {
      getAll() {
        return parseCookieHeader(context.headers.get("Cookie") ?? "");
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => context.cookies.set(name, value, options));
      },
    },
  });

  return supabase;
}
