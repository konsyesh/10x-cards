import type { APIRoute } from "astro";
import { z } from "zod";
import { withProblemHandling } from "@/lib/errors/http";
import { fromZodAuth } from "@/lib/errors/map-zod";
import { successResponse } from "@/lib/http/http.responses";

import { EmailSchema } from "@/services/auth/auth.schema";

export const prerender = false;

const schema = z.object({
  email: EmailSchema,
});

type Body = z.infer<typeof schema>;

function getBaseUrl(request: Request): string {
  const envUrl = process.env.PUBLIC_SITE_URL ?? import.meta.env.PUBLIC_SITE_URL ?? "";

  if (typeof envUrl === "string" && envUrl.length > 0) {
    return envUrl.replace(/\/$/, "");
  }
  return new URL(request.url).origin;
}

async function validateBody(request: Request): Promise<Body> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    throw fromZodAuth({
      issues: [{ code: "custom", message: "Invalid JSON", path: [] }],
      addIssue: () => {},
      flatten: () => ({ formErrors: ["Invalid JSON"], fieldErrors: {} }),
    } as unknown as ZodError);
  }
  const result = schema.safeParse(payload);
  if (!result.success) throw fromZodAuth(result.error);
  return result.data;
}

export const POST: APIRoute = withProblemHandling(async ({ request, locals }) => {
  const { email } = await validateBody(request);
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
