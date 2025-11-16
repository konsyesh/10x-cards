# Moduł Autentykacji – Specyfikacja Architektury (FR-07, US-001–US-004)

Cel: dodać rejestrację, logowanie, wylogowanie i reset hasła z użyciem Supabase Auth, integrując się z istniejącą architekturą Astro 5 + React 19 + Zod + Tailwind + shadcn/ui i nie naruszając działania istniejących funkcji (w tym strony `src/pages/generate.astro`).

Zakres: FR-07 oraz US-001 (Rejestracja), US-002 (Logowanie), US-003 (Reset hasła), US-004 (Wylogowanie). Zgodność z kontekstem i architekturą z `.ai/tech-stack.md` oraz konfiguracją SSR w `astro.config.mjs` (output: "server", adapter: node standalone).


**Założenia i zgodność**
- Nie zmieniamy istniejących ścieżek biznesowych ani kontraktów API dla generacji i zapisu fiszek. Dodajemy warstwę auth i bezpieczne pobieranie `userId` zamiast `DEFAULT_USER_ID`.
- Strona `src/pages/generate.astro` pozostaje bez zmian w strukturze i użyciu komponentów; będzie chroniona middleware.
- Wszystkie nowe endpointy utrzymują dotychczasowy standard HTTP i błędów: JSON na sukces, RFC 7807 `application/problem+json` na błąd, nagłówek `x-request-id`.


## 1. Architektura Interfejsu Użytkownika

**Nowe strony (publiczne SSR, bez prerenderu)**
- `src/pages/auth/login.astro` – formularz logowania (email, hasło), linki do rejestracji i resetu.
- `src/pages/auth/register.astro` – formularz rejestracji (email, hasło, powtórzenie hasła, checkbox regulaminu – opcjonalnie w MVP komunikat o polityce prywatności zgodnie z US-027).
- `src/pages/auth/reset-password.astro` – formularz do wysyłki linku resetującego (email).
- `src/pages/auth/new-password.astro` – ustawienie nowego hasła (po weryfikacji linku recovery). Widok dostępny dla sesji utworzonej z linku recovery.
- `src/pages/auth/callback.ts` – serwerowy handler (SSR) do obsługi linków e-mail (signup/confirm/recovery). Wymiana `code` → sesja, zapis cookies, redirect: recovery → `/auth/new-password`, pozostałe → `/generate`.

Każda strona auth zawiera `export const prerender = false;` i korzysta z `Layout.astro` dla spójności UI.

**Nowe komponenty React (wyspy) w `src/components/auth`**
- `LoginForm.tsx`
  - Pola: email, password; przyciski: Zaloguj; linki: Zarejestruj się, Nie pamiętam hasła.
  - Walidacja: Zod – `email().min(1)`; `password().min(8).max(72)`; błędy inline pod polami.
  - Integracja: `fetchJson('/api/auth/login', { method: 'POST', body: {...} })`.
  - Komunikaty błędów: przy błędnych danych „Nieprawidłowy e-mail lub hasło” (US-002 – bez ujawniania, które pole błędne).
  - Po sukcesie: redirect do `redirectTo` (z query) lub `/generate`.

- `RegisterForm.tsx`
  - Pola: email, password, confirmPassword; opcjonalnie checkbox polityki prywatności z linkiem powiązanym z US-027.
  - Walidacja: email wymagany i poprawny; hasło min 8 znaków, maks. 72, co najmniej 1 litera i 1 cyfra (zbalansowane komunikaty siły hasła); confirm = password.
  - Integracja: `POST /api/auth/register`.
  - Komunikaty: jeśli email zajęty → „Konto z tym adresem e-mail już istnieje” (US-001), inne błędy – generyczne.
  - Po sukcesie: jeśli Supabase wymaga potwierdzenia e-mail – komunikat „Sprawdź skrzynkę, wyślemy link aktywacyjny”; jeśli nie – automatyczne zalogowanie, redirect do `/generate`.

- `RequestResetForm.tsx`
  - Pole: email; walidacja: poprawny email.
  - Integracja: `POST /api/auth/reset-password`.
  - Komunikat po sukcesie: „Jeśli adres istnieje w systemie, wysłaliśmy wiadomość z linkiem resetującym” (bez enumeracji kont – dobry wzorzec bezpieczeństwa, zgodny z US-003).

