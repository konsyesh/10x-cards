import type { SupabaseClient } from "../../db/supabase.client";
import type {
  CreateFlashcardsCommand,
  FlashcardDTO,
  CreateFlashcardItemCommand,
  ListFlashcardsQuery,
  UpdateFlashcardCommand,
  UpdateFlashcardResponseDTO,
  DeleteResponseDTO,
  PaginationDTO,
} from "../../types";
import type { FlashcardRow } from "../../types";
import { flashcardErrors } from "./flashcard.errors";
import { fromSupabase } from "@/lib/errors/map-supabase";

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
   * Pobiera surowy rekord flashcard z DB i wyrzuca NotFound jeśli nie istnieje
   */
  private async fetchFlashcardRow(id: number): Promise<FlashcardRow> {
    const { data, error } = await this.supabase
      .from("flashcards")
      .select("*")
      .eq("id", id)
      .eq("user_id", this.userId)
      .single();

    if (error || !data) {
      throw flashcardErrors.creators.NotFound({
        detail: `Flashcard ${id} not found`,
        meta: { flashcardId: id },
        cause: error,
      });
    }

    return data as FlashcardRow;
  }

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

    if (insertError) {
      throw fromSupabase(insertError as any);
    }

    if (!savedFlashcards) {
      throw flashcardErrors.creators.DatabaseError({
        detail: "Failed to save flashcards: unknown error",
      });
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

    if (error) {
      throw flashcardErrors.creators.DatabaseError({
        detail: `Failed to validate generation references: ${error.message}`,
        meta: { generationIds },
        cause: error,
      });
    }

    const generationMap = new Map(data?.map((g) => [g.id, g]) ?? []);

    // Sprawdzenie każdej generacji
    for (const genId of generationIds) {
      const generation = generationMap.get(genId);

      // Jeśli nie znaleziono lub należy do innego użytkownika → 404 (nie ujawniać informacji)
      if (!generation || generation.user_id !== this.userId) {
        throw flashcardErrors.creators.GenerationNotFound({
          detail: `Generation ${genId} not found or access denied`,
          meta: { generationId: genId },
        });
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
      throw flashcardErrors.creators.CollectionNotFound({
        detail: `Collection ${collectionId} not found`,
        meta: { collectionId },
      });
    }

    if (data.user_id !== this.userId) {
      throw flashcardErrors.creators.CollectionAccessDenied({
        detail: `Access denied to collection ${collectionId}`,
        meta: { collectionId },
      });
    }
  }

  /**
   * Listuje flashcards z filtrowaniem, sortowaniem i paginacją
   *
   * @param query - ListFlashcardsQuery z parametrami filtrowania i paginacji
   * @returns Obiekt z flashcards i paginacją
   */
  async listFlashcards(query: ListFlashcardsQuery): Promise<{ flashcards: FlashcardDTO[]; pagination: PaginationDTO }> {
    const page = query.page ?? 1;
    const perPage = query.per_page ?? 20;
    const sort = query.sort ?? "created_at";
    const order = query.order ?? "desc";

    // Buduj query z filtrowaniem po user_id (wymagane)
    let supabaseQuery = this.supabase.from("flashcards").select("*", { count: "exact" }).eq("user_id", this.userId);

    // Filtrowanie po collection_id (jeśli podane)
    if (query.collection_id !== undefined) {
      supabaseQuery = supabaseQuery.eq("collection_id", query.collection_id);
    }

    // Filtrowanie po source (jeśli podane)
    if (query.source) {
      supabaseQuery = supabaseQuery.eq("source", query.source);
    }

    // Full-text search w front/back (jeśli podane)
    if (query.search) {
      const searchPattern = `%${query.search}%`;
      supabaseQuery = supabaseQuery.or(`front.ilike.${searchPattern},back.ilike.${searchPattern}`);
    }

    // Sortowanie
    supabaseQuery = supabaseQuery.order(sort, { ascending: order === "asc" });

    // Paginacja
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    supabaseQuery = supabaseQuery.range(from, to);

    const { data, error, count } = await supabaseQuery;

    if (error) {
      throw fromSupabase(error as any);
    }

    const flashcards = (data as FlashcardRow[]) ?? [];
    const total = count ?? 0;
    const totalPages = Math.ceil(total / perPage);

    return {
      flashcards: this.mapToFlashcardDTOs(flashcards),
      pagination: {
        page,
        per_page: perPage,
        total,
        total_pages: totalPages,
      },
    };
  }

  /**
   * Pobiera pojedynczą flashcard po ID
   *
   * @param id - ID flashcard
   * @returns FlashcardDTO
   * @throws flashcardErrors.creators.NotFound jeśli nie znaleziono lub należy do innego użytkownika
   */
  async getFlashcardById(id: number): Promise<FlashcardDTO> {
    const flashcard = await this.fetchFlashcardRow(id);
    return this.mapToFlashcardDTO(flashcard);
  }

  /**
   * Aktualizuje flashcard
   *
   * @param id - ID flashcard
   * @param command - UpdateFlashcardCommand z polami do aktualizacji
   * @returns UpdateFlashcardResponseDTO
   * @throws flashcardErrors.creators.NotFound jeśli nie znaleziono lub należy do innego użytkownika
   */
  async updateFlashcard(id: number, command: UpdateFlashcardCommand): Promise<UpdateFlashcardResponseDTO> {
    // Walidacja collection_id (jeśli podany)
    if (command.collection_id !== undefined && command.collection_id !== null) {
      await this.validateCollectionAccess(command.collection_id);
    }

    const existingFlashcard = await this.fetchFlashcardRow(id);

    // Przygotuj update object (tylko podane pola)
    const updateData: Partial<FlashcardRow> = {};
    if (command.front !== undefined) {
      updateData.front = command.front;
    }
    if (command.back !== undefined) {
      updateData.back = command.back;
    }
    if (command.collection_id !== undefined) {
      updateData.collection_id = command.collection_id;
    }

    const shouldConvertToEdited = this.shouldConvertToEditedSource(existingFlashcard, command);
    if (shouldConvertToEdited) {
      updateData.source = "ai-edited";
    }

    const { data, error } = await this.supabase
      .from("flashcards")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", this.userId)
      .select()
      .single();

    if (error || !data) {
      throw flashcardErrors.creators.NotFound({
        detail: `Flashcard ${id} not found`,
        meta: { flashcardId: id },
        cause: error,
      });
    }

    if (shouldConvertToEdited) {
      await this.updateGenerationMetricsForEdit(existingFlashcard.generation_id);
    }

    const updated = data as FlashcardRow;
    return {
      id: updated.id,
      front: updated.front,
      back: updated.back,
      source: updated.source,
      collection_id: updated.collection_id,
      updated_at: updated.updated_at,
    };
  }

  /**
   * Usuwa flashcard
   *
   * @param id - ID flashcard
   * @returns DeleteResponseDTO
   * @throws flashcardErrors.creators.NotFound jeśli nie znaleziono lub należy do innego użytkownika
   */
  async deleteFlashcard(id: number): Promise<DeleteResponseDTO> {
    const existingFlashcard = await this.fetchFlashcardRow(id);

    const { data, error } = await this.supabase
      .from("flashcards")
      .delete()
      .eq("id", id)
      .eq("user_id", this.userId)
      .select()
      .single();

    if (error || !data) {
      throw flashcardErrors.creators.NotFound({
        detail: `Flashcard ${id} not found`,
        meta: { flashcardId: id },
        cause: error,
      });
    }

    await this.updateGenerationMetricsForDeletion(existingFlashcard);

    return {
      id,
      message: "Flashcard successfully deleted",
    };
  }

  /**
   * Mapuje FlashcardRow[] na FlashcardDTO[] (przycięte pola)
   */
  private mapToFlashcardDTOs(rows: FlashcardRow[]): FlashcardDTO[] {
    return rows.map((row) => this.mapToFlashcardDTO(row));
  }

  /**
   * Mapuje FlashcardRow na FlashcardDTO (przycięte pola)
   */
  private mapToFlashcardDTO(row: FlashcardRow): FlashcardDTO {
    return {
      id: row.id,
      front: row.front,
      back: row.back,
      source: row.source,
      generation_id: row.generation_id,
      collection_id: row.collection_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
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
      await this.adjustGenerationCount(generationIdNum, {
        uneditedDelta: counts.unedited,
        editedDelta: counts.edited,
      });
    }
  }

  /**
   * Modyfikuje liczniki generacji o zadany delta (może być ujemny)
   */
  private async adjustGenerationCount(
    generationId: number,
    adjustments: { uneditedDelta?: number; editedDelta?: number }
  ): Promise<void> {
    const { uneditedDelta = 0, editedDelta = 0 } = adjustments;
    if (!generationId || (uneditedDelta === 0 && editedDelta === 0)) {
      return;
    }

    const { data, error: selectError } = await this.supabase
      .from("generations")
      .select("accepted_unedited_count, accepted_edited_count")
      .eq("id", generationId)
      .single();

    if (selectError || !data) {
      // eslint-disable-next-line no-console
      console.error(`[FlashcardService] Error reading generation ${generationId}:`, selectError);
      return;
    }
    // Oblicz nowe wartości: jeśli null to 0, inaczej aktualna + increment
    const newUneditedCount = Math.max(0, (data.accepted_unedited_count ?? 0) + uneditedDelta);
    const newEditedCount = Math.max(0, (data.accepted_edited_count ?? 0) + editedDelta);
    // Zaktualizuj obie kolumny naraz
    const { error: updateError } = await this.supabase
      .from("generations")
      .update({
        accepted_unedited_count: newUneditedCount,
        accepted_edited_count: newEditedCount,
      })
      .eq("id", generationId);

    if (updateError) {
      // eslint-disable-next-line no-console
      console.error(`[FlashcardService] Error updating generation ${generationId}:`, updateError);
    }
  }

  /**
   * Sprawdza, czy źródło powinno zostać przeklasyfikowane na ai-edited
   */
  private shouldConvertToEditedSource(existing: FlashcardRow, command: UpdateFlashcardCommand): boolean {
    if (existing.source !== "ai-full") {
      return false;
    }

    const frontChanged = command.front !== undefined && command.front !== existing.front;
    const backChanged = command.back !== undefined && command.back !== existing.back;

    return frontChanged || backChanged;
  }

  /**
   * Aktualizuje metryki generations po przeklasyfikowaniu karty na ai-edited
   */
  private async updateGenerationMetricsForEdit(generationId: number | null): Promise<void> {
    if (!generationId) {
      return;
    }

    await this.adjustGenerationCount(generationId, {
      uneditedDelta: -1,
      editedDelta: 1,
    });
  }

  /**
   * Aktualizuje metryki generations po usunięciu karty
   */
  private async updateGenerationMetricsForDeletion(flashcard: FlashcardRow): Promise<void> {
    const generationId = flashcard.generation_id;
    if (!generationId) {
      return;
    }

    if (flashcard.source === "ai-full") {
      await this.adjustGenerationCount(generationId, { uneditedDelta: -1 });
      return;
    }

    if (flashcard.source === "ai-edited") {
      await this.adjustGenerationCount(generationId, { editedDelta: -1 });
    }
  }
}
