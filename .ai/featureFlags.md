# Feature Flags – Architektura i użycie

## Cel

System feature flags rozdziela **deployment** od **release’u**. Pozwala włączać/wyłączać wybrane obszary aplikacji bez zmian w kodzie runtime, jedynie poprzez konfigurację środowiskową.

Aktualnie zarządzane są trzy funkcjonalności:

- `auth` – logowanie, rejestracja, reset hasła itd.
- `generations` – generowanie fiszek z tekstu (`/generate`, `/api/generations`).
- `flashcards` – przeglądanie i zarządzanie fiszkami (`/flashcards`, `/api/flashcards`).

---

## Moduł feature flags

**Plik:** `src/features/index.ts`

### Typy

- `EnvironmentName = "local" | "integration" | "production"`
- `FeatureName = "generations" | "auth" | "flashcards"`
- `FeatureConfig = Record<EnvironmentName, Record<FeatureName, boolean>>`

### Konfiguracja środowiskowa

Konfiguracja jest statyczna (build-time, na poziomie modułu):

```ts
const featureFlags: FeatureConfig = {
  local: {
    auth: false,
    flashcards: false,
    generations: false,
  },
  integration: {
    auth: true,
    flashcards: true,
    generations: true,
  },
  production: {
    auth: false,
    flashcards: false,
    generations: false,
  },
};
```

### Źródło prawdy dla środowiska

- Środowisko jest określone przez zmienną `ENV_NAME` (w `import.meta.env`).
- Typ w `src/env.d.ts`:

  ```ts
  readonly ENV_NAME?: "local" | "integration" | "production";
  ```

- Jeżeli `ENV_NAME` jest:
  - **nieustawione** lub ma **niepoprawną** wartość → używany jest domyślnie `"production"`.

### Publiczne API modułu

```ts
export const ENVIRONMENTS = ["local", "integration", "production"] as const;
export type EnvironmentName = (typeof ENVIRONMENTS)[number];
export type FeatureName = "generations" | "auth" | "flashcards";

export const currentEnv: EnvironmentName; // wyliczane z ENV_NAME, fallback "production"

export const isFeatureEnabled = (
  feature: FeatureName,
  env: EnvironmentName = currentEnv
): boolean => { ... };
```

**Zasada:** w kodzie aplikacji używamy **wyłącznie** `isFeatureEnabled(...)` – nie odczytujemy `ENV_NAME` bezpośrednio.

---

## Zachowanie przy wyłączonym featurze

W całej aplikacji obowiązują spójne scenariusze:

- **API endpoint** – zwraca błąd domenowy `system/feature-disabled` (HTTP 403, w formacie RFC 7807).
- **Strona `.astro`** – na początku pliku wykonywany jest redirect `Astro.redirect("/")`.
- **Komponent React** – opcjonalnie używamy komponentu `FeatureGate`, który ukrywa fragment UI.

---

## Integracja z systemem błędów (API)

**Plik:** `src/lib/errors/http.ts`

### Nowy błąd domenowy

Dodany został nowy typ błędu w domenie `system`:

```ts
const SystemErrors = defineDomain("system", {
  Unexpected: {
    code: "system/unexpected",
    status: 500,
    title: "errors.system.unexpected",
  },
  FeatureDisabled: {
    code: "system/feature-disabled",
    status: 403,
    title: "errors.system.feature_disabled",
  },
});

export const systemErrors = SystemErrors;
```

`withProblemHandling` mapuje `DomainError` na RFC 7807 `ProblemDetails` i zwraca odpowiedź `application/problem+json` z kodem 403.

### Wzorzec użycia w endpointach API

**Zasada:** na początku handlera (wewnątrz `withProblemHandling`) sprawdzamy flagę i w razie potrzeby rzucamy `FeatureDisabled`.

Przykład – **auth**:

