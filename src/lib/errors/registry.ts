/**
 * src/lib/errors/registry.ts
 *
 * Rejestr i fabryka błędów domenowych.
 * Udostępnia funkcję defineDomain() do definiowania błędów dla każdej domeny.
 */

import type { DomainError, Domain, ProblemDetails } from "./index";
import { createDomainError } from "./index";

interface Definition {
  code: string; // np. "flashcard/not-found"
  status: number; // HTTP status
  title: string; // klucz i18n (np. "errors.flashcard.not_found")
}

/**
 * Fabryka błędów dla danej domeny
 * Zwraca obiekty: creators (fabryki), toProblem (mapowanie na RFC 7807)
 */
export function defineDomain<D extends string, K extends string>(domain: D, defs: Record<K, Definition>) {
  // Tworzenie fabryk dla każdego błędu w definicji
  const creators = Object.fromEntries(
    Object.entries(defs).map(([k, def]) => [
      k,
      (opts?: { detail?: string; meta?: Record<string, unknown>; cause?: unknown }): DomainError =>
        createDomainError({
          domain: domain as Domain,
          code: def.code,
          status: def.status,
          title: def.title,
          message: opts?.detail,
          meta: opts?.meta,
          cause: opts?.cause,
        }),
    ])
  ) as Record<
    keyof typeof defs,
    (opts?: { detail?: string; meta?: Record<string, unknown>; cause?: unknown }) => DomainError
  >;

  // Mapowanie DomainError na RFC 7807 ProblemDetails
  const toProblem = (e: DomainError, instance?: string): ProblemDetails => {
    const [d, c] = e.code.split("/");
    const base =
      typeof import.meta !== "undefined" && (import.meta as any).env
        ? (import.meta as any).env.PROBLEM_URI_TYPE
        : "https://docs.app.dev/problems";
    return {
      type: `${base}/${d}/${c}`,
      title: e.title,
      status: e.status,
      detail: e.message,
      instance,
      code: e.code,
      meta: e.meta,
    };
  };

  return { creators, toProblem };
}
