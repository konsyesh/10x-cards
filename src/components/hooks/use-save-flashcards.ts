import { useState } from "react";
import type {
  CreateFlashcardsCommand,
  CreateFlashcardsResponseDTO,
  CreateFlashcardItemCommand,
  CandidateVM,
} from "@/types";
import { fetchJson, ApiError } from "@/lib/http/http.fetcher";

const BATCH_SIZE = 100;

interface SaveState {
  status: "idle" | "loading" | "success" | "error";
  message?: string;
  savedCount?: number;
  totalBatches?: number;
  currentBatch?: number;
  errorCode?: string;
}

/**
 * Hook do zapisywania flashcards z chunkowaniem do 100 itemów
 * Obsługuje RFC 7807 ProblemDetails błędy
 */
export const useSaveFlashcards = () => {
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

        // Fetch zwraca raw CreateFlashcardsResponseDTO na sukces
        // lub rzuca ApiError na problem+json
        const response = await fetchJson<CreateFlashcardsResponseDTO>("/api/flashcards", {
          method: "POST",
          body: JSON.stringify({
            flashcards: batch,
            collection_id: collectionId,
          } satisfies CreateFlashcardsCommand),
        });

        // RFC 7807: fetchJson zwraca raw DTO na sukces (200/201)
        totalSaved += response.saved_count;
      }

      setState({
        status: "success",
        message: `Pomyślnie zapisano ${totalSaved} fiszek`,
        savedCount: totalSaved,
      });
      return true;
    } catch (err) {
      // Obsługa RFC 7807 błędów
      if (err instanceof ApiError) {
        setState({
          status: "error",
          errorCode: err.problem.code,
          message: err.problem.detail,
        });
        // Meta zawiera diagnostykę (requestId dla supportu)
        // eslint-disable-next-line no-console
        console.error("[useSaveFlashcards] API Error:", {
          code: err.problem.code,
          title: err.problem.title,
          detail: err.problem.detail,
          requestId: err.requestId,
          meta: err.problem.meta,
        });
        return false;
      }

      // Obsługa błędów sieci
      if (err instanceof Error) {
        setState({
          status: "error",
          errorCode: "NETWORK_ERROR",
          message: err.message,
        });
        // eslint-disable-next-line no-console
        console.error("[useSaveFlashcards] Network error:", err.message);
        return false;
      }

      // Unknown error
      setState({
        status: "error",
        errorCode: "UNKNOWN_ERROR",
        message: "Nieznany błąd",
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