```ts
import { withProblemHandling, systemErrors } from "@/lib/errors/http";
import { isFeatureEnabled } from "@/features";

export const POST: APIRoute = withProblemHandling(async ({ request, locals }) => {
  if (!isFeatureEnabled("auth")) {
    throw systemErrors.creators.FeatureDisabled({
      detail: "Auth feature is disabled in this environment",
      meta: { feature: "auth" },
    });
  }

  // ...reszta logiki endpointu
});
```

Analogicznie zastosowane dla:

- `feature: "auth"`
  - `src/pages/api/auth/login.ts`
  - `src/pages/api/auth/logout.ts`
  - `src/pages/api/auth/resend-verification.ts`
  - `src/pages/api/auth/reset-password.ts`
  - `src/pages/api/auth/update-password.ts`
  - `src/pages/api/auth/verify-otp.ts`
  - `src/pages/api/auth/register.ts`
- `feature: "flashcards"`
  - `src/pages/api/flashcards/index.ts` (`GET` i `POST`)
  - `src/pages/api/flashcards/[flashcard_id].ts` (`GET`, `PATCH`, `DELETE`)
- `feature: "generations"`
  - `src/pages/api/generations.ts` (`POST`)

**Konsekwencja:** wyłączony feature na poziomie API zawsze oznacza spójną odpowiedź 403 `system/feature-disabled`.

---

## Użycie na stronach `.astro`

**Cel:** gdy feature jest wyłączony, użytkownik nie widzi strony – następuje redirect na stronę główną (`/`).

**Wzorzec:** na początku pliku `.astro`:

```ts
---
import Layout from "@/layouts/Layout.astro";
import { isFeatureEnabled } from "@/features";

if (!isFeatureEnabled("<feature-name>")) {
  return Astro.redirect("/");
}

// ...reszta importów / logiki
---
```

### Zastosowane w projekcie

- **Auth pages** (`feature: "auth"`):
  - `src/pages/auth/login.astro`
  - `src/pages/auth/register.astro`
  - `src/pages/auth/reset-password.astro`
  - `src/pages/auth/new-password.astro`
  - `src/pages/auth/verify-email.astro`

  Przykład – `login.astro`:

  ```ts
  ---
  import Layout from "@/layouts/Layout.astro";
  import { LoginForm } from "@/components/auth/LoginForm";
  import { isFeatureEnabled } from "@/features";

  export const prerender = false;

  if (!isFeatureEnabled("auth")) {
    return Astro.redirect("/");
  }

  const verified = Astro.url.searchParams.get("verified") === "1";
  ---
  ```

- **Flashcards page** (`feature: "flashcards"`):
  - `src/pages/flashcards.astro`

  ```ts
  ---
  import Layout from "@/layouts/Layout.astro";
  import { FlashcardsPage } from "@/components/flashcards/FlashcardsPage";
  import { isFeatureEnabled } from "@/features";

  const title = "Moje fiszki";

  if (!isFeatureEnabled("flashcards")) {
    return Astro.redirect("/");
  }
  ---
  ```

- **Generations page** (`feature: "generations"`):
  - `src/pages/generate.astro`

  ```ts
  ---
  import Layout from "@/layouts/Layout.astro";
  import GenerateView from "@/components/generate/GenerateView";
  import { isFeatureEnabled } from "@/features";

  if (!isFeatureEnabled("generations")) {
    return Astro.redirect("/");
  }
  ---
  ```

**Efekt:** jeśli feature jest wyłączony, strona nie renderuje się – następuje natychmiastowy redirect na `/`.

---

## Użycie w komponentach React

### 1. Gate na poziomie strony

Domyślnie **wystarcza gating na poziomie `.astro`** (route). Jeśli strona jest wyłączona, powiązany komponent React (np. `FlashcardsPage`, `GenerateView`) w ogóle się nie montuje.

### 2. Komponent `FeatureGate` (mniejsze fragmenty UI)