- `UpdatePasswordForm.tsx`
  - Pola: password, confirmPassword; walidacja jak w rejestracji.
  - Integracja: `POST /api/auth/update-password`; wymaga ważnej sesji, która powstaje po wejściu przez link recovery i obsłudze w `/auth/callback`.
  - Komunikaty: sukces – „Hasło zostało zaktualizowane. Możesz się zalogować.”; błędy: „Link wygasł lub jest nieprawidłowy.”

Wszystkie formularze korzystają z shadcn/ui (`Input`, `Label`, `Button`, `Form`, `FormField`, `FormMessage`) i Tailwind 4, zachowując spójność ze stylistyką projektu. Dla feedbacku używać `sonner` (już używany w appce).

**Layout i tryby auth/non-auth**
- `src/layouts/Layout.astro`: pozostaje jako główny wrapper. Na stronie można przekazywać informację o zalogowaniu (np. `user` z SSR) jako props do Layout albo wykrywać stan w samych stronach.
- Nawigacja (minimalne zmiany, bez naruszania działania):
  - Gdy zalogowany: linki „Home”, „Generate”, „Wyloguj”.
  - Gdy niezalogowany: linki „Home”, „Zaloguj”, „Rejestracja”.
  - Link „Generate” może być widoczny zawsze, ale bez sesji wejście spowoduje redirect do `/auth/login?redirectTo=/generate` (obsługuje middleware).

**Przypadki walidacji i komunikaty błędów**
- Rejestracja (US-001):
  - email: wymagany, poprawny format.
  - hasło: min 8, maks. 72, zalecany co najmniej 1 znak alfabetyczny i 1 cyfrę; komunikaty: „Podaj poprawny e-mail”, „Hasło musi mieć co najmniej 8 znaków”, „Hasło nie spełnia minimalnych wymagań: litera i cyfra”.
  - konflikt: „Konto z tym adresem e-mail już istnieje” (409).

- Logowanie (US-002):
  - błędne dane: „Nieprawidłowy e-mail lub hasło”. Bez ujawniania, które pole.
  - sukces: redirect do `/generate`.

- Reset hasła (US-003):
  - zawsze komunikat neutralny: „Jeśli adres istnieje w systemie, wysłaliśmy wiadomość z linkiem resetującym”.

- Ustawienie nowego hasła (US-003):
  - walidacja jak wyżej; przy tokenie nieważnym: „Link wygasł lub jest nieprawidłowy”.

- Wylogowanie (US-004):
  - sukces: redirect do `/auth/login` i komunikat „Wylogowano pomyślnie”.

**Najważniejsze scenariusze**
- Nowy użytkownik → Rejestracja → (opcjonalnie) Potwierdzenie e-mail → Automatyczne logowanie → Redirect do `/generate`.
- Istniejący użytkownik → Logowanie → Redirect do `/generate`.
- Zapomniane hasło → Wpisz email → Link w e-mailu → `/auth/callback` (ustawia sesję) → `/auth/new-password` → Ustaw hasło → Logowanie.
- Wylogowanie z dowolnej strony → `/auth/login`.


## 2. Logika backendowa

**Supabase SSR – klient serwerowy**
- Zamiast globalnego klienta tylko po stronie klienta, dodajemy instancję SSR, która:
  - tworzy klienta na żądanie na podstawie nagłówków i cookies,
  - używa `@supabase/ssr` i wyłącznie metod `cookies.getAll()` oraz `cookies.setAll()`.
- Plik: `src/db/supabase.server.ts` (nazwa sugerowana), ew. rozszerzenie istniejącego `src/db/supabase.client.ts` o fabrykę SSR. Kontrakt funkcji:
  - `createSupabaseServerInstance({ headers, cookies }: { headers: Headers; cookies: AstroCookies })` → `SupabaseClient`.

**Middleware autentykacji i korelacji**
- Plik: `src/middleware/index.ts` (rozszerzenie istniejącego):
  - Nadal dodaje `x-request-id` (obecny mechanizm zostaje).
  - Zamiast stałego `supabaseClient` dodaje serverowy: `locals.supabase = createSupabaseServerInstance({ headers: request.headers, cookies })`.
  - Pobiera sesję/ użytkownika: `const { data: { user, session } } = await locals.supabase.auth.getUser()` (lub `getSession()`), i zapisuje do `locals.user`, `locals.session`.
  - Publiczne ścieżki: `['/auth/login','/auth/register','/auth/reset-password','/auth/new-password','/auth/callback','/api/auth/login','/api/auth/register','/api/auth/reset-password','/api/auth/update-password']` oraz statyki `/favicon.*`, `/assets/*`.
  - Zasoby chronione: `/generate` i całe `/api` (poza `PUBLIC`), z redirectem 302 do `/auth/login?redirectTo=<ścieżka>` jeśli brak sesji. Dla API zwrot 401 w formacie RFC 7807.
  - Jeśli zalogowany i wchodzi na `/auth/login` lub `/auth/register` → redirect do `/generate`.

