import { useState } from "react";
import type {
  CreateFlashcardsCommand,
  CreateFlashcardsResponseDTO,
  CreateFlashcardItemCommand,
  CandidateVM,
} from "@/types";
import { useApi } from "./use-api";

const BATCH_SIZE = 100;

interface SaveState {
  status: "idle" | "loading" | "success" | "error";
  message?: string;
  savedCount?: number;
  totalBatches?: number;
  currentBatch?: number;
}

/**
 * Hook do zapisywania flashcards z chunkowaniem do 100 itemów
 */
export const useSaveFlashcards = () => {
  const { fetchJson } = useApi();
  const [state, setState] = useState<SaveState>({ status: "idle" });

  const saveFlashcards = async (candidates: CandidateVM[], collectionId: number | null = null): Promise<boolean> => {
    if (candidates.length === 0) {
      setState({
        status: "error",
        message: "Brak kart do zapisania",
      });
      return false;
    }

    setState({ status: "loading" });

    // Chunking do 100 itemów na żądanie
    const batches: CreateFlashcardItemCommand[][] = [];
    for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
      const batch = candidates.slice(i, i + BATCH_SIZE).map((c) => ({
        front: c.front,
        back: c.back,
        source: c.source,
        generation_id: c.generation_id,
      }));
      batches.push(batch);
    }

    let totalSaved = 0;

    try {
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        setState({
          status: "loading",
          totalBatches: batches.length,
          currentBatch: i + 1,
          message: `Zapisuję partię ${i + 1} z ${batches.length}...`,
        });

        const result = await fetchJson<CreateFlashcardsResponseDTO>("/api/flashcards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: {
            flashcards: batch,
            collection_id: collectionId,
          } satisfies CreateFlashcardsCommand,
        });

        if (!result.success) {
          setState({
            status: "error",
            message: result.error.error.message || "Błąd zapisywania",
          });
          return false;
        }

        totalSaved += result.data.saved_count;
      }

      setState({
        status: "success",
        message: `Pomyślnie zapisano ${totalSaved} fiszek`,
        savedCount: totalSaved,
      });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Nieznany błąd";
      setState({
        status: "error",
        message,
      });
      return false;
    }
  };

  const reset = () => {
    setState({ status: "idle" });
  };

  return {
    state,
    saveFlashcards,
    reset,
  };
};
