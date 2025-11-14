/**
 * src/pages/api/auth/verify-otp.ts
 *
 * Endpoint POST /api/auth/verify-otp
 *
 * Weryfikacja kodu OTP dla potwierdzenia e-mail (signup) lub resetu hasła (recovery)
 * Zgodne z auth-spec-codex.md i możliwościami Supabase Auth
 *
 * Request: { email: string, token: string, type: "signup" | "recovery" }
 * Response: 200 { user_id: string, message: string }
 * Errors: 400 auth/validation-failed, 401 auth/invalid-credentials, 410 auth/token-expired
 */

import type { APIRoute } from "astro";
import { z } from "zod";
import { withProblemHandling } from "@/lib/errors/http";
import { fromZodAuth } from "@/lib/errors/map-zod";
import { fromSupabaseAuth } from "@/lib/errors/map-supabase-auth";
import { successResponse } from "@/lib/http/http.responses";
import { authErrors } from "@/services/auth/auth.errors";

export const prerender = false;

/**
 * Schema walidacji dla weryfikacji OTP
 */
const verifyOtpSchema = z.object({
  email: z.string().email("Podaj poprawny e-mail").min(1, "E-mail jest wymagany"),
  token: z
    .string()
    .min(6, "Kod musi mieć 6 cyfr")
    .max(6, "Kod musi mieć 6 cyfr")
    .regex(/^\d+$/, "Kod musi składać się tylko z cyfr"),
  type: z.enum(["signup", "recovery"], {
    errorMap: () => ({ message: "Typ musi być 'signup' lub 'recovery'" }),
  }),
});

type VerifyOtpRequest = z.infer<typeof verifyOtpSchema>;

/**
 * Waliduj JSON body względem Zod schema
 * Rzuca auth/validation-failed w przypadku błędu
 */
async function validateVerifyOtpBody(request: Request): Promise<VerifyOtpRequest> {
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

  const result = verifyOtpSchema.safeParse(payload);

  if (!result.success) {
    throw fromZodAuth(result.error);
  }

  return result.data;
}

export const POST: APIRoute = withProblemHandling(async ({ request, locals }) => {
  // Walidacja body
  const { email, token, type } = await validateVerifyOtpBody(request);

  // Supabase SSR instance (już utworzona przez middleware)
  const supabase = locals.supabase;

  // Weryfikacja OTP przez Supabase Auth
  // Dla signup używamy "email", dla recovery "recovery"
  const otpType = type === "signup" ? "email" : "recovery";

  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: otpType as "email" | "recovery",
  });

  // Obsługa błędów Supabase Auth
  if (error) {
    // Sprawdź czy to błąd wygasłego tokenu
    const errorMessage = error.message?.toLowerCase() || "";
    const errorCode = error.code || "";

    if (errorMessage.includes("expired") || errorMessage.includes("wygasł") || errorCode === "token_expired") {
      throw authErrors.creators.TokenExpired({
        detail: "Kod weryfikacyjny wygasł. Zarejestruj się ponownie.",
        cause: error,
      });
    }

    // Dla nieprawidłowego kodu
    if (errorMessage.includes("invalid") || errorMessage.includes("nieprawidłowy") || errorCode === "invalid_token") {
      throw authErrors.creators.InvalidCredentials({
        detail: "Nieprawidłowy kod weryfikacyjny. Sprawdź poprawność wprowadzonego kodu.",
        cause: error,
      });
    }

    // Fallback - użyj standardowego mapowania
    throw fromSupabaseAuth(error);
  }

  // Sukces - cookies są automatycznie ustawione przez Supabase SSR (setAll)
  // Zwracamy dane użytkownika
  return successResponse(
    {
      user_id: data.user.id,
      message:
        type === "signup"
          ? "E-mail został zweryfikowany. Zostałeś automatycznie zalogowany."
          : "Hasło zostało zresetowane. Zostałeś automatycznie zalogowany.",
    },
    { status: 200 }
  );
});