**Endpointy API (Astro APIRoute, SSR, RFC 7807)**
- Konwencje wspólne:
  - `export const prerender = false;`
  - Walidacja wejścia przez Zod + `validateBody()`.
  - Obsługa wyjątków przez `withProblemHandling()`.
  - Błędy domenowe `auth/*` (patrz niżej), mapping Supabase → DomainError.

- `POST src/pages/api/auth/register.ts`
  - Request schema: `{ email: string.email(), password: string.min(8).max(72).regex(/[A-Za-z]/).regex(/[0-9]/) }`.
  - Działanie: `supabase.auth.signUp({ email, password, options: { emailRedirectTo: <BASE_URL>/auth/callback?type=signup } })`.
  - Odpowiedź:
    - Jeśli Supabase zwraca sesję (brak wymaganego potwierdzenia e-mail) → 201, cookies ustawione, body: `{ user_id, message }`.
    - Jeśli wymagane potwierdzenie e-mail → 200, body: `{ message: 'Sprawdź skrzynkę e-mail, aby aktywować konto' }`.
  - Błędy: email zajęty → 409 `auth/user-exists`; inne → 400 `auth/validation-failed` lub 500 `system/unexpected`.

- `POST src/pages/api/auth/login.ts`
  - Request schema: `{ email: string.email(), password: string.min(1) }`.
  - Działanie: `supabase.auth.signInWithPassword({ email, password })`; cookie `setAll()`.
  - Odpowiedź: 200 `{ user_id, email }`.
  - Błędy: nieprawidłowe dane → 401 `auth/invalid-credentials` (bez enumeracji); zbyt wiele prób → 429; konto nieaktywne → 403 `auth/email-not-confirmed`.

- `POST src/pages/api/auth/logout.ts`
  - Działanie: `supabase.auth.signOut()`; `setAll()` (Supabase ustawia wygaszenie cookies).
  - Odpowiedź: 204 No Content.

- `POST src/pages/api/auth/reset-password.ts`
  - Request schema: `{ email: string.email() }`.
  - Działanie: `supabase.auth.resetPasswordForEmail(email, { redirectTo: <BASE_URL>/auth/callback?type=recovery })`.
  - Odpowiedź: 200 z komunikatem neutralnym.

- `POST src/pages/api/auth/update-password.ts`
  - Wymaga aktywnej sesji (po `/auth/callback?type=recovery&code=...`).
  - Request schema: `{ password: string, confirmPassword: string }` (z walidacją tożsamości pól po stronie backendu i frontu).
  - Działanie: `supabase.auth.updateUser({ password })`.
  - Odpowiedź: 200, po czym redirect klienta do `/auth/login`.

- `GET src/pages/auth/callback.ts`
  - Przetwarza `?code=...` oraz `?type=signup|recovery|magiclink|...`.
  - Działanie: `supabase.auth.exchangeCodeForSession(code)` → ustawia cookies.
  - Redirect: dla `type=recovery` → `/auth/new-password`; wpp. → `/generate`.

**Modele i kontrakty danych (minimalne)**
- Brak nowych tabel biznesowych – używamy `auth.users` z Supabase. Docelowo można dodać `profiles` (poza zakresem FR-07).
- W istniejących domenach `flashcards` i `generations` pozostaje `user_id`. Po wdrożeniu auth:
  - API pobiera `userId` z `locals.user.id` zamiast `DEFAULT_USER_ID`.
  - RLS w Supabase: polityki per tabela (od strony DB) zapewniają `user_id = auth.uid()`.

**Walidacja wejścia i obsługa wyjątków**
- Zod schemas w endpointach auth; błędy `fromZod()` → `auth/validation-failed` (400) z `meta` zawierającym `zod.flatten()`.
- Błędy Supabase mapowane na `auth/*` (patrz niżej „System autentykacji”).
- Wszystkie endpointy owijane `withProblemHandling()` – jednolite `x-request-id` i problem+json.

**SSR renderowanie wybranych stron**
- Konfiguracja SSR (`output: 'server'`) już istnieje w `astro.config.mjs`. Strony auth oznaczamy `prerender = false`.
- Strony chronione (np. `/generate`) pozostają SSR; dostęp kontroluje middleware (redirecty SSR). Nie zmieniamy implementacji `src/pages/generate.astro`.


