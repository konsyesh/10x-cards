# Error Handling Architecture – Plan wdrożenia (RFC 7807)

Kompletny, praktyczny plan implementacji architektury obsługi błędów dla Astro 5 + React 19 + TypeScript + Zod 3.25 + Supabase + Vercel AI SDK 5.
Zgodny z wymaganiami:

- Standard odpowiedzi: `application/problem+json` (RFC 7807): `type`, `title`, `status`, `detail`, `instance`, rozszerzenia: `code`, `meta`.
- Domeny/kody: `cards/not-found`, `ai/model-unavailable`, `auth/unauthorized`.
- Dynamiczne URI typu problemu: bazowy prefix z `.env` → `PROBLEM_URI_TYPE`.
- `meta` może zawierać pełne `ZodError.flatten()` (bez PII).
- 422 tylko dla polityk treści AI (walidacja → 400).
- `withProblemHandling` dodaje `X-Request-ID`, integruje Sentry na PROD (flaga env).
- Klient `fetchJson` rozpoznaje `problem+json`, rzuca `ApiError`, domyślnie `credentials: "include"` (cookies httpOnly).
- `instance` zawiera wyłącznie ścieżkę (bez query string).
- Nigdy nie serializujemy `cause` do JSON.
- `title` to klucz i18n (tłumaczenia po stronie klienta).

## 1) Docelowa struktura folderów

```
src/
  lib/
    errors/
      index.ts            // typy: DomainError, ProblemDetails, pomocnicze
      registry.ts         // defineDomain(): rejestr i fabryki błędów
      map-zod.ts          // Zod -> DomainError (np. cards/validation-failed)
      map-supabase.ts     // Supabase -> DomainError (np. cards/not-found)
      map-ai.ts           // AI SDK -> DomainError (np. ai/model-unavailable)
      http.ts             // toProblem(), jsonProblem(), withProblemHandling(), requestId(), Sentry hook
    http/
      http.responses.ts         // successResponse, createdResponse, noContentResponse
      http.validate-body.ts     // validateBody using Zod schemas (safeParse + flatten)
      http.fetcher.ts           // fetchJson(), ApiError (recognizes problem+json), credentials: include
  services/
    // Uwaga: poniższe katalogi domen (`cards`, `ai`, `auth`) są PRZYKŁADAMI –
    // potraktuj je jako wzorce organizacji plików i dostosuj nazwy/domeny
    // do faktycznych serwisów w Twoim projekcie.
    cards/
      card.errors.ts        // definicje i fabryki błędów domeny "cards"
      card.service.ts       // card service logic (mapery Supabase, rzuca DomainError)
    ai/
      ai.errors.ts          // definicje i fabryki błędów domeny "ai"
      ai.service.ts         // ai service logic (mapery AI, 422 dla content policy)
    auth/
      auth.errors.ts        // definicje i fabryki błędów domeny "auth"
      auth.service.ts       // auth service logic (rzuca Unauthorized/Forbidden)
  pages/
    api/                    // endpointy Astro (APIRoute) owinięte withProblemHandling()
  middleware/
    index.ts                // (opcjonalnie) korelacja X-Request-ID dla SSR
  components/
    ErrorBoundary.tsx       // granica błędów dla wysp React
    ui/                     // shadcn/ui (Toaster)
  types.ts                  // (opcjonalnie) współdzielone typy z frontendem
  db/                       // Supabase (cienkie wrapery)
```

## 2) Zmienne środowiskowe (.env)

Dodaj (i udokumentuj w README):

```
# Bazowy prefix do RFC 7807 "type" (nie musi wskazywać realnej strony)
PROBLEM_URI_TYPE=https://docs.app.dev/problems

# Sentry (opcjonalnie, PROD-only)
SENTRY_ENABLED=false
SENTRY_DSN=
SENTRY_ENV=production
```

Uwaga: w kodzie serwerowym (Astro endpoints) używamy `import.meta.env.PROBLEM_URI_TYPE`.

## 3) Rdzeń typów i rejestr błędów

Założenia:

- `title` to klucz i18n (np. `errors.cards.not_found`).
- `meta` dla Zod zawiera pełne `error.flatten()`.
- `cause` nie jest serializowane (trzymane tylko dla logów).

