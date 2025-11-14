import type { APIRoute } from "astro";
import { z } from "zod";
import { withProblemHandling } from "@/lib/errors/http";
import { successResponse } from "@/lib/http/http.responses";

import { EmailSchema } from "@/services/auth/auth.schema";
import { getBaseUrl } from "@/lib/http/http.base-url";
import { validateAuthBody } from "@/lib/http/http.validate-body";

export const prerender = false;

const schema = z.object({
  email: EmailSchema,
});

export const POST: APIRoute = withProblemHandling(async ({ request, locals }) => {
  const { email } = await validateAuthBody(request, schema);
  const supabase = locals.supabase;

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