## 3. System autentykacji (Supabase Auth + Astro)

**Biblioteki i konfiguracja**
- Pakiety: `@supabase/supabase-js`, `@supabase/ssr`.
- `.env`/`src/env.d.ts`: już zawarte `SUPABASE_URL`, `SUPABASE_KEY`. Dodać do `App.Locals` wpisy:
  - `supabase: SupabaseClient<Database>` (już istnieje)
  - `user?: { id: string; email?: string } | null`
  - `session?: { access_token: string; expires_at?: number } | null`

**Tworzenie klienta SSR**
- `src/db/supabase.server.ts` (lub rozbudowa `supabase.client.ts` o eksport SSR):
  - `createSupabaseServerInstance({ headers, cookies })` używa `createServerClient()` z `@supabase/ssr`.
  - Implementacja cookies – tylko `getAll` i `setAll` (zgodnie z zasadami z `.cursor/rules/supabase-auth.mdc`).
  - `cookieOptions`: `path: '/', secure: true, httpOnly: true, sameSite: 'lax'`.

**Middleware – kontrola dostępu**
- Whitelist publicznych ścieżek (patrz wyżej) + statyki.
- Dla żądań API bez sesji – zwracamy 401 z problem+json `auth/unauthorized`.
- Dla stron SSR bez sesji – redirect do `/auth/login?redirectTo=...`.
- Dla `/auth/login` i `/auth/register` przy aktywnej sesji – redirect do `/generate`.

**Mapowanie błędów auth (propozycja nowego modułu)**
- Plik: `src/services/auth/auth.errors.ts` (podobnie jak `flashcard.errors.ts`):
  - `InvalidCredentials` → 401, `errors.auth.invalid_credentials`.
  - `UserExists` → 409, `errors.auth.user_exists`.
  - `EmailNotConfirmed` → 403, `errors.auth.email_not_confirmed`.
  - `RateLimited` → 429, `errors.auth.rate_limited`.
  - `ValidationFailed` → 400, `errors.auth.validation_failed`.
  - `ProviderError` → 502, `errors.auth.provider_error` (rzadziej, np. awaria usługodawcy).

