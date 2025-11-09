/**
 * src/lib/errors/http.ts
 *
 * HTTP middleware wrapper dla problem+json (RFC 7807)
 * Dodaje X-Request-ID, integruje Sentry (PROD-only), serializuje DomainError
 */

import type { APIRoute } from "astro";
import { randomUUID } from "node:crypto";
import { isDomainError, type DomainError, type ProblemDetails } from "./index";
import { defineDomain } from "./registry";

// Lazy-load Sentry tylko jeśli jest dostępny i włączony na PROD
let sentry: any = null;
const SENTRY_ENABLED =
  typeof import.meta !== "undefined" &&
  (import.meta as any).env?.SENTRY_ENABLED === "true";

// Inicjalizacja Sentry (opóźniona, tylko w runtime)
if (SENTRY_ENABLED) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    sentry = require("@sentry/node");
    sentry.init({
      dsn:
        typeof import.meta !== "undefined" ? (import.meta as any).env?.SENTRY_DSN : undefined,
      environment:
        typeof import.meta !== "undefined" ? (import.meta as any).env?.SENTRY_ENV : "production",
    });
  } catch {
    // Brak @sentry/node - kontynuuj bez Sentry
  }
}

// System errors (fallback dla nieoczekiwanych błędów)
const SystemErrors = defineDomain("system", {
  Unexpected: {
    code: "system/unexpected",
    status: 500,
    title: "errors.system.unexpected",
  },
});

/**
 * Konwersja DomainError na RFC 7807 ProblemDetails
 */
export function toProblem(e: DomainError, instance?: string): ProblemDetails {
  const [domain] = e.code.split("/");
  // Szukamy domeny w definicjach - dla teraz używamy fallback
  const base =
    typeof import.meta !== "undefined" && (import.meta as any).env
      ? (import.meta as any).env.PROBLEM_URI_TYPE
      : "https://docs.app.dev/problems";

  return {
    type: `${base}/${domain}/${e.code.split("/")[1]}`,
    title: e.title,
    status: e.status,
    detail: e.message,
    instance,
    code: e.code,
    meta: e.meta,
  };
}

/**
 * Serializuj ProblemDetails do Response z nagłówkami problem+json
 */
export function jsonProblem(problem: ProblemDetails, init?: ResponseInit): Response {
  return new Response(JSON.stringify(problem), {
    ...init,
    headers: {
      "content-type": "application/problem+json",
      ...(init?.headers ?? {}),
    },
  });
}

/**
 * Generuj X-Request-ID (z nagłówka lub nowy UUID)
 */
export function requestId(headers: Headers): string {
  return headers.get("x-request-id") ?? randomUUID();
}

/**
 * Główny wrapper dla endpointów API
 * Obsługuje:
 * - Konwersja DomainError → problem+json
 * - Dodanie X-Request-ID
 * - Sentry (PROD-only)
 * - Fallback na system/unexpected
 */
export function withProblemHandling(handler: APIRoute): APIRoute {
  return async (ctx) => {
    const reqId = requestId(ctx.request.headers);

    try {
      const res = await handler(ctx);
      res.headers.set("x-request-id", reqId);
      return res;
    } catch (error: any) {
      // Mapowanie na DomainError (jeśli już to nie jest)
      const domainErr: DomainError = isDomainError(error)
        ? error
        : SystemErrors.creators.Unexpected({
            detail: error?.message ?? "Unknown error",
            cause: error,
          });

      // Wysłanie do Sentry (PROD-only)
      if (SENTRY_ENABLED && sentry?.captureException) {
        sentry.captureException(error, {
          tags: { request_id: reqId, code: domainErr.code },
          extra: { meta: domainErr.meta },
        });
      }

      // Konwersja na problem+json
      const problem = toProblem(domainErr, new URL(ctx.url).pathname);
      return jsonProblem(problem, {
        status: problem.status,
        headers: { "x-request-id": reqId },
      });
    }
  };
}

