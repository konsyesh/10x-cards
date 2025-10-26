import { createHash } from "crypto";
import type { CreateGenerationCommand, GenerationResponseDTO, GeneratedFlashcardCandidateDTO } from "../../types";
import type { SupabaseClient } from "../../db/supabase.client";

/**
 * Serwis do zarządzania sesją generowania flashcard'ów
 * Zawiera logikę biznesową do tworzenia, aktualizacji i przetwarzania
 * wyników generowania oraz obsługę błędów
 */
export class GenerationService {
  private supabase: SupabaseClient;
  private userId: string;

  constructor(supabase: SupabaseClient, userId: string) {
    this.supabase = supabase;
    this.userId = userId;
  }

  /**
   * Oblicza MD5 hash tekstu źródłowego
   *
   * @param sourceText - Tekst do zahashowania
   * @returns Hex string hash
   */
  private calculateSourceTextHash(sourceText: string): string {
    return createHash("md5").update(sourceText).digest("hex");
  }

  /**
   * Mock serwisu LLM - generuje fikcyjne flashcards na bazie tekstu źródłowego
   * W przyszłości zostanie zastąpiony rzeczywistym serwisem AI
   *
   * @param sourceText - Tekst źródłowy
   * @param _model - Model LLM (na razie ignorowany)
   * @returns Promise<GeneratedFlashcardCandidateDTO[]> - Tablica wygenerowanych kandydatów
   */
  private async generateFlashcardsWithMock(
    sourceText: string,
    _model: string
  ): Promise<GeneratedFlashcardCandidateDTO[]> {
    // Symulacja opóźnienia API
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Liczba znaków jako wskaźnik do liczby generowanych kart
    const charCount = sourceText.length;
    const cardCount = Math.min(Math.max(3, Math.floor(charCount / 200)), 15);

    const mockCards: GeneratedFlashcardCandidateDTO[] = [];

    for (let i = 1; i <= cardCount; i++) {
      mockCards.push({
        front: `Pytanie ${i}: Co to jest temat z tekstu?`,
        back: `Odpowiedź ${i}: To jest wygenerowana zawartość na podstawie analizy tekstu źródłowego (mock).`,
        source: "ai-full" as const,
      });
    }

    return mockCards;
  }

  /**
   * Tworzy nową sesję generowania flashcard'ów
   * Przeprowadza pełny cykl: walidacja → tworzenie rekordu → generowanie → aktualizacja
   *
   * @param command - Komenda zawierająca source_text i model
   * @returns Promise<GenerationResponseDTO> - Odpowiedź z wygenerowanymi kartami
   *
   * @throws Error jeśli operacje bazodanowe się nie powodzą
   *
   * @example
   * const service = new GenerationService(supabase, userId);
   * const response = await service.createGeneration({
   *   source_text: "...",
   *   model: "gpt-4o-mini"
   * });
   */
  async createGeneration(command: CreateGenerationCommand): Promise<GenerationResponseDTO> {
    const { source_text, model } = command;

    // Obliczenie hash i długości tekstu
    const sourceTextHash = this.calculateSourceTextHash(source_text);
    const sourceTextLength = source_text.length;

    // Krok 1: Utworzenie rekordu w tabeli `generations` z statusem "pending"
    const startTime = Date.now();

    const { data: generationRecord, error: createError } = await this.supabase
      .from("generations")
      .insert({
        user_id: this.userId,
        model,
        source_text_hash: sourceTextHash,
        source_text_length: sourceTextLength,
        status: "pending",
        generated_count: 0,
        generation_duration_ms: 0,
      })
      .select()
      .single();

    if (createError || !generationRecord) {
      // eslint-disable-next-line no-console
      console.error("[Generation Service] Database error on create:", createError);
      throw new Error("GENERATION_CREATE_FAILED");
    }

    const generationId = generationRecord.id;

    try {
      // Krok 2: Wywołanie serwisu LLM (mock na tym etapie)
      const flashcardsGenerated = await this.generateFlashcardsWithMock(source_text, model);

      // Krok 3: Walidacja każdego wygenerowanego flashcard'a
      const validatedFlashcards: GeneratedFlashcardCandidateDTO[] = flashcardsGenerated.filter((card) => {
        const frontValid = card.front.length >= 1 && card.front.length <= 200;
        const backValid = card.back.length >= 1 && card.back.length <= 500;

        if (!frontValid || !backValid) {
          // eslint-disable-next-line no-console
          console.warn("[Generation Service] Invalid flashcard filtered out:", card);
        }

        return frontValid && backValid;
      });

      // Obliczenie czasu przetwarzania
      const generationDurationMs = Date.now() - startTime;

      // Krok 4: Aktualizacja rekordu z wynikami
      const { error: updateError } = await this.supabase
        .from("generations")
        .update({
          status: "completed",
          generated_count: validatedFlashcards.length,
          generation_duration_ms: generationDurationMs,
        })
        .eq("id", generationId);

      if (updateError) {
        // eslint-disable-next-line no-console
        console.error("[Generation Service] Database error on update:", updateError);
        throw new Error("GENERATION_UPDATE_FAILED");
      }

      // Krok 5: ZwrócenieResponse
      return {
        generation_id: generationId,
        status: "completed",
        model,
        generated_count: validatedFlashcards.length,
        generation_duration_ms: generationDurationMs,
        flashcards_candidates: validatedFlashcards,
        message: `Wygenerowano ${validatedFlashcards.length} flashcard'ów.`,
      };
    } catch (error) {
      // Obsługa błędów LLM - zaloguj do tabeli i aktualizuj status generowania
      const generationDurationMs = Date.now() - startTime;

      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const errorCode =
        errorMessage === "LLM_SERVICE_UNAVAILABLE" ? "LLM_SERVICE_UNAVAILABLE" : "LLM_GENERATION_FAILED";

      // Zaloguj błąd do `generation_error_logs`
      await this.supabase.from("generation_error_logs").insert({
        user_id: this.userId,
        model,
        source_text_hash: sourceTextHash,
        source_text_length: sourceTextLength,
        error_code: errorCode,
        error_message: errorMessage,
        details: { originalError: String(error) },
      });

      // Zaktualizuj rekord generowania na failed
      await this.supabase
        .from("generations")
        .update({
          status: "failed",
          generation_duration_ms: generationDurationMs,
        })
        .eq("id", generationId);

      throw error;
    }
  }
}
