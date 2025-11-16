import type { SupabaseClient } from "../../db/supabase.client";
import type { CreateFlashcardsCommand, FlashcardDTO, CreateFlashcardItemCommand } from "../../types";
import type { FlashcardRow } from "../../types";
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
   *
   * @param command - CreateFlashcardsCommand zawierająca tablicę kart i collection_id
   * @returns Tablica zapisanych FlashcardDTO (przycięta, bezpieczna)
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

    // Mapuj FlashcardRow[] na FlashcardDTO[]
    return this.mapToFlashcardDTOs(savedFlashcards as FlashcardRow[]);
  }

  /**
   * Waliduje czy generations do których odwołują się fiszki należą do użytkownika
   */
  private async validateGenerationReferences(flashcards: CreateFlashcardItemCommand[]): Promise<void> {
    // Deduplikacja - tylko unikalne generation_id (filter out null/undefined)
    const generationIds = [...new Set(flashcards.map((f) => f.generation_id).filter((id): id is number => id != null))];

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
   * Mapuje FlashcardRow[] na FlashcardDTO[] (przycięte pola)
   */
  private mapToFlashcardDTOs(rows: FlashcardRow[]): FlashcardDTO[] {
    return rows.map((row) => ({
      id: row.id,
      front: row.front,
      back: row.back,
      source: row.source,
      generation_id: row.generation_id,
      collection_id: row.collection_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  }

  /**
   * Aktualizuje liczniki akceptacji w generations
   * - `accepted_unedited_count` dla source='ai-full'
   * - `accepted_edited_count` dla source='ai-edited'
   */
  private async updateGenerationMetrics(flashcards: CreateFlashcardItemCommand[]): Promise<void> {
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
      const generationIdNum = parseInt(genId, 10);

      // Odczytaj aktualną wartość obu liczników
      const { data, error: selectError } = await this.supabase
        .from("generations")
        .select("accepted_unedited_count, accepted_edited_count")
        .eq("id", generationIdNum)
        .single();

      if (selectError || !data) {
        // eslint-disable-next-line no-console
        console.error(`[FlashcardService] Error reading generation ${generationIdNum}:`, selectError);
        continue;
      }

      // Oblicz nowe wartości: jeśli null to 0, inaczej aktualna + increment
      const newUneditedCount = (data.accepted_unedited_count ?? 0) + counts.unedited;
      const newEditedCount = (data.accepted_edited_count ?? 0) + counts.edited;

      // Zaktualizuj obie kolumny naraz
      const { error: updateError } = await this.supabase
        .from("generations")
        .update({
          accepted_unedited_count: newUneditedCount,
          accepted_edited_count: newEditedCount,
        })
        .eq("id", generationIdNum);

      if (updateError) {
        // eslint-disable-next-line no-console
        console.error(`[FlashcardService] Error updating generation ${generationIdNum}:`, updateError);
      }
    }
  }
}
