/**
 * src/pages/api/auth/logout.ts
 *
 * Endpoint POST /api/auth/logout
 *
 * Wylogowanie użytkownika przez Supabase Auth
 * Zgodne z auth-spec-codex.md i US-004
 *
 * Response: 204 No Content
 * Cookies są automatycznie czyszczone przez Supabase SSR (setAll)
 */

import type { APIRoute } from "astro";
import { withProblemHandling } from "@/lib/errors/http";
import { noContentResponse } from "@/lib/http/http.responses";
import { fromSupabaseAuth } from "@/lib/errors/map-supabase-auth";

export const prerender = false;

export const POST: APIRoute = withProblemHandling(async ({ locals }) => {
  // Supabase SSR instance (już utworzona przez middleware)
  const supabase = locals.supabase;

  // Wylogowanie przez Supabase Auth
  const { error } = await supabase.auth.signOut();

  // Obsługa błędów Supabase Auth
  if (error) {
    throw fromSupabaseAuth(error);
  }

  // Sukces - cookies są automatycznie czyszczone przez Supabase SSR (setAll)
  // Zwracamy 204 No Content zgodnie ze specyfikacją
  return noContentResponse();
});

