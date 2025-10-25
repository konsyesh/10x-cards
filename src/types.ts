import type { Tables, TablesInsert, TablesUpdate } from "./db/database.types";

/**
 * ============================================================================
 * BASE DTOs - Bezpośrednie mapowania z typów bazy danych
 * ============================================================================
 */

/** Reprezentacja karty do nauki z bazy danych */
export type FlashcardDTO = Tables<"flashcards">;

/** Reprezentacja sesji generowania kart z bazy danych */
export type GenerationDTO = Tables<"generations">;

/** Reprezentacja kolekcji z bazy danych */
export type CollectionDTO = Tables<"collections">;

/** Reprezentacja błędu generowania z bazy danych */
export type GenerationErrorLogDTO = Tables<"generation_error_logs">;

/**
 * ============================================================================
 * COMMAND MODELE - Struktury danych wysyłane do API
 * ============================================================================
 */

/** Komenda do utworzenia sesji generowania flashcards przez AI */
export interface CreateGenerationCommand {
  /** Tekst źródłowy do analizy (1000-50000 znaków) */
  source_text: string;
  /** Model LLM do użycia */
  model: string;
}

/** Pojedynczy element karty do zapisania w operacji bulk */
export interface CreateFlashcardItemCommand {
  /** Strona pytania/pytająca karty (1-200 znaków) */
  front: string;
  /** Strona odpowiedzi/opisowa karty (1-500 znaków) */
  back: string;
  /** Źródło karty */
  source: FlashcardSource;
  /** ID sesji generowania, jeśli karta pochodzi z AI */
  generation_id?: number | null;
}

/** Komenda do utworzenia lub bulk save flashcards */
export interface CreateFlashcardsCommand {
  /** Tablica kart do zapisania */
  flashcards: CreateFlashcardItemCommand[];
  /** ID kolekcji, do której mają być przypisane karty */
  collection_id: number | null;
}

/** Komenda do aktualizacji flashcard */
export interface UpdateFlashcardCommand {
  /** Aktualizowana strona pytania */
  front?: string;
  /** Aktualizowana strona odpowiedzi */
  back?: string;
  /** Nowa kolekcja dla karty */
  collection_id?: number | null;
}

/** Komenda do utworzenia nowej kolekcji */
export interface CreateCollectionCommand {
  /** Nazwa kolekcji (1-100 znaków) */
  name: string;
}

/** Komenda do aktualizacji kolekcji */
export interface UpdateCollectionCommand {
  /** Nowa nazwa kolekcji (1-100 znaków) */
  name: string;
}

/**
 * ============================================================================
 * RESPONSE DTOs - Struktury danych odbierane z API
 * ============================================================================
 */

/** Podatne ośmiokoła danych dla operacji paginacji */
export interface PaginationDTO {
  /** Numer strony */
  page: number;
  /** Liczba elementów na stronie */
  per_page: number;
  /** Całkowita liczba elementów */
  total: number;
  /** Całkowita liczba stron */
  total_pages: number;
}

/** Wygenerowana kandydat karty z AI - bez metadanych DB */
export type GeneratedFlashcardCandidateDTO = Pick<FlashcardDTO, "front" | "back" | "source">;

/** Odpowiedź z sesji generowania - zawiera wygenerowane karty */
export interface GenerationResponseDTO {
  /** ID utworzonej sesji generowania */
  generation_id: number;
  /** Status przetwarzania */
  status: "completed" | "pending" | "failed";
  /** Użyty model LLM */
  model: string;
  /** Liczba wygenerowanych kandydatów */
  generated_count: number;
  /** Czas przetwarzania w milisekundach */
  generation_duration_ms: number;
  /** Tablica wygenerowanych kandydatów kart */
  flashcards_candidates: GeneratedFlashcardCandidateDTO[];
  /** Komunikat statusu */
  message: string;
}

/** Odpowiedź listy sesji generowania */
export interface GenerationsListResponseDTO {
  /** Tablica sesji generowania */
  generations: GenerationDTO[];
  /** Informacje o paginacji */
  pagination: PaginationDTO;
}

/** Odpowiedź listy flashcards */
export interface FlashcardsListResponseDTO {
  /** Tablica flashcards */
  flashcards: FlashcardDTO[];
  /** Informacje o paginacji */
  pagination: PaginationDTO;
}

/** Odpowiedź z operacji bulk save flashcards */
export interface CreateFlashcardsResponseDTO {
  /** Liczba pomyślnie zapisanych kart */
  saved_count: number;
  /** Tablica zapisanych kart */
  flashcards: FlashcardDTO[];
  /** ID kolekcji do której zostały przypisane */
  collection_id: number | null;
  /** Komunikat potwierdzenia */
  message: string;
}

/** Odpowiedź z aktualizacji flashcard */
export type UpdateFlashcardResponseDTO = Pick<
  FlashcardDTO,
  "id" | "front" | "back" | "source" | "collection_id" | "updated_at"