```ts
// src/lib/errors/index.ts
export type Domain = "cards" | "ai" | "auth" | "system";

export type DomainError = {
  domain: Domain;
  code: string; // np. "cards/not-found"
  status: number; // HTTP status
  title: string; // klucz i18n (po stronie klienta)
  message?: string; // techniczny opis (logi/devtools)
  meta?: Record<string, unknown>; // dane do UI/logów (bez PII)
  cause?: unknown; // nie serializować
};

export type ProblemDetails = {
  type: string; // `${PROBLEM_URI_TYPE}/${domain}/${code}`
  title: string; // klucz i18n (klient tłumaczy)
  status: number;
  detail?: string;
  instance?: string; // ścieżka URL (bez query)
  code: string; // np. "cards/not-found"
  meta?: Record<string, unknown>; // np. zod.flatten()
};

export function isDomainError(e: unknown): e is DomainError {
  return !!e && typeof e === "object" && "code" in (e as any) && "status" in (e as any);
}
```

```ts
// src/lib/errors/registry.ts
import type { DomainError, ProblemDetails } from "./index";

type Definition = { code: string; status: number; title: string }; // title = klucz i18n

export function defineDomain<D extends string, K extends string>(domain: D, defs: Record<K, Definition>) {
  const creators = Object.fromEntries(
    Object.entries(defs).map(([k, def]) => [
      k,
      (opts?: { detail?: string; meta?: Record<string, unknown>; cause?: unknown }): DomainError => ({
        domain: domain as any,
        code: def.code,
        status: def.status,
        title: def.title, // klucz i18n, nie tłumacz na serwerze
        message: opts?.detail, // detail może być przyjaznym opisem dla usera (bez wrażliwych danych)
        meta: opts?.meta,
        cause: opts?.cause,
      }),
    ])
  ) as Record<
    keyof typeof defs,
    (opts?: { detail?: string; meta?: Record<string, unknown>; cause?: unknown }) => DomainError
  >;

  const toProblem = (e: DomainError, instance?: string): ProblemDetails => {
    const [d, c] = e.code.split("/");
    const base = (import.meta as any).env.PROBLEM_URI_TYPE ?? "https://docs.app.dev/problems";
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
```

## 4) Domeny i fabryki (wymagane kody)

Uwaga: Poniższe nazwy i ścieżki plików dla domen (`cards`, `ai`, `auth`) są PRZYKŁADAMI
– potraktuj je jako wzorce implementacji. W swoim projekcie użyj odpowiednich
nazw domen i plików odpowiadających Twoim serwisom.

```ts
// src/services/cards/card.errors.ts
import { defineDomain } from "@/lib/errors/registry";

export const CardErrors = defineDomain("cards", {
  NotFound: { code: "cards/not-found", status: 404, title: "errors.cards.not_found" },
  ValidationFailed: { code: "cards/validation-failed", status: 400, title: "errors.cards.validation_failed" },
  SaveFailed: { code: "cards/save-failed", status: 500, title: "errors.cards.save_failed" },
});
```

```ts
// src/services/ai/ai.errors.ts
import { defineDomain } from "@/lib/errors/registry";

export const AiErrors = defineDomain("ai", {
  ModelUnavailable: { code: "ai/model-unavailable", status: 503, title: "errors.ai.model_unavailable" },
  ProviderError: { code: "ai/provider-error", status: 502, title: "errors.ai.provider_error" },
  ContentBlocked: { code: "ai/content-blocked", status: 422, title: "errors.ai.content_blocked" },
});
```

```ts
// src/services/auth/auth.errors.ts
import { defineDomain } from "@/lib/errors/registry";

export const AuthErrors = defineDomain("auth", {
  Unauthorized: { code: "auth/unauthorized", status: 401, title: "errors.auth.unauthorized" },
  Forbidden: { code: "auth/forbidden", status: 403, title: "errors.auth.forbidden" },
});
```

## 5) Mapery brzegowe (Zod, Supabase, AI)

Zasady:

- Zod → 400 (ValidationFailed), `meta = error.flatten()`.
- Supabase → NotFound/429/SaveFailed (w zależności od statusu/kodu).
- AI → 422 wyłącznie dla polityk treści (ContentBlocked). Model unavailable → 503, rate-limit → 429 (ProviderError+status override).

