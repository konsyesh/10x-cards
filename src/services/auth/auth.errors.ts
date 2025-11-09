/**
 * src/services/auth/auth.errors.ts
 *
 * Domainowe błędy dla domeny auth
 */

import { defineDomain } from "@/lib/errors/registry";

export const authErrors = defineDomain("auth", {
  Unauthorized: {
    code: "auth/unauthorized",
    status: 401,
    title: "errors.auth.unauthorized",
  },
  Forbidden: {
    code: "auth/forbidden",
    status: 403,
    title: "errors.auth.forbidden",
  },
  InvalidCredentials: {
    code: "auth/invalid-credentials",
    status: 401,
    title: "errors.auth.invalid_credentials",
  },
});


