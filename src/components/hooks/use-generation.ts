import { useState } from "react";
import type { GenerationResponseDTO, CandidateVM, GenerationState, ApiErrorCode } from "@/types";
import { useApi } from "./use-api";

/**
 * Hook do obsługi generowania kandydatów przez AI
 */
export const useGeneration = () => {
  const { fetchJson } = useApi();
  const [state, setState] = useState<GenerationState>({ status: "idle" });

  const generate = async (sourceText: string): Promise<CandidateVM[] | null> => {
    setState({ status: "loading" });

    const result = await fetchJson<GenerationResponseDTO>("/api/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: {
        source_text: sourceText,
        model: "gpt-4o-mini",
      },
    });

    if (!result.success) {
      const code = result.error.error.code as ApiErrorCode;
      setState({
        status: "error",
        errorCode: code,
        message: result.error.error.message,
      });
      return null;
    }

    const { data } = result;
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