>;

/** Uniwersalna odpowiedź dla operacji delete */
export interface DeleteResponseDTO {
  /** ID usunięty zasobu */
  id: number;
  /** Komunikat potwierdzenia */
  message: string;
}

/** Kolekcja ze skojarzonymi flashcards */
export interface CollectionWithFlashcardsDTO extends CollectionDTO {
  /** Tablica flashcards w kolekcji */
  flashcards: FlashcardDTO[];
  /** Informacje o paginacji flashcards */
  pagination: PaginationDTO;
}

/** Lista kolekcji z paginacją */
export interface CollectionsListResponseDTO {
  /** Tablica kolekcji */
  collections: CollectionDTO[];
  /** Informacje o paginacji */
  pagination: PaginationDTO;
}

/**
 * Metryki generowania - część analytics
 */
export interface GenerationMetricsDTO {
  /** Całkowita liczba sesji generowania */
  total_generations: number;
  /** Całkowita liczba wygenerowanych kandydatów */
  total_candidates_generated: number;
  /** Całkowita liczba przetworzonych znaków tekstu */
  total_text_characters_processed: number;
  /** Średni czas generowania w ms */
  average_generation_time_ms: number;
}

/**
 * Metryki akceptacji - część analytics
 */
export interface AcceptanceMetricsDTO {
  /** Całkowita liczba zaakceptowanych kandydatów */
  total_accepted: number;
  /** Całkowita liczba odrzuconych kandydatów */
  total_rejected: number;
  /** Liczba zaakceptowanych bez edycji */
  accepted_unedited: number;
  /** Liczba zaakceptowanych z edycją */
  accepted_edited: number;
  /** Wskaźnik akceptacji AI (0-1) */
  ai_acceptance_rate: number;
}

/**
 * Metryki flashcards - część analytics
 */
export interface FlashcardMetricsDTO {
  /** Całkowita liczba flashcards użytkownika */
  total_flashcards: number;
  /** Liczba flashcards utworzonych w danym okresie */
  created_today: number;
  /** Liczba kart generowanych przez AI */
  ai_generated_count: number;
  /** Liczba kart stworzonych ręcznie */
  manual_count: number;
  /** Wskaźnik wykorzystania AI (0-1) */
  ai_usage_rate: number;
}

/**
 * Okres czasu dla analytics
 */
export interface PeriodDTO {
  /** Zakres czasu */
  range: "today" | "week" | "month" | "all";
  /** Data początkowa okresu */
  start_date: string;
  /** Data końcowa okresu */
  end_date: string;
}

/** Pełne analytics - metryki wydajności użytkownika */
export interface AnalyticsDTO {
  /** Informacje o okresie */
  period: PeriodDTO;
  /** Metryki sesji generowania */
  generation_metrics: GenerationMetricsDTO;
  /** Metryki akceptacji kandydatów */
  acceptance_metrics: AcceptanceMetricsDTO;
  /** Metryki flashcards */
  flashcard_metrics: FlashcardMetricsDTO;
}

/**
 * ============================================================================
 * UNIVERZALNE RESPONSE OBIEKTY
 * ============================================================================
 */

/** Generyczna struktura sukcesu API */
export interface ApiSuccessResponse<T = unknown> {
  /** Dane odpowiedzi */
  data: T;
  /** Metadane odpowiedzi */
  meta: {
    /** Timestamp odpowiedzi */
    timestamp: string;
    /** Status */
    status: "success";
  };
}

/** Szczegół błędu walidacji */
export interface ValidationErrorDetail {
  /** Pole z błędem */
  field: string;
  /** Opis błędu */
  message: string;
}

/** Generyczna struktura błędu API */
export interface ApiErrorResponse {
  /** Dane błędu */
  error: {
    /** Kod błędu */
    code: string;
    /** Komunikat błędu */
    message: string;
    /** Szczegóły błędów (np. walidacja) */
    details?: ValidationErrorDetail[];
  };
  /** Metadane odpowiedzi */
  meta: {
    /** Timestamp odpowiedzi */
    timestamp: string;
    /** Status */
    status: "error";
  };
}

/**
 * ============================================================================
 * HELPER TYPES - Typy pomocnicze
 * ============================================================================
 */

/** Możliwe źródła karty */
export type FlashcardSource = "manual" | "ai-full" | "ai-edited";

/** Możliwe statusy generowania */
export type GenerationStatus = "completed" | "pending" | "failed";

/** Kody błędów API */
export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "TEXT_LENGTH_INVALID"
  | "FRONT_LENGTH_INVALID"
  | "BACK_LENGTH_INVALID"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "RESOURCE_NOT_FOUND"
  | "CONFLICT"
  | "UNPROCESSABLE_ENTITY"
  | "RATE_LIMIT_EXCEEDED"
  | "SERVICE_UNAVAILABLE"
  | "GATEWAY_TIMEOUT";
