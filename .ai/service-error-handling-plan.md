# Service Error Handling – Plan dla nowych serwisów

Krótki przewodnik dla developera dodającego nowy serwis w projekcie, w którym działa już Error Handling Architecture (RFC 7807) opisana w pliku `.ai/error-handling-plan.md`.

Cel: pokazać dokładnie co jest stałe (wymagane bez zmian) i co należy dostosować do konkretnej domeny serwisu.

## Zakres i kontrakt serwisu

- WYMAGANE: Serwis rzuca wyłącznie `DomainError` (z własnej domeny) – żadnych `Response`/`throw new Error()`.
- WYMAGANE: `title` to klucz i18n; `code` w formacie `"<domena>/<kod>"` (np. `orders/not-found`).
- WYMAGANE: `meta` nie zawiera PII; `cause` służy tylko do logów i nie jest serializowane.
- WYMAGANE: Nie wywołuj `toProblem()`/`jsonProblem()` w serwisie – serializacja dzieje się w `withProblemHandling()` na granicy HTTP.
- DOSTOSUJ: Wybór i nazewnictwo domeny (np. `orders`, `billing`, `profiles`) oraz lista kodów błędów i i18n.
- DOSTOSUJ: Mapowanie błędów dostawców (DB/SDK) w oparciu o gotowe mapery (`map-zod`, `map-supabase`, `map-ai`) lub własne analogiczne.

Uwaga: 422 (Unprocessable Entity) rezerwuj tylko dla polityk treści w serwisach AI. Walidacja wejścia to 400.

## Minimalna struktura plików serwisu

```
src/services/<twoja-domena>/
  <twoja-domena>.errors.ts   // WYMAGANE – definicje i fabryki błędów domeny
  <twoja-domena>.service.ts  // WZORZEC – logika serwisu, rzuca wyłącznie DomainError
```

Przykład ścieżek (PRZYKŁAD – dostosuj nazwę domeny):

```
src/services/orders/orders.errors.ts
src/services/orders/orders.service.ts
```

## Szablon: plik <domena>.errors.ts (SKOPIUJ 1:1 I UZUPEŁNIJ)

Poniższy szablon skopiuj bez zmian strukturalnych. DOSTOSUJ tylko nazwę domeny, kody i tytuły i18n.

```ts
// src/services/<twoja-domena>/<twoja-domena>.errors.ts
import { defineDomain } from "@/lib/errors/registry";

export const <PascalDomena>Errors = defineDomain("<twoja-domena>", {
  NotFound: { code: "<twoja-domena>/not-found", status: 404, title: "errors.<twoja-domena>.not_found" },
  ValidationFailed: { code: "<twoja-domena>/validation-failed", status: 400, title: "errors.<twoja-domena>.validation_failed" },
  SaveFailed: { code: "<twoja-domena>/save-failed", status: 500, title: "errors.<twoja-domena>.save_failed" },
  // DODAJ własne kody wg potrzeb, zachowując format i statusy HTTP
});
```

Przykład (PRZYKŁAD – dostosuj do swojej domeny):

```ts
// src/services/orders/orders.errors.ts
import { defineDomain } from "@/lib/errors/registry";

export const OrdersErrors = defineDomain("orders", {
  NotFound:         { code: "orders/not-found",         status: 404, title: "errors.orders.not_found" },
  ValidationFailed: { code: "orders/validation-failed", status: 400, title: "errors.orders.validation_failed" },
  SaveFailed:       { code: "orders/save-failed",       status: 500, title: "errors.orders.save_failed" },
  Conflict:         { code: "orders/conflict",          status: 409, title: "errors.orders.conflict" },
});
```

Wskazówki doboru statusów:

- 400 ValidationFailed – błędy walidacji danych wejściowych (Zod `flatten()` → `meta`).
- 401/403 dla autoryzacji/autentykacji (jeśli to domena auth).
- 404 NotFound – brak zasobu.
- 409 Conflict – konflikt stanu domeny (unikalne klucze, itp.).
- 429 – limit (jeśli dot. dostawcy; możesz nadpisać status w mapperze).
- 500 SaveFailed – problemy zapisu/nieoczekiwane wewnętrzne.
- 422 – tylko dla polityk treści AI.

## Szablon: plik <domena>.service.ts (WZORZEC UŻYCIA)

Zasady:

- WYMAGANE: propaguj `DomainError` z tej samej domeny bez zmian.
- WYMAGANE: wszelkie inne błędy mapuj na `DomainError` przez odpowiedni mapper.
- WYMAGANE: nie zwracaj `Response` – jedynie dane domenowe lub `throw DomainError`.
- DOSTOSUJ: konkretne źródła danych, nazwy funkcji i dobór mapperów.

