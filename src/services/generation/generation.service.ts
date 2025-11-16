import { createHash } from "crypto";
import type {
  CreateGenerationCommand,
  GenerationResponseDTO,
  GeneratedFlashcardCandidateDTO,
  AIParameters,
} from "../../types";
import type { SupabaseClient } from "../../db/supabase.client";
import { generationErrors } from "./generation.errors";
import { AIService } from "../ai/ai.service";
import { z } from "zod";

import type { Logger as AIServiceLogger } from "@/services/ai/ai.service";

/**
 * Schemat Zod dla struktury odpowiedzi z AIService
 * Definiuje, jak powinny wyglądać fiszki zwracane przez model LLM
 *
 * @example
 * { flashcards: [{ front: "...", back: "..." }] }
 */
const AIGeneratedFlashcardsSchema = z.object({
  flashcards: z
    .array(
      z.object({
        front: z.string().min(1).max(200),
        back: z.string().min(1).max(500),
      })
    )
    .min(1)
    .max(50),
});

type AIGeneratedFlashcards = z.infer<typeof AIGeneratedFlashcardsSchema>;

/**
 * Serwis do zarządzania sesją generowania flashcard'ów
 * Zawiera logikę biznesową do tworzenia, aktualizacji i przetwarzania
 * wyników generowania oraz obsługę błędów
 */
