import type { SupabaseClient } from "../../db/supabase.client";
import type { CreateFlashcardsCommand, FlashcardDTO } from "../../types";
import { GenerationNotFoundError, CollectionNotFoundError, CollectionAccessError } from "../errors/flashcard.errors";

/**
 * Serwis do obsługi operacji flashcard'ów
 * Odpowiada za logikę biznesową: walidację referencji, batch insert i aktualizację metryki
 */
export class FlashcardService {
  constructor(
    private supabase: SupabaseClient,
    private userId: string
  ) {}

  /**
   * Tworzy fiszki na podstawie komendy
   * - Waliduje referencje do generations i collections
   * - Wykonuje batch insert
   * - Aktualizuje liczniki akceptacji w generations
   */
  async createFlashcards(command: CreateFlashcardsCommand): Promise<FlashcardDTO[]> {
    // Guard: Jeśli generation_id podany, sprawdzić referencje
    if (command.flashcards.some((f) => f.generation_id)) {
      await this.validateGenerationReferences(command.flashcards);
    }

    // Guard: Jeśli collection_id podany, sprawdzić dostęp
    if (command.collection_id) {
      await this.validateCollectionAccess(command.collection_id);
    }

    // Przygotowanie danych do wstawienia
    const flashcardsToInsert = command.flashcards.map((f) => ({
      front: f.front,
      back: f.back,
      source: f.source,
      generation_id: f.generation_id ?? null,
      collection_id: command.collection_id ?? null,
      user_id: this.userId,
    }));

    // Batch insert
    const { data: savedFlashcards, error: insertError } = await this.supabase
      .from("flashcards")
      .insert(flashcardsToInsert)
      .select();

    if (insertError || !savedFlashcards) {
      throw new Error(`Failed to save flashcards: ${insertError?.message}`);
    }

    // Warunkowa aktualizacja metryki generations (liczniki akceptacji)
    await this.updateGenerationMetrics(command.flashcards);

    return savedFlashcards;
  }

  /**
   * Waliduje czy generations do których odwołują się fiszki należą do użytkownika
   */
  private async validateGenerationReferences(flashcards: any[]): Promise<void> {
    // Deduplikacja - tylko unikalne generation_id
    const generationIds = [...new Set(flashcards.map((f) => f.generation_id).filter(Boolean))];

    if (generationIds.length === 0) return;

    // Batch query - sprawdzenie wszystkich naraz
    const { data, error } = await this.supabase.from("generations").select("id, user_id").in("id", generationIds);

    if (error) throw error;

    const generationMap = new Map(data?.map((g) => [g.id, g]) ?? []);

    // Sprawdzenie każdej generacji
    for (const genId of generationIds) {
      const generation = generationMap.get(genId);

      // Jeśli nie znaleziono lub należy do innego użytkownika → 404 (nie ujawniać informacji)
      if (!generation || generation.user_id !== this.userId) {
        throw new GenerationNotFoundError(genId);
      }
    }
  }

  /**
   * Waliduje czy użytkownik ma dostęp do kolekcji
   */
  private async validateCollectionAccess(collectionId: number): Promise<void> {
    const { data, error } = await this.supabase
      .from("collections")
      .select("id, user_id")
      .eq("id", collectionId)
      .single();

    if (error || !data) {
      throw new CollectionNotFoundError(collectionId);
    }

    if (data.user_id !== this.userId) {
      throw new CollectionAccessError();
    }
  }

  /**
   * Aktualizuje liczniki akceptacji w generations
   * - `accepted_unedited_count` dla source='ai-full'
   * - `accepted_edited_count` dla source='ai-edited'
   */
  private async updateGenerationMetrics(flashcards: any[]): Promise<void> {
    // Zgromadź liczniki per generation_id + source
    const updates: Record<string, { unedited: number; edited: number }> = {};

    for (const f of flashcards) {
      if (!f.generation_id) continue;

      if (!updates[f.generation_id]) {
        updates[f.generation_id] = { unedited: 0, edited: 0 };
      }

      if (f.source === "ai-full") {
        updates[f.generation_id].unedited++;
      } else if (f.source === "ai-edited") {
        updates[f.generation_id].edited++;
      }
    }

    // Wykonaj updates dla każdej generation
    for (const [genId, counts] of Object.entries(updates)) {
      if (counts.unedited > 0) {
        const { error } = await this.supabase
          .from("generations")
          .update({
            accepted_unedited_count: this.supabase.raw(`accepted_unedited_count + ${counts.unedited}`),
          })
          .eq("id", parseInt(genId));

        if (error) {
          console.error(`[FlashcardService] Error updating accepted_unedited_count for generation ${genId}:`, error);
        }
      }

      if (counts.edited > 0) {
        const { error } = await this.supabase
          .from("generations")
          .update({
            accepted_edited_count: this.supabase.raw(`accepted_edited_count + ${counts.edited}`),
          })
          .eq("id", parseInt(genId));

        if (error) {
          console.error(`[FlashcardService] Error updating accepted_edited_count for generation ${genId}:`, error);
        }
      }
    }
  }
}