Uwaga: Importy i kody błędów w przykładach poniżej odwołują się do przykładowych
serwisów domenowych (`cards`, `ai`). W swoim projekcie zastąp je odpowiednikami
dla własnych domen/serwisów.

```ts
// src/lib/errors/map-zod.ts
import type { ZodError } from "zod";
import { CardErrors } from "@/services/cards/card.errors";

export function fromZod(err: ZodError) {
  return CardErrors.creators.ValidationFailed({
    detail: "Sprawdź pola formularza",
    meta: err.flatten(),
    cause: err,
  });
}
```

```ts
// src/lib/errors/map-supabase.ts
import { CardErrors } from "@/services/cards/card.errors";

type SupabaseError = { code?: string; message: string; status?: number };

export function fromSupabase(err: SupabaseError) {
  if (err.status === 404 || err.code === "PGRST116") {
    return CardErrors.creators.NotFound({ detail: "Zasób nie istnieje", cause: err });
  }
  if (err.status === 429) {
    return {
      ...CardErrors.creators.SaveFailed({ detail: "Limit zapytań przekroczony", cause: err }),
      status: 429,
      title: "errors.common.rate_limit_exceeded",
      message: "Limit zapytań przekroczony",
    };
  }
  return CardErrors.creators.SaveFailed({ detail: "Błąd zapisu", cause: err });
}
```

```ts
// src/lib/errors/map-ai.ts
import { AiErrors } from "@/services/ai/ai.errors";

type AnyAIError = { code?: string; name?: string; message?: string; provider?: string; policy?: string };

export function fromAI(e: AnyAIError) {
  const name = e?.code ?? e?.name;
  if (name === "content_blocked" || e?.policy === "blocked") {
    return AiErrors.creators.ContentBlocked({ detail: "Treść odrzucona przez model", meta: { provider: e?.provider } });
  }
  if (name === "model_unavailable") {
    return AiErrors.creators.ModelUnavailable({ detail: "Model niedostępny", meta: { provider: e?.provider } });
  }
  if (name === "rate_limit_exceeded") {
    return {
      ...AiErrors.creators.ProviderError({ detail: "Limit dostawcy AI", meta: { provider: e?.provider } }),
      status: 429,
      title: "errors.common.rate_limit_exceeded",
      message: "Limit dostawcy AI",
    };
  }
  return AiErrors.creators.ProviderError({ detail: e?.message ?? "Błąd AI", meta: { provider: e?.provider } });
}
```

## 6) Mostek HTTP: Problem+JSON + X-Request-ID + Sentry (PROD)

Zasady:

- `type` budujemy z `PROBLEM_URI_TYPE` (env) + `/domain/code`.
- `instance` to `new URL(ctx.url).pathname` (bez query).
- `X-Request-ID` na każdej odpowiedzi.
- Sentry aktywne wyłącznie jeśli `SENTRY_ENABLED === "true"` (i DSN dostępny).

```ts
// src/lib/errors/http.ts
import type { APIRoute } from "astro";
import { randomUUID } from "node:crypto";
import { isDomainError, type DomainError, type ProblemDetails } from "./index";
import { defineDomain } from "./registry";

let sentry: any = null;
const SENTRY_ENABLED = (import.meta as any).env.SENTRY_ENABLED === "true";

if (SENTRY_ENABLED) {
  try {
    // Lazy import (opcjonalnie, jeśli masz @sentry/node)
    sentry = await import("@sentry/node");
    sentry.init({
      dsn: (import.meta as any).env.SENTRY_DSN,
      environment: (import.meta as any).env.SENTRY_ENV ?? "production",
    });
  } catch {
    // Ignoruj jeśli brak pakietu na MVP
  }
}

const System = defineDomain("system", {
  Unexpected: { code: "system/unexpected", status: 500, title: "errors.system.unexpected" },
});

export function toProblem(e: DomainError, instance?: string): ProblemDetails {
  const [domain, code] = e.code.split("/");
  const base = (import.meta as any).env.PROBLEM_URI_TYPE ?? "https://docs.app.dev/problems";
  return {
    type: `${base}/${domain}/${code}`,
    title: e.title,
    status: e.status,
    detail: e.message,
    instance,
    code: e.code,
    meta: e.meta,
  };
}

export function jsonProblem(problem: ProblemDetails, init?: ResponseInit) {
  return new Response(JSON.stringify(problem), {
    ...init,
    headers: { "content-type": "application/problem+json", ...(init?.headers ?? {}) },
  });
}

export function withProblemHandling(handler: APIRoute): APIRoute {
  return async (ctx) => {
    const reqId = ctx.request.headers.get("x-request-id") ?? randomUUID();
    try {
      const res = await handler(ctx);
      res.headers.set("x-request-id", reqId);
      return res;
    } catch (error: any) {
      const domainErr: DomainError = isDomainError(error)
        ? error
        : System.creators.Unexpected({ detail: error?.message, cause: error });

      if (SENTRY_ENABLED && sentry?.captureException) {
        sentry.captureException(error, {
          tags: { request_id: reqId, code: domainErr.code },
          extra: { meta: domainErr.meta },
        });
      }

      const problem = toProblem(domainErr, new URL(ctx.url).pathname);
      return jsonProblem(problem, { status: problem.status, headers: { "x-request-id": reqId } });
    }
  };
}
```