export class GenerationService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly userId: string,
    private readonly logger?: AIServiceLogger
  ) {}

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
   * FACTORY METHOD: Tworzy i konfiguruje AIService
   *
   * Odpowiedzialność: Instancjacja i inicjalizacja serwisu AI
   * - Tworzenie nowej instancji AIService
   * - Konfiguracja na bazie aiParameters (jeśli dostępne)
   *
   * Pattern: Factory Pattern
   * Korzyści:
   * - Centralne miejsce do tworzenia AIService
   * - Łatwe testowanie (mockowanie)
   * - Przyszłość-proof dla nowych parametrów
   *
   * @param aiParameters - Opcjonalne parametry z request'a (temperature, maxTokens, topP, retryPolicy)
   * @returns Skonfigurowany AIService gotowy do użycia
   *
   * @throws AIServiceError - Jeśli konfiguracja jest nieprawidłowa
   *
   * @example
   * // Bez custom parametrów
   * const service = this.createAIService();
   *
   * @example
   * // Z custom parametrami
   * const service = this.createAIService({
   *   temperature: 0.7,
   *   maxTokens: 2000,
   *   retryPolicy: { maxRetries: 3 }
   * });
   */
  private createAIService(aiParameters?: AIParameters): AIService {
    const aiService = new AIService({ logger: this.logger });

    // Jeśli frontend przesłał custom parametry, aplikujemy je
    if (aiParameters) {
      // Aplikuj parametry modelu (temperature, maxTokens, topP)
      // Warunki sprawdzają czy któryś z parametrów został ustawiony
      if (
        aiParameters.temperature !== undefined ||
        aiParameters.maxTokens !== undefined ||
        aiParameters.topP !== undefined
      ) {
        aiService.setParameters({
          temperature: aiParameters.temperature,
          maxTokens: aiParameters.maxTokens,
          topP: aiParameters.topP,
        });
      }

      // Aplikuj retry policy (jeśli dostępny)
      if (aiParameters.retryPolicy) {
        aiService.setRetryPolicy(aiParameters.retryPolicy);
      }
    }

    return aiService;
  }

  /**
   * PRIVATE METHOD: Generowanie flashcards z AIService
   *
   * Odpowiedzialność:
   * - Przygotowanie system/user prompt
   * - Konfiguracja AIService z schematem
   * - Wywołanie generateObject
   * - Mapowanie wyniku do DTO
   *
   * @param sourceText - Tekst źródłowy do analizy
   * @param model - Nazwa modelu LLM
   * @param aiService - Skonfigurowany AIService
   * @returns Tablica wygenerowanych kandydatów flashcards
   *
   * @throws AIServiceError - Jeśli generowanie się nie powiedzie
   *
   * @example
   * const result = await this.generateFlashcardsWithAI(
   *   "Source text...",
   *   "gpt-4o-mini",
   *   aiService
   * );
   */
  private async generateFlashcardsWithAI(
    sourceText: string,
    model: string,
    aiService: AIService
  ): Promise<GeneratedFlashcardCandidateDTO[]> {
    // System prompt - instrukcje dla modelu
    const systemPrompt = `Jesteś ekspertem do tworzenia fiszek edukacyjnych o najwyższej jakości.

Twoje zadanie to wygenerowanie fiszek na podstawie podanego tekstu źródłowego, które są:
- Jasne i zwięzłe
- Skupione na kluczowych koncepcjach i celach nauczania
- Dobrze ustrukturyzowane dla efektywnego uczenia się
- Wolne od dwuznaczności i redundancji

Reguły:
- Front (pytanie): 1-200 znaków, jasne pytanie lub sformułowanie
- Back (odpowiedź): 1-500 znaków, kompleksowa ale zwięzła odpowiedź
- Wyjście MUSI być poprawnym JSON zgodnym ze schematem
- Nigdy nie dołączaj metadanych, komentarzy ani wyjaśnień
- Wygeneruj między 3-15 fiszkach w zależności od długości i złożoności tekstu
- Skupiaj się na wiedzy praktycznej, nie na trywialnych szczegółach`;

    // User prompt - tekst do analizy
    const userPrompt = `Wygeneruj wysokiej jakości fiszki z następującego tekstu:\n\n${sourceText}`;

    // Konfiguracja AIService i wygenerowanie wyniku
    const result = await aiService
      .setModel(model)
      .setSystemPrompt(systemPrompt)
      .setUserPrompt(userPrompt)
      .setSchema(AIGeneratedFlashcardsSchema)
      .generateObject<AIGeneratedFlashcards>();

    // Mapuj wynik na GeneratedFlashcardCandidateDTO z domyślnym source: "ai-full"
    return result.flashcards.map((card) => ({
      front: card.front,
      back: card.back,
      source: "ai-full" as const,
    }));
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
   * Architektura:
   * - Krok 1: Tworzenie rekordu w DB z statusem "pending"
   * - Krok 2: Konfiguracja AIService za pomocą factory method (z custom parametrami jeśli dostępne)
   * - Krok 3: Generowanie flashcards (AI lub mock jako fallback)
   * - Krok 4: Walidacja wygenerowanych kart
   * - Krok 5: Zapis rezultatów do DB
   * - Krok 6: Zwrócenie response DTO
   *
   * @param command - CreateGenerationCommand zawierająca source_text, model i opcjonalne aiParameters
   * @returns Promise<GenerationResponseDTO> - Odpowiedź z wygenerowanymi kartami
   * @throws Błędy z ERROR_REGISTRY - Jeśli operacje się nie powodzą
   *
   * @example
   * const service = new GenerationService(supabase, userId);
   * const response = await service.createGeneration({
   *   source_text: "...",
   *   model: "gpt-4o-mini",
   *   aiParameters: { temperature: 0.7 }
   * });
   */
  async createGeneration(command: CreateGenerationCommand): Promise<GenerationResponseDTO> {
    const { source_text, model, aiParameters } = command;

    // Obliczenie hash i długości tekstu
    const sourceTextHash = this.calculateSourceTextHash(source_text);
    const sourceTextLength = source_text.length;

    // Krok 1: Utworzenie rekordu w tabeli `generations` z statusem "pending"
    const startTime = Date.now();

    this.logger?.info("Generation record insert start", {
      userId: this.userId,
      model,
      sourceTextLength,
    });

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
      this.logger?.error("Generation record insert failed", { error: createError });
      throw generationErrors.creators.ProviderError({
        detail: "Failed to create generation record",
        meta: { error: createError?.message },
        cause: createError,
      });
    }

    const generationId = generationRecord.id;

    try {
      // Krok 2: Konfiguracja AIService za pomocą factory method
      // Factory zajmuje się konfiguracją na bazie aiParameters
      const aiService = this.createAIService(aiParameters);

      // Krok 3: Generowanie flashcards (AI lub mock jako fallback)
      let flashcardsGenerated: GeneratedFlashcardCandidateDTO[];

      try {
        // Próba użycia AIService do generowania
        this.logger?.info("AI generation attempt", { generationId, model });
        flashcardsGenerated = await this.generateFlashcardsWithAI(source_text, model, aiService);
      } catch (aiError) {
        // Fallback na mock jeśli AIService się nie powiedzie
        this.logger?.warn("AI generation failed, falling back to mock", { error: aiError });
        flashcardsGenerated = await this.generateFlashcardsWithMock(source_text, model);
      }

      // Krok 4: Walidacja każdego wygenerowanego flashcard'a
      const validatedFlashcards: GeneratedFlashcardCandidateDTO[] = flashcardsGenerated.filter((card) => {
        const frontValid = card.front.length >= 1 && card.front.length <= 200;
        const backValid = card.back.length >= 1 && card.back.length <= 500;

        if (!frontValid || !backValid) {
          this.logger?.warn("Invalid flashcard filtered out", {
            generationId,
            frontLength: card.front.length,
            backLength: card.back.length,
          });
        }

        return frontValid && backValid;
      });

      // Obliczenie czasu przetwarzania
      const generationDurationMs = Date.now() - startTime;

      // Krok 5: Aktualizacja rekordu z wynikami
      const { error: updateError } = await this.supabase
        .from("generations")
        .update({
          status: "completed",
          generated_count: validatedFlashcards.length,
          generation_duration_ms: generationDurationMs,
        })
        .eq("id", generationId);

      if (updateError) {
        this.logger?.error("Generation record update failed", { generationId, error: updateError });
        throw generationErrors.creators.ProviderError({
          detail: "Failed to update generation record",
          meta: { error: updateError?.message },
          cause: updateError,
        });
      }

      // Krok 6: Zwrócenie Response DTO
      const response: GenerationResponseDTO = {
        generation_id: generationId,
        status: "completed",
        model,
        generated_count: validatedFlashcards.length,
        generation_duration_ms: generationDurationMs,
        flashcards_candidates: validatedFlashcards,
        message: `Wygenerowano ${validatedFlashcards.length} flashcard'ów.`,
      };

      this.logger?.info("Generation completed", {
        generationId,
        cardCount: validatedFlashcards.length,
        durationMs: generationDurationMs,
      });

      return response;
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

      this.logger?.error("Generation failed", {
        generationId,
        durationMs: generationDurationMs,
        error,
      });

      throw error;
    }
  }
}
