# 10x-Cards Database Schema

## 1. Tabele, kolumny i ograniczenia

---

### 1.1. users

Table users is managed by Supabase Auth.

- id: UUID PRIMARY KEY
- email: VARCHAR(255) NOT NULL UNIQUE
- encrypted_password: VARCHAR NOT NULL
- created_at: TIMESTAMPTZ NOT NULL DEFAULT now()
- confirmed at: TIMESTAMPTZ

---

### 1.2. flashcards

- id: BIGSERIAL PRIMARY KEY
- front: TEXT NOT NULL CHECK (char_length(front) BETWEEN 1 AND 200)
- back: TEXT NOT NULL CHECK (char_length(back) BETWEEN 1 AND 500)
- source: VARCHAR NOT NULL CHECK (source IN ('ai-full' , 'ai—edited', 'manual'))
- created_at: TIMESTAMPTZ NOT NULL DEFAULT now()
- updated_at: TIMESTAMPTZ NOT NULL DEFAULT now()
- user_id: UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
- collection_id: BIGINT NULL REFERENCES collections(id) ON DELETE SET NULL
- generation_id: BIGINT NULL REFERENCES generations(id) ON DELETE SET NULL

> Uwagi walidacyjne: limit długości pól zgodnie z PRD (front ≤200, back ≤500).

---

### 1.3. generations

- id: BIGSERIAL PRIMARY KEY
- user_id: UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
- model: VARCHAR NOT NULL
- generated_count: INTEGER NOT NULL
- accepted_unedited_count: INTEGER NULLABLE
- accepted_edited_count: INTEGER NULLABLE
- source_text_hash: VARCHAR NOT NULL
- source_text_length: INTEGER NOT NULL CHECK (source_text_length BETWEEN 1000 AND 50000)
- generation_duration_ms: INTEGER NOT NULL
- created_at: TIMESTAMPTZ NOT NULL DEFAULT now()
- updated_at: TIMESTAMPTZ NOT NULL DEFAULT now()

> Uwagi: nie przechowujemy pełnego tekstu źródłowego – jedynie hash i metadane długości/czasu. Sesje służą do KPI (AI-acceptance/usage).

---

### 1.4. generation_error_logs

- id: BIGSERIAL PRIMARY KEY
- user_id: UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
- model: VARCHAR NOT NULL
- source_text_hash: VARCHAR NOT NULL
- source_text_length: INTEGER NOT NULL CHECK (source_text_length BETWEEN 1000 AND 50000)
- error_code: VARCHAR(100) NOT NULL
- error_message: TEXT NOT NULL
- details: JSONB NULL
- created_at: TIMESTAMPTZ NOT NULL DEFAULT now()

> Uwagi: logi nie zawierają treści fiszek; służą diagnozie i metrykom błędów/timeoutów.

---

### 1.5. collections (opcjonalne; domyślna „knowledge”)

- id: BIGSERIAL PRIMARY KEY
- user_id: UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
- name: VARCHAR(100) NOT NULL
- created_at: TIMESTAMPTZ NOT NULL DEFAULT now()
- updated_at: TIMESTAMPTZ NOT NULL DEFAULT now()

> Uwagi: rozszerzalne zestawy fiszek per użytkownik; w MVP można trzymać pojedynczą domyślną kolekcję.

---

### 1.6. Triggery pomocnicze

- Funkcja: set_updated_at() — BEFORE UPDATE na każdej z tabel: flashcards, generations, collections; ustawia NEW.updated_at = now().

---

## 2. Relacje między tabelami

- auth.users (Supabase) 1 — N flashcards (własność zasobu).
- auth.users 1 — N generations.
- auth.users 1 — N generation_error_logs.
- auth.users 1 — N collections.
- generations 1 — N flashcards (przez flashcards.generation_id, opcjonalne).
- collections 1 — N flashcards (opcjonalne).

Kardynalności: wszystkie powyższe to relacje jeden-do-wielu; relacji wiele-do-wielu nie przewiduje się w MVP.

---

## 3. Indeksy

### 3.1. Kluczowe ścieżki odczytu

- Indeks na kolumnie `user_id` w tabeli flashcards.
- Indeks na kolumnie `generation_id` w tabeli flashcards.
- Indeks na kolumnie `user_id` w tabeli generations.
- Indeks na kolumnie `user_id` w tabeli generation_error_logs.

### 3.2. Proste wyszukiwanie (MVP)

- Funkcjonalne (case-insensitive) do ILIKE:
- flashcards_search_front: ON flashcards (LOWER(front))
- flashcards_search_back: ON flashcards (LOWER(back))

> Brak FTS w MVP — proste wyszukiwanie po ILIKE z indeksami funkcjonalnymi; możliwość rozbudowy w przyszłości.

---

## 4. Zasady PostgreSQL (RLS)

> Supabase/PG z RLS: dostęp tylko do własnych wierszy; rola serwisowa może omijać RLS dla zadań systemowych (np. batch cleanup).

### 4.1. Włączenie RLS

- ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
- ALTER TABLE generations ENABLE ROW LEVEL SECURITY;
- ALTER TABLE generation_error_logs ENABLE ROW LEVEL SECURITY;
- ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

> W tabelach flashcards, generations, generation_error_logs, collections wdrożyć polityki RLS, które pozwalają użytkownikowi na dostęp tylko do rekordów, gdzie `user_id` odpowiada identyfikatorowi użytkownika z Supabase Auth (np. auth.uid() = user_id).

### 4.2. Polityki „owner-only”

- **SELECT/INSERT/UPDATE/DELETE (JWT użytkownika)**
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

- **Bypass dla roli serwisowej (np. cron, usuwanie konta z kaskadą)**
  TO service_role USING (true) WITH CHECK (true);

> Cel: spełnienie FR-11/FR-19, ochrona danych per użytkownik, twarde usuwanie z kaskadą.

---

## 5. Dodatkowe uwagi projektowe

- **Hard-delete & kaskady:** usunięcie auth.users kasuje powiązane dane (flashcards, generations, generation_error_logs, collections) zgodnie z RODO/FR-19.
- **Brak utrwalania kandydatów:** do bazy trafiają wyłącznie zaakceptowane fiszki; metryki i logi zapewnia generations/generation_error_logs.
- **Scheduler spaced-repetition:** integracja z zewnętrznym/otwartym schedulerem; w MVP brak własnych tabel SR — nowe fiszki są rejestrowane w schedulerze na warstwie aplikacyjnej po insercie.
- **Normalizacja:** model w 3NF; denormalizacja nie jest potrzebna przy zakładanych wolumenach (MVP).
- **Zgodność ze stackiem:** Postgres + Supabase Auth, RLS i kaskady wspierane natywnie; aplikacja frontowa (Astro/React) korzysta z prostych zapytań i indeksów ILIKE.

---
