import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCandidates } from "../use-candidates";
import { createMockCandidateVM, createMockCandidates } from "@/tests/helpers";

describe("useCandidates", () => {
  describe("initialization", () => {
    it("should initialize with empty array by default", () => {
      const { result } = renderHook(() => useCandidates());

      expect(result.current.candidates).toHaveLength(0);
      expect(result.current.getTotals()).toEqual({
        accepted: 0,
        rejected: 0,
        edited: 0,
      });
    });

    it("should initialize with provided candidates", () => {
      const initialCandidates = createMockCandidates(3);
      const { result } = renderHook(() => useCandidates(initialCandidates));

      expect(result.current.candidates).toHaveLength(3);
    });

    it("should validate candidates on initialization", () => {
      const candidateWithLongFront = createMockCandidateVM({
        front: "a".repeat(201), // Exceeds FRONT_MAX (200)
      });
      const { result } = renderHook(() => useCandidates([candidateWithLongFront]));

      expect(result.current.candidates[0].validation.frontError).toBe("Maksimum 200 znaków");
    });
  });

  describe("accept", () => {
    it("should change decision to accepted", () => {
      const candidate = createMockCandidateVM({ decision: "pending" });
      const { result } = renderHook(() => useCandidates([candidate]));

      act(() => {
        result.current.accept(candidate.localId);
      });

      expect(result.current.candidates[0].decision).toBe("accepted");
    });

    it("should only accept candidate with matching localId", () => {
      const candidates = createMockCandidates(2);
      const { result } = renderHook(() => useCandidates(candidates));

      act(() => {
        result.current.accept(candidates[0].localId);
      });

      expect(result.current.candidates[0].decision).toBe("accepted");
      expect(result.current.candidates[1].decision).toBe("pending");
    });
  });

  describe("reject", () => {
    it("should change decision to rejected", () => {
      const candidate = createMockCandidateVM({ decision: "pending" });
      const { result } = renderHook(() => useCandidates([candidate]));

      act(() => {
        result.current.reject(candidate.localId);
      });

      expect(result.current.candidates[0].decision).toBe("rejected");
    });
  });

  describe("updateField", () => {
    it("should update front field", () => {
      const candidate = createMockCandidateVM({
        front: "Original Question?",
        back: "Original Answer",
      });
      const { result } = renderHook(() => useCandidates([candidate]));

      act(() => {
        result.current.updateField(candidate.localId, "front", "Updated Question?");
      });

      expect(result.current.candidates[0].front).toBe("Updated Question?");
      expect(result.current.candidates[0].isDirty).toBe(true);
      expect(result.current.candidates[0].source).toBe("ai-edited");
    });

    it("should update back field", () => {
      const candidate = createMockCandidateVM({
        front: "Original Question?",
        back: "Original Answer",
      });
      const { result } = renderHook(() => useCandidates([candidate]));

      act(() => {
        result.current.updateField(candidate.localId, "back", "Updated Answer");
      });

      expect(result.current.candidates[0].back).toBe("Updated Answer");
      expect(result.current.candidates[0].isDirty).toBe(true);
      expect(result.current.candidates[0].source).toBe("ai-edited");
    });

    it("should validate front field length (FRONT_MAX=200)", () => {
      const candidate = createMockCandidateVM();
      const { result } = renderHook(() => useCandidates([candidate]));

      act(() => {
        result.current.updateField(candidate.localId, "front", "a".repeat(201));
      });

      expect(result.current.candidates[0].validation.frontError).toBe("Maksimum 200 znaków");
      expect(result.current.candidates[0].front).toBe("a".repeat(201));
    });

    it("should validate back field length (BACK_MAX=500)", () => {
      const candidate = createMockCandidateVM();
      const { result } = renderHook(() => useCandidates([candidate]));

      act(() => {
        result.current.updateField(candidate.localId, "back", "a".repeat(501));
      });

      expect(result.current.candidates[0].validation.backError).toBe("Maksimum 500 znaków");
    });

    it("should mark as dirty when field is updated (even if same value)", () => {
      const candidate = createMockCandidateVM({
        front: "Original Question?",
        back: "Original Answer",
      });
      const { result } = renderHook(() => useCandidates([candidate]));

      act(() => {
        result.current.updateField(candidate.localId, "front", "Original Question?");
      });

      // updateField always sets isDirty=true when called (implementation behavior)
      expect(result.current.candidates[0].isDirty).toBe(true);
    });

    it("should keep decision pending if it was pending before edit", () => {
      const candidate = createMockCandidateVM({ decision: "pending" });
      const { result } = renderHook(() => useCandidates([candidate]));

      act(() => {
        result.current.updateField(candidate.localId, "front", "Edited");
      });

      expect(result.current.candidates[0].decision).toBe("pending");
    });

    it("should preserve decision if it was accepted/rejected before edit", () => {
      const candidate = createMockCandidateVM({ decision: "accepted" });
      const { result } = renderHook(() => useCandidates([candidate]));

      act(() => {
        result.current.updateField(candidate.localId, "front", "Edited");
      });

      expect(result.current.candidates[0].decision).toBe("accepted");
    });
  });

  describe("undo", () => {
    it("should restore original values", () => {
      const candidate = createMockCandidateVM({
        original: { front: "Original Q?", back: "Original A", source: "ai-full" },
        front: "Edited Q?",
        back: "Edited A",
        isDirty: true,
        source: "ai-edited",
        decision: "accepted",
      });
      const { result } = renderHook(() => useCandidates([candidate]));

      act(() => {
        result.current.undo(candidate.localId);
      });

      expect(result.current.candidates[0].front).toBe("Original Q?");
      expect(result.current.candidates[0].back).toBe("Original A");
      expect(result.current.candidates[0].source).toBe("ai-full");
      expect(result.current.candidates[0].isDirty).toBe(false);
      expect(result.current.candidates[0].decision).toBe("pending");
      expect(result.current.candidates[0].validation).toEqual({});
    });
  });

  describe("clear", () => {
    it("should remove all candidates", () => {
      const candidates = createMockCandidates(5);
      const { result } = renderHook(() => useCandidates(candidates));

      act(() => {
        result.current.clear();
      });

      expect(result.current.candidates).toHaveLength(0);
    });
  });

  describe("getTotals", () => {
    it("should return correct counts", () => {
      const candidates = [
        createMockCandidateVM({ decision: "accepted" }),
        createMockCandidateVM({ decision: "accepted", source: "ai-edited" }),
        createMockCandidateVM({ decision: "rejected" }),
        createMockCandidateVM({ decision: "pending" }),
      ];
      const { result } = renderHook(() => useCandidates(candidates));

      const totals = result.current.getTotals();

      expect(totals.accepted).toBe(2);
      expect(totals.rejected).toBe(1);
      expect(totals.edited).toBe(1); // Only accepted + ai-edited
    });
  });

  describe("getAcceptedOnly", () => {
    it("should return only accepted candidates without validation errors", () => {
      const candidates = [
        createMockCandidateVM({ decision: "accepted" }),
        createMockCandidateVM({
          decision: "accepted",
          front: "a".repeat(201), // Exceeds FRONT_MAX (200) - will have frontError after validation
        }),
        createMockCandidateVM({ decision: "rejected" }),
        createMockCandidateVM({ decision: "pending" }),
      ];
      const { result } = renderHook(() => useCandidates(candidates));

      const acceptedOnly = result.current.getAcceptedOnly();

      // Should return only accepted candidates without validation errors
      expect(acceptedOnly).toHaveLength(1);
      expect(acceptedOnly[0].decision).toBe("accepted");
      expect(acceptedOnly[0].validation.frontError).toBeUndefined();
      expect(acceptedOnly[0].validation.backError).toBeUndefined();
    });

    it("should exclude candidates with backError", () => {
      const candidates = [
        createMockCandidateVM({ decision: "accepted" }),
        createMockCandidateVM({
          decision: "accepted",
          back: "a".repeat(501), // Exceeds BACK_MAX (500) - will have backError after validation
        }),
      ];
      const { result } = renderHook(() => useCandidates(candidates));

      const acceptedOnly = result.current.getAcceptedOnly();

      // Should exclude candidate with backError
      expect(acceptedOnly).toHaveLength(1);
      expect(acceptedOnly[0].validation.backError).toBeUndefined();
    });
  });

  describe("acceptAll", () => {
    it("should accept all non-rejected candidates", () => {
      const candidates = [
        createMockCandidateVM({ decision: "pending" }),
        createMockCandidateVM({ decision: "pending" }),
        createMockCandidateVM({ decision: "rejected" }),
        createMockCandidateVM({ decision: "accepted" }),
      ];
      const { result } = renderHook(() => useCandidates(candidates));

      act(() => {
        result.current.acceptAll();
      });

      expect(result.current.candidates[0].decision).toBe("accepted");
      expect(result.current.candidates[1].decision).toBe("accepted");
      expect(result.current.candidates[2].decision).toBe("rejected"); // Should remain rejected
      expect(result.current.candidates[3].decision).toBe("accepted");
    });
  });

  describe("setCandidates", () => {
    it("should update candidates array", () => {
      const initialCandidates = createMockCandidates(2);
      const { result } = renderHook(() => useCandidates(initialCandidates));

      const newCandidates = createMockCandidates(3);
      act(() => {
        result.current.setCandidates(newCandidates);
      });

      expect(result.current.candidates).toHaveLength(3);
      expect(result.current.candidates).not.toEqual(initialCandidates);
    });
  });
});
