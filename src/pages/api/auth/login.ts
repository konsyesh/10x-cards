/**
 * src/pages/api/auth/login.ts
 *
 * Endpoint POST /api/auth/login
 * 
 * Logowanie użytkownika przez Supabase Auth
 * Zgodne z auth-spec-codex.md i US-002
 * 
 * Request: { email: string, password: string }
 * Response: 200 { user_id: string, email: string }
 * Errors: 401 auth/invalid-credentials, 403 auth/email-not-confirmed, 429 auth/rate-limited
 */

import type { APIRoute } from "astro";
import { z } from "zod";
import { withProblemHandling } from "@/lib/errors/http";
import { fromZodAuth } from "@/lib/errors/map-zod";
import { fromSupabaseAuth } from "@/lib/errors/map-supabase-auth";
import { successResponse } from "@/lib/http/http.responses";

export const prerender = false;

/**
 * Schema walidacji - identyczny jak w LoginForm.tsx
 */
const loginSchema = z.object({
  email: z.string().email("Podaj poprawny e-mail").min(1, "E-mail jest wymagany"),
  password: z.string().min(1, "Hasło jest wymagane"),
});

type LoginRequest = z.infer<typeof loginSchema>;

/**
 * Waliduj JSON body względem Zod schema
 * Rzuca auth/validation-failed w przypadku błędu
 */
async function validateLoginBody(request: Request): Promise<LoginRequest> {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    // JSON parse error → rzuć jako validation error
    throw fromZodAuth({
      issues: [
        {
          code: "custom",
          message: "Invalid JSON",
          path: [],
        },
      ],
      addIssue: () => {},
      flatten: () => ({
        formErrors: ["Invalid JSON"],
        fieldErrors: {},
      }),
    } as any);
  }

  const result = loginSchema.safeParse(payload);

  if (!result.success) {
    throw fromZodAuth(result.error);
  }

  return result.data;
}

export const POST: APIRoute = withProblemHandling(async ({ request, locals }) => {
  // Walidacja body
  const { email, password } = await validateLoginBody(request);

  // Supabase SSR instance (już utworzona przez middleware)
  const supabase = locals.supabase;

  // Logowanie przez Supabase Auth
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  // Obsługa błędów Supabase Auth
  if (error) {
    throw fromSupabaseAuth(error);
  }

  // Sukces - cookies są automatycznie ustawione przez Supabase SSR (setAll)
  // Zwracamy dane użytkownika zgodnie ze specyfikacją
  return successResponse(
    {
      user_id: data.user.id,
      email: data.user.email ?? "",
    },
    { status: 200 }
  );
});

