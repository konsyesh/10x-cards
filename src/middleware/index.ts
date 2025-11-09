/**
 * src/middleware/index.ts
 *
 * Middleware Astro dla korelacji X-Request-ID w SSR
 */

import { defineMiddleware } from "astro:middleware";
import { requestId } from "@/lib/errors/http";
import { supabaseClient } from "../db/supabase.client";

export const onRequest = defineMiddleware((context, next) => {
  // Dodaj Supabase client do context
  context.locals.supabase = supabaseClient;

  // Generuj lub odczytaj X-Request-ID
  const reqId = requestId(context.request.headers);

  // Wykonaj middleware chain
  const response = next();

  // Dodaj X-Request-ID do response headers
  response.then((res) => {
    res.headers.set("x-request-id", reqId);
  });

  return response;
});