```ts
// src/services/orders/orders.service.ts  (PRZYKŁAD – dostosuj nazwę domeny)
import { OrdersErrors } from "./orders.errors";
import { fromSupabase } from "@/lib/errors/map-supabase"; // DOSTOSUJ jeśli używasz innego źródła

export async function getOrderById(orderId: string) {
  if (!orderId) throw OrdersErrors.creators.ValidationFailed({ detail: "Brak identyfikatora zamówienia" });
  try {
    // PRZYKŁAD: zapytanie do bazy
    // const { data, error } = await db.from("orders").select("*").eq("id", orderId).single();
    // if (error) throw fromSupabase(error);
    // if (!data) throw OrdersErrors.creators.NotFound({ detail: "Zamówienie nie istnieje", meta: { orderId } });
    return { id: orderId, status: "new" };
  } catch (e: any) {
    if (e?.code?.startsWith?.("orders/")) throw e; // propaguj błędy domeny orders
    throw fromSupabase(e); // DOSTOSUJ mapper do źródła błędu
  }
}

export async function createOrder(payload: unknown) {
  try {
    // Walidację wejścia wykonuj najlepiej w endpointach (Zod + validateBody),
    // ale jeśli walidujesz w serwisie, zmapuj na ValidationFailed
    // if (!isValid(payload)) throw OrdersErrors.creators.ValidationFailed({ detail: "Dane niepoprawne" });
    // ... zapis/wywołania
    return { id: "new-id" };
  } catch (e: any) {
    if (e?.code?.startsWith?.("orders/")) throw e;
    throw fromSupabase(e); // lub inny mapper (np. własny dla zewn. API)
  }
}
```

## Integracja na granicy HTTP (endpoint)

W endpointach używaj istniejących helperów: `withProblemHandling()`, `validateBody()`, `successResponse()`.

```ts
// src/pages/api/orders.ts  (PRZYKŁAD – podmień nazwę ścieżki i importy)
import type { APIRoute } from "astro";
import { z } from "zod";
import { withProblemHandling } from "@/lib/errors/http";
import { validateBody } from "@/lib/http/http.validate-body";
import { successResponse } from "@/lib/http/http.responses";
import { createOrder } from "@/services/orders/orders.service";

const RequestSchema = z.object({
  customer_id: z.string().min(1),
  items: z.array(z.object({ sku: z.string(), qty: z.number().int().positive() })).min(1),
});

export const POST: APIRoute = withProblemHandling(async ({ request }) => {
  const body = await validateBody(request, RequestSchema); // 400 + meta: flatten()
  const created = await createOrder(body);
  return successResponse(created);
});
```

## Co jest STAŁE vs co DOSTOSOWAĆ

- STAŁE: użycie `defineDomain()` w pliku `*.errors.ts` i eksport stałej `XxxErrors` z `creators`.
- STAŁE: rzucanie wyłącznie `DomainError` w serwisach i brak `Response`.
- STAŁE: serializacja błędów w `withProblemHandling()` (nie w serwisie).
- STAŁE: `title` jako klucz i18n; `code` w formacie `domena/kod`.
- DOSTOSUJ: nazwa domeny, lista kodów, i18n klucze, mapper używany w `catch`.
- DOSTOSUJ: walidację danych (najlepiej w endpointach przez Zod + `validateBody`).

## Szybkie wzorce mapperów (użyj istniejących lub analogicznych)

- Zod → użyj `fromZod(error)` aby zwrócić `ValidationFailed` danej domeny (jeśli walidujesz w serwisie – preferowana walidacja w endpointach).
- Supabase/DB → `fromSupabase(err)` mapuje na `NotFound`/`SaveFailed`/`429` (nadpisz status, jeśli to limit).
- Zewnętrzne SDK → napisz analog do `map-ai.ts` (zwracaj `ProviderError`/`ModelUnavailable` itd. dla swojej domeny).

## i18n i nazewnictwo kodów

- Klucze i18n w `title`: `errors.<domena>.<nazwa_kodu>` (np. `errors.orders.not_found`).
- `code`: `"<domena>/<nazwa-kodu-kebab>"` (np. `orders/not-found`).
- Spójność prefiksu domeny: identyczny w `defineDomain()` i w `code`.

## Checklista wdrożenia nowego serwisu (ok. 30–90 min)

- Utwórz folder `src/services/<twoja-domena>/`.
- Dodaj `src/services/<twoja-domena>/<twoja-domena>.errors.ts` (SKOPIUJ szablon i uzupełnij domenę/kody/i18n).
- Dodaj `src/services/<twoja-domena>/<twoja-domena>.service.ts` (WZORZEC: propaguj `DomainError`, mapuj pozostałe błędy).
- Jeśli potrzebujesz specyficznego mapera, utwórz analog w `src/lib/errors/*` lub użyj istniejącego (`map-zod`, `map-supabase`, `map-ai`).
- Dodaj/zmień endpoint(y) tak, by używać `withProblemHandling()` + `validateBody()` + serwis.
- Dodaj klucze i18n dla `problem.title` (np. `errors.<domena>.*`).
- (Opcjonalnie) test: rzutowanie `DomainError` → `Problem+JSON` przez `withProblemHandling()` i poprawne statusy.

## Częste pułapki

- Nie serializuj błędów w serwisie (żadnego `toProblem()`/`jsonProblem()`); rób to tylko na granicy HTTP.
- Nie mieszaj statusów: walidacja → 400; 422 tylko dla polityk treści AI.
- Zawsze dołącz `cause` w fabrykach, jeśli mapujesz błąd zewnętrzny (pomaga w logach/Sentry).
- Unikaj ujawniania PII w `meta`.

---

Ten dokument to „wzorzec dla serwisu”. Nazwy domen (`orders`, itp.) są przykładami – dostosuj do faktycznych serwisów w projekcie, zachowując stałe kontrakty i strukturę.