## 7) Pomocniki HTTP: sukces i walidacja body

```ts
// src/lib/http/http.responses.ts
export function successResponse<T>(data: T, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
}

export function createdResponse<T>(data: T, location?: string) {
  const headers: HeadersInit = { "content-type": "application/json" };
  if (location) headers["location"] = location;
  return new Response(JSON.stringify(data), { status: 201, headers });
}

export function noContentResponse() {
  return new Response(null, { status: 204 });
}
```

```ts
// src/lib/http/http.validate-body.ts
import type { ZodSchema } from "zod";
import { fromZod } from "@/lib/errors/map-zod";

export async function validateBody<T>(request: Request, schema: ZodSchema<T>): Promise<T> {
  let payload: unknown = {};
  try {
    payload = await request.json();
  } catch {
    // Pusty/niepoprawny JSON – potraktuj jak błąd walidacji
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) throw fromZod(parsed.error);
  return parsed.data;
}
```

## 8) Klient: fetcher rozpoznający Problem+JSON (cookies, bez automatycznego Retry-After)

Zasady:

- `credentials: "include"` (opieramy się na httpOnly cookies z Astro).
- Nie obsługujemy automatycznie `Retry-After` – UI decyduje co zrobić dla 429.

```ts
// src/lib/http/http.fetcher.ts
import type { ProblemDetails } from "@/lib/errors/index";

export class ApiError extends Error {
  constructor(
    public problem: ProblemDetails,
    public requestId?: string
  ) {
    super(problem.detail ?? problem.title);
  }
}

export async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    // cookies httpOnly
    credentials: "include",
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });

  const requestId = res.headers.get("x-request-id") ?? undefined;
  const contentType = res.headers.get("content-type") ?? "";

  if (!res.ok) {
    if (contentType.includes("application/problem+json")) {
      const p: ProblemDetails = await res.json();
      // Uwaga: brak automatycznej obsługi Retry-After – UI może odczytać nagłówek i sam zdecydować
      throw new ApiError(p, requestId);
    }
    throw new Error(`HTTP ${res.status}`);
  }

  if (contentType.includes("application/json")) return res.json();
  return undefined as T;
}
```

## 9) Serwisy – wzorce użycia (rzucają wyłącznie DomainError)

Uwaga: Poniższe pliki serwisów (`cards`, `ai`, `auth`) są PRZYKŁADAMI wzorców użycia
– dostosuj nazwy katalogów/plików i domen do faktycznych serwisów w Twoim projekcie.

```ts
// src/services/cards/card.service.ts
import { CardErrors } from "./card.errors";
import { fromSupabase } from "@/lib/errors/map-supabase";

export async function getCardById(cardId: string) {
  if (!cardId) throw CardErrors.creators.ValidationFailed({ detail: "Brak identyfikatora karty" });
  try {
    // const { data, error } = await supabase.from("cards").select("*").eq("id", cardId).single();
    // if (error) throw fromSupabase(error);
    // if (!data) throw CardErrors.creators.NotFound({ detail: "Karta nie istnieje", meta: { cardId } });
    return { id: cardId, front: "Front", back: "Back" };
  } catch (e: any) {
    // Jeśli to już DomainError z cards/* – propaguj
    if (e?.code?.startsWith?.("cards/")) throw e;
    throw fromSupabase(e);
  }
}
```