Gdy trzeba ukryć **mniejszy element**, np. pojedynczy widget lub sekcję w istniejącej stronie, używamy komponentu `FeatureGate`.

**Plik:** `src/components/FeatureGate.tsx`

```tsx
import type { ReactNode } from "react";
import { isFeatureEnabled, type FeatureName } from "@/features";

interface FeatureGateProps {
  feature: FeatureName;
  children: ReactNode;
  fallback?: ReactNode;
}

export function FeatureGate({ feature, children, fallback = null }: FeatureGateProps) {
  if (!isFeatureEnabled(feature)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
```

**Wzorzec użycia:**

```tsx
import { FeatureGate } from "@/components/FeatureGate";

function SomeContainer() {
  return (
    <div>
      <FeatureGate feature="flashcards" fallback={<p>Fiszki są niedostępne w tym środowisku.</p>}>
        <FlashcardsToolbar />
        <FlashcardsList />
      </FeatureGate>
    </div>
  );
}
```

### 3. Przykład – nawigacja (`NavBar`)

**Plik:** `src/components/navbar/NavBar.tsx`

- Import feature flags:

  ```ts
  import { isFeatureEnabled } from "@/features";
  ```

- Definicja linków nawigacyjnych zależna od flag:

  ```ts
  const navigationLinks: NavigationLink[] = [
    { label: "Home", path: "/" },
    ...(isFeatureEnabled("generations") ? [{ label: "Generuj", path: "/generate" } as NavigationLink] : []),
    ...(isFeatureEnabled("flashcards") ? [{ label: "Fiszki", path: "/flashcards" } as NavigationLink] : []),
  ];
  ```

**Efekt:** linki `Generuj` i `Fiszki` są widoczne tylko, gdy odpowiednie featury są włączone.

---

## Dodawanie nowych feature flags – checklist

1. **Dodaj nazwę feature’u** do typu:
   - `src/features/index.ts` → rozszerz `FeatureName` i konfigurację `featureFlags` dla wszystkich środowisk.

2. **Jeśli dotyczy API**:
   - W odpowiednich endpointach:
     - zaimportuj `isFeatureEnabled` i `systemErrors`,
     - na początku handlera dodaj:
       ```ts
       if (!isFeatureEnabled("<feature-name>")) {
         throw systemErrors.creators.FeatureDisabled({
           detail: "<Feature> is disabled in this environment",
           meta: { feature: "<feature-name>" },
         });
       }
       ```

3. **Jeśli dotyczy strony `.astro`**:
   - Na początku pliku `.astro` dodaj:

     ```ts
     import { isFeatureEnabled } from "@/features";

     if (!isFeatureEnabled("<feature-name>")) {
       return Astro.redirect("/");
     }
     ```

4. **Jeśli dotyczy fragmentu UI (React)**:
   - owiej fragment w `FeatureGate`:
     ```tsx
     <FeatureGate feature="<feature-name>">{/* komponenty */}</FeatureGate>
     ```

5. **Jeśli dotyczy nawigacji lub linków**:
   - buduj tablice linków dynamicznie, na podstawie `isFeatureEnabled(...)`, tak jak w `NavBar.tsx`.

---

## Podsumowanie

- Źródłem prawdy o środowisku jest `ENV_NAME` → mapowane do `EnvironmentName` z fallbackiem na `"production"`.
- Logika flag jest scentralizowana w `src/features/index.ts` i używana przez:
  - API – przez `isFeatureEnabled(...)` + `systemErrors.creators.FeatureDisabled(...)`,
  - strony `.astro` – przez `isFeatureEnabled(...)` + `Astro.redirect("/")`,
  - komponenty React – przez `isFeatureEnabled(...)` lub `FeatureGate`.
- Dzięki temu:
  - można wdrażać kod z wyłączonymi feature’ami,
  - kontrolować dostępność funkcji per środowisko,
  - zachować spójne zachowanie (403 w API, redirect na front-endzie, ukrywanie elementów UI).
