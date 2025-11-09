import { useState } from "react";
import type { GenerationResponseDTO, CandidateVM, GenerationState } from "@/types";
import { useApi } from "./use-api";

/**
 * Hook do obsługi generowania kandydatów przez AI
 * Obsługuje RFC 7807 ProblemDetails błędy
 */
export const useGeneration = () => {
  const { fetchJson, ApiError } = useApi();
  const [state, setState] = useState<GenerationState>({ status: "idle" });

  const generate = async (sourceText: string): Promise<CandidateVM[] | null> => {
    setState({ status: "loading" });

    try {
      // Fetch zwraca raw GenerationResponseDTO na sukces
      // lub rzuca ApiError na problem+json
      const data = await fetchJson<GenerationResponseDTO>("/api/generations", {
        method: "POST",
        body: JSON.stringify({
          source_text: sourceText,
          model: "gpt-4o-mini",
        }),
      });

      // Mapuj wygenerowanych kandydatów na ViewModel
      const candidates: CandidateVM[] = data.flashcards_candidates.map((candidate) => ({
        localId: crypto.randomUUID(),
        original: {
          front: candidate.front,
          back: candidate.back,
          source: "ai-full",
        },
        front: candidate.front,
        back: candidate.back,
        source: "ai-full",
        generation_id: data.generation_id,
        decision: "pending",
        validation: {},
        isDirty: false,
      }));

      setState({
        status: "completed",
        message: data.message,
        meta: {
          generationId: data.generation_id,
          durationMs: data.generation_duration_ms,
          generatedCount: data.generated_count,
        },
      });

      return candidates;
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
        console.error("[useGeneration] API Error:", {
          code: err.problem.code,
          title: err.problem.title,
          detail: err.problem.detail,
          requestId: err.requestId,
          meta: err.problem.meta,
        });
        return null;
      }

      // Obsługa błędów sieci
      if (err instanceof Error) {
        setState({
          status: "error",
          errorCode: "NETWORK_ERROR",
          message: err.message,
        });
        // eslint-disable-next-line no-console
        console.error("[useGeneration] Network error:", err.message);
        return null;
      }

      // Unknown error
      setState({
        status: "error",
        errorCode: "UNKNOWN_ERROR",
        message: "Unknown error occurred",
      });
      return null;
    }
  };

  const retry = async (sourceText: string): Promise<CandidateVM[] | null> => {
    return generate(sourceText);
  };

  const reset = () => {
    setState({ status: "idle" });
  };

  return {
    state,
    generate,
    retry,
    reset,
  };
};