**Bezpieczeństwo i praktyki**
- Brak enumeracji kont w resetowaniu hasła i logowaniu (komunikaty neutralne) – wyjątek: rejestracja może sygnalizować duplikat (US-001).
- Cookies `httpOnly`, `sameSite=lax`, `secure` w produkcji. `credentials: 'include'` już wymuszone przez `http.fetcher` (front).
- Rate limiting logowania i resetu (np. proste in-memory per IP/ e-mail; na produkcji: Redis). Dostosować do US-030.
- CSRF: działania stanu (login, logout, update password) są POST i zależą od `httpOnly` cookies + `sameSite=lax` – ryzyko niskie. Opcjonalnie dodać CSRF token na /api/auth/* jeśli wymagane.
- Nagłówek `x-request-id` – już obsługiwany globalnie, stosować także w auth endpointach.

**Integracja z istniejącym backendem**
- Zastąpić użycie `DEFAULT_USER_ID` we wszystkich endpointach biznesowych:
  - `src/pages/api/generations.ts`, `src/pages/api/flashcards.ts` → pobierać `locals.user?.id` i rzucać 401 jeśli brak.
  - Zachować dotychczasowe walidacje Zod i obsługę ProblemDetails.


## 4. Podział odpowiedzialności (Astro vs React)

**Astro (SSR, routing, ochrona dostępu)**
- Odpowiada za:
  - SSR i komponowanie układu (`Layout.astro`).
  - Kontrolę dostępu (middleware), redirecty, ustawianie `prerender = false` na stronach auth.
  - Strony auth jako kontenery dla React formularzy.
  - Endpointy API auth zgodne z istniejącymi wzorcami (Zod + ProblemDetails).

**React (formularze, interakcje, walidacja UI)**
- Odpowiada za:
  - Walidacje inline, UX, stany ładowania, komunikaty `sonner`.
  - Wywołania do API przez `fetchJson` (z `credentials: 'include'`).
  - Po sukcesie – nawigacje (JS redirect), po błędach – prezentacja ProblemDetails (`ApiError`).


## 5. Kontrakty i ścieżki (podsumowanie)

**Strony (SSR):**
- `src/pages/auth/login.astro` – logowanie (public).
- `src/pages/auth/register.astro` – rejestracja (public).
- `src/pages/auth/reset-password.astro` – reset (public).
- `src/pages/auth/new-password.astro` – nowe hasło (po recovery, public, ale wymaga sesji utworzonej przez callback).
- `src/pages/auth/callback.ts` – wymiana `code` na sesję, redirect.
- `src/pages/generate.astro` – chroniona (bez zmian implementacyjnych, chroniona middleware).

**Komponenty React (client:only="react"):**
- `src/components/auth/LoginForm.tsx`
- `src/components/auth/RegisterForm.tsx`
- `src/components/auth/RequestResetForm.tsx`
- `src/components/auth/UpdatePasswordForm.tsx`

**Endpointy API:**
- `POST /api/auth/register` → 200/201 lub problem+json.
- `POST /api/auth/login` → 200 lub 401/403/429 problem+json.
- `POST /api/auth/logout` → 204.
- `POST /api/auth/reset-password` → 200.
- `POST /api/auth/update-password` → 200 lub 400/401/410 problem+json.

**Typy/locals (TS):**
- `src/env.d.ts`: dodać `user` i `session` do `App.Locals`.


## 6. Scenariusze akceptacyjne (mapowanie na US-001–US-004)

- US-001 Rejestracja
  - Wejście: email, hasło (+ potwierdzenie).
  - Sukces: zalogowanie lub informacja o e-mail aktywacyjnym (w zależności od konfiguracji Supabase; `emailRedirectTo` → `/auth/callback`).
  - Błąd: istniejący email (409), błędna walidacja (400).

- US-002 Logowanie
  - Wejście: email, hasło.
  - Sukces: redirect do `/generate`.
  - Błąd: „Nieprawidłowy e-mail lub hasło” (401). Brute force – 429.

- US-003 Reset hasła
  - Wejście: email.
  - Sukces: neutralny komunikat, link z Supabase do `/auth/callback?type=recovery`.
  - Ustawienie nowego hasła po wejściu z linku (sesja via callback) → `update-password`.

- US-004 Wylogowanie
  - Akcja: POST `/api/auth/logout` albo link w UI wywołujący POST.
  - Sukces: 204 + redirect na klienta do `/auth/login`.


## 7. Plan wdrożenia (kolejność kroków – high level)

1) Supabase SSR: dodać `createSupabaseServerInstance` i rozszerzyć middleware o `locals.user` + ochronę ścieżek.
2) Endpointy: `register`, `login`, `logout`, `reset-password`, `update-password`, `auth/callback` z Zod + ProblemDetails.
3) UI: strony Astro i komponenty React formularzy z walidacją Zod.
4) Zastąpić `DEFAULT_USER_ID` w API biznesowym na `locals.user.id` (utrzymać istniejący standard responsów i błędów).
5) Nawigacja: drobne zmiany w `Layout.astro` (warunkowe linki; brak zmian w istniejących stronach biznesowych).
6) Hardening: rate limiting logowania/resetu, testy manualne ścieżek błędów.


## 8. Uwagi dot. nienaruszania istniejącej funkcjonalności

- Nie zmieniamy zachowania `src/pages/generate.astro` ani komponentów generacji; jedynie wymuszamy auth przed dostępem.
- `http.fetcher.ts` i `withProblemHandling()` pozostają wspólnym wzorcem – auth API korzysta z nich identycznie jak istniejące API.
- Wszelkie redirecty odbywają się przez middleware i SSR, aby nie wpływać na istniejące interakcje klienta (np. modale unsaved-changes).


## 9. Dodatkowe kwestie operacyjne

- Konfiguracja Supabase: wymaganie potwierdzenia e-mail przy rejestracji – decyzja produktowa (PRD dopuszcza oba warianty). Specyfikacja obsługuje oba.
- RLS w Supabase: należy upewnić się, że polityki tabel biznesowych (`flashcards`, `generations`, itp.) są ustawione na `user_id = auth.uid()`.
- Analiza logów: `x-request-id` już wspierane; dodać do auth endpointów.
- i18n: komunikaty błędów i labelki przenieść do zasobów i18n zgodnie z US-026 (poza zakresem tej zmiany – przygotować klucze).


—
Niniejsza specyfikacja precyzuje komponenty, moduły, kontrakty API i mechanizmy SSR/middleware wymagane do wdrożenia FR-07 i US-001–US-004 w zgodzie z aktualnym stackiem (`.ai/tech-stack.md`) i konfiguracją `astro.config.mjs`.

