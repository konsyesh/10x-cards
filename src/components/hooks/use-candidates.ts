import { useState, useCallback } from "react";
import type { CandidateVM, TotalsSummary } from "@/types";

const FRONT_MAX = 200;
const BACK_MAX = 500;

/**
 * Waliduje długości pól front/back
 */
const validateCandidate = (candidate: CandidateVM): CandidateVM => {
  const frontError = candidate.front.length > FRONT_MAX ? `Maksimum ${FRONT_MAX} znaków` : undefined;
  const backError = candidate.back.length > BACK_MAX ? `Maksimum ${BACK_MAX} znaków` : undefined;

  return {
    ...candidate,
    validation: { frontError, backError },
  };
};

/**
 * Hook do zarządzania kandydatami z akcjami accept/reject/edit
 */
export const useCandidates = (initialCandidates: CandidateVM[] = []) => {
  const [candidates, setCandidates] = useState<CandidateVM[]>(initialCandidates.map(validateCandidate));

  const getTotals = useCallback((): TotalsSummary => {
    return {
      accepted: candidates.filter((c) => c.decision === "accepted").length,
      rejected: candidates.filter((c) => c.decision === "rejected").length,
      edited: candidates.filter((c) => c.decision === "accepted" && c.source === "ai-edited").length,
    };
  }, [candidates]);

  const accept = useCallback((localId: string) => {
    setCandidates((prev) => prev.map((c) => (c.localId === localId ? { ...c, decision: "accepted" as const } : c)));
  }, []);

  const reject = useCallback((localId: string) => {
    setCandidates((prev) => prev.map((c) => (c.localId === localId ? { ...c, decision: "rejected" as const } : c)));
  }, []);

  const updateField = useCallback((localId: string, field: "front" | "back", value: string) => {
    setCandidates((prev) =>
      prev.map((c) => {
        if (c.localId !== localId) return c;

        const updated = {
          ...c,
          [field]: value,
          isDirty: true,
          source: "ai-edited" as const,
          decision: c.decision === "pending" ? ("pending" as const) : c.decision,
        };

        return validateCandidate(updated);
      })
    );
  }, []);

  const undo = useCallback((localId: string) => {
    setCandidates((prev) =>
      prev.map((c) => {
        if (c.localId !== localId) return c;

        return {
          ...c,
          front: c.original.front,
          back: c.original.back,
          source: "ai-full" as const,
          isDirty: false,
          decision: "pending" as const,
          validation: {},
        };
      })
    );
  }, []);

  const clear = useCallback(() => {
    setCandidates([]);
  }, []);

  const getAcceptedOnly = useCallback((): CandidateVM[] => {
    return candidates.filter((c) => c.decision === "accepted" && !c.validation.frontError && !c.validation.backError);
  }, [candidates]);

  const acceptAll = useCallback(() => {
    setCandidates((prev) => prev.map((c) => (c.decision !== "rejected" ? { ...c, decision: "accepted" as const } : c)));
  }, []);

  return {
    candidates,
    setCandidates,
    accept,
    reject,
    updateField,
    undo,
    clear,
    getTotals,
    getAcceptedOnly,
    acceptAll,
  };
};
