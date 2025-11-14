import type { APIRoute } from "astro";
import { z } from "zod";
import { withProblemHandling } from "@/lib/errors/http";
import { successResponse } from "@/lib/http/http.responses";

import { EmailSchema } from "@/services/auth/auth.schema";
import { getBaseUrl } from "@/lib/http/http.base-url";
import { validateAuthBody } from "@/lib/http/http.validate-body";
import { createInMemoryRateLimiter, makeKeyIpEmail } from "@/lib/http/http.rate-limit";
import { authErrors } from "@/services/auth/auth.errors";

export const prerender = false;

const schema = z.object({
  email: EmailSchema,
});

// 5 prób/min per IP+email
const resendLimiter = createInMemoryRateLimiter({ windowMs: 60_000, max: 5 });

export const POST: APIRoute = withProblemHandling(async ({ request, locals }) => {
  const { email } = await validateAuthBody(request, schema);
  const supabase = locals.supabase;

  // Rate limit
  const key = makeKeyIpEmail(request.headers, email);
  if (!resendLimiter.check(key)) {
    throw authErrors.creators.RateLimited({ detail: "Zbyt wiele prób. Spróbuj ponownie za chwilę." });
  }

  const baseUrl = getBaseUrl(request);
  const emailRedirectTo = `${baseUrl}/auth/callback?type=signup`;

  // Wysyłamy ponownie link aktywacyjny. Celowo nie rozróżniamy odpowiedzi,
  // żeby nie ujawniać istnienia konta dla podanego e‑maila.
  await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo },
  });

  return successResponse({ message: "Jeśli konto istnieje, wysłaliśmy ponownie link aktywacyjny." }, { status: 200 });
});