```ts
// src/services/ai/ai.service.ts
import { fromAI } from "@/lib/errors/map-ai";

export async function generateCardsFromText(text: string) {
  if (!text || text.length < 10) {
    // Walidacja najlepiej na krawędzi (Zod w endpointach), tu tylko przykładowy guard
    throw new Error("Invalid input");
  }
  try {
    // AI call (Vercel AI SDK v5)
    // ... stream / non-stream
    return [{ front: "Q", back: "A" }];
  } catch (e: any) {
    throw fromAI(e);
  }
}
```

```ts
// src/services/auth/auth.service.ts
import { AuthErrors } from "./auth.errors";

export function requireUser(user: { id: string } | null | undefined) {
  if (!user) throw AuthErrors.creators.Unauthorized({ detail: "Zaloguj się, by kontynuować" });
  return user;
}
```

## 10) Endpointy Astro: uniwersalny wzorzec

Uwaga: Endpoint `flashcards` i import serwisu AI poniżej są PRZYKŁADAMI –
użyj tej sekcji jako wzorca i podmień na własne endpointy/serwisy.

```ts
// src/pages/api/flashcards.ts
import type { APIRoute } from "astro";
import { z } from "zod";
import { withProblemHandling } from "@/lib/errors/http";
import { validateBody } from "@/lib/http/http.validate-body";
import { successResponse } from "@/lib/http/http.responses";
import { generateCardsFromText } from "@/services/ai/ai.service";

const RequestSchema = z.object({
  collection_id: z.string().min(1),
  text: z.string().min(10).max(10_000),
});

export const POST: APIRoute = withProblemHandling(async ({ request }) => {
  const body = await validateBody(request, RequestSchema); // 400 + meta: flatten()
  const cards = await generateCardsFromText(body.text); // ewent. 422 dla treści AI
  // await saveCards(body.collection_id, cards);            // Supabase mapowane przez fromSupabase()
  return successResponse({ saved_count: cards.length, collection_id: body.collection_id });
});
```

## 11) Middleware (opcjonalnie): korelacja `X-Request-ID` w SSR

```ts
// src/middleware/index.ts
import type { MiddlewareHandler } from "astro";
import { randomUUID } from "node:crypto";

export const onRequest: MiddlewareHandler = async (ctx, next) => {
  const reqId = ctx.request.headers.get("x-request-id") ?? randomUUID();
  const res = await next();
  res.headers.set("x-request-id", reqId);
  return res;
};
```

## 12) UI (React 19): ErrorBoundary + toasty + i18n

Zasady:

- `title` w ProblemDetails to klucz i18n – tłumacz po stronie klienta (np. `t(problem.title)`).
- `detail` pokazuj użytkownikowi, jeśli jest bezpieczny i zrozumiały.
- `meta` i `X-Request-ID` loguj w konsoli/monitoringu, nie pokazuj użytkownikowi.

```tsx
// src/components/ErrorBoundary.tsx
import React from "react";

export class ErrorBoundary extends React.Component<{ fallback?: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: any) {
    console.error(err);
  }
  render() {
    return this.state.hasError ? (this.props.fallback ?? <p>Coś poszło nie tak.</p>) : this.props.children;
  }
}
```

```tsx
// przykładowe użycie fetchera + i18n + toast
import { fetchJson, ApiError } from "@/lib/http/http.fetcher";
import { toast } from "sonner";
import { useI18n } from "@/i18n"; // przykładowy hook

async function onSubmit(payload: any) {
  const { t } = useI18n();
  try {
    await fetchJson("/api/flashcards", { method: "POST", body: JSON.stringify(payload) });
    toast.success(t("common.saved"), { description: t("cards.created") });
  } catch (e) {
    if (e instanceof ApiError) {
      toast.error(t(e.problem.title), { description: e.problem.detail ?? e.problem.code });
      console.error("request_id", e.requestId, "meta", e.problem.meta);
    } else {
      toast.error(t("errors.network.title"), { description: t("errors.network.detail") });
    }
  }
}
```

## 13) Dobre praktyki i kontrakty

- Endpointy zawsze owija `withProblemHandling()` (jedno miejsce serializacji błędów + `X-Request-ID` + Sentry PROD).
- Serwisy rzucają wyłącznie `DomainError` (fabryki z rejestru + mapery).
- Walidacja wejścia (Zod) → 400, `meta = flatten()`.
- 422 rezerwujemy dla polityk treści AI.
- `instance` = sama ścieżka.
- `title` = klucz i18n (tłumaczony w kliencie).
- `cause` nigdy nie jest serializowane, tylko logowane.
- Brak automatyki `Retry-After` w fetcherze – UI steruje retry/backoff.

## 14) Testy – propozycja zakresu

Jednostkowe:

- `defineDomain()` i `toProblem()` – poprawność pól oraz URI z `PROBLEM_URI_TYPE`.
- `map-zod`, `map-supabase`, `map-ai` – prawidłowe kody/statusy/meta; 422 tylko dla AI policy.
  Integracyjne:

- `withProblemHandling()` – DomainError → `application/problem+json`, `status`, `X-Request-ID`, (opcjonalnie) Sentry.captureException wywołane na PROD.
  Klient:

- `fetchJson()` – dla problem+json rzuca `ApiError` z `problem` i `requestId`; domyślne `credentials: "include"`.

## 15) Migracja (jeśli istnieje starsza obsługa błędów)

1. Dodaj `lib/errors/*`, `lib/http/*`, `services/*/*.errors.ts`, `middleware/index.ts`.
2. Owiń wszystkie endpointy w `withProblemHandling()`.
3. Zastąp bezpośrednie `throw new Error()` w serwisach fabrykami domen (np. `CardErrors.creators.NotFound()`).
4. Walidacja wejścia w endpointach przez `validateBody()`.
5. UI: przełącz wywołania na `fetchJson()` i dodaj `ErrorBoundary` tam, gdzie to krytyczne.
6. Ustaw `PROBLEM_URI_TYPE` w `.env`. Włącz Sentry tylko na PROD (`SENTRY_ENABLED=true`).

## 16) Checklista wdrożenia (szac. 2–4h)

Core (1–1.5h)

- [ ] Utwórz: `lib/errors/index.ts`, `lib/errors/registry.ts`, `lib/errors/http.ts`.
- [ ] Utwórz mapery: `map-zod.ts`, `map-supabase.ts`, `map-ai.ts`.
- [ ] Utwórz helpery HTTP: `http.responses.ts`, `http.validate-body.ts`, `http.fetcher.ts`.
- [ ] Utwórz domeny: np. `card.errors.ts`, `ai.errors.ts`, `auth.errors.ts` (PRZYKŁADY –
      dostosuj nazwy plików/domen do serwisów w Twoim projekcie).
      Integracja (1–1.5h)

- [ ] Owiń endpointy w `withProblemHandling()`.
- [ ] Zaimplementuj walidację wejścia (`validateBody`).
- [ ] Zintegruj serwisy z maperami i fabrykami (rzucaj `DomainError`).
      Front (0.5–1h)

- [ ] Podmień wywołania na `fetchJson()` (`credentials: "include"`).
- [ ] Dodaj `ErrorBoundary` oraz toasty; zastosuj i18n klucze z `problem.title`.
      Monitoring (0.25h)

- [ ] Włącz Sentry na PROD (flaga env), dodaj tag `request_id`.

## 17) FAQ (decisions)

- Bazowy URI typu problemu pochodzi z `.env` (`PROBLEM_URI_TYPE`).
- `meta` może zawierać `ZodError.flatten()` (bez PII).
- 422 używane tylko dla polityk treści AI (walidacja → 400).
- Brak automatycznej obsługi `Retry-After` – obsługa w UI.
- Sentry uruchamiane w `withProblemHandling` wyłącznie na PROD (flaga env).
- `fetchJson` → `credentials: "include"` (httpOnly cookies).
- `instance` to wyłącznie ścieżka, bez query string.
- `cause` nigdy nie jest serializowane.
- `title` to klucz i18n (tłumaczenie po stronie klienta).

---

Ten plan jest kompletny i gotowy do wdrożenia inkrementalnego. W razie potrzeby mogę przygotować PR-y tworzące wszystkie wymienione pliki wraz z bazowymi testami.
