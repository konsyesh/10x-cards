import type { CandidateVM, GenerationState, PaginationState } from "@/types";

/**
 * Test Helpers for Hooks
 * Factory functions for creating mock data structures used in hook tests
 */

/**
 * Create mock CandidateVM for testing
 */
export function createMockCandidateVM(overrides?: Partial<CandidateVM>): CandidateVM {
  return {
    localId: crypto.randomUUID(),
    original: {
      front: "Original Question?",
      back: "Original Answer",
      source: "ai-full",
    },
    front: "Original Question?",
    back: "Original Answer",
    source: "ai-full",
    generation_id: 1,
    decision: "pending",
    validation: {},
    isDirty: false,
    ...overrides,
  };
}

/**
 * Create mock GenerationState for testing
 */
export function createMockGenerationState(overrides?: Partial<GenerationState>): GenerationState {
  return {
    status: "idle",
    ...overrides,
  };
}

/**
 * Create mock PaginationState for testing
 */
export function createMockPaginationState(overrides?: Partial<PaginationState>): PaginationState {
  return {
    page: 1,
    perPage: 30,
    total: 0,
    ...overrides,
  };
}

/**
 * Create array of mock CandidateVM
 */
export function createMockCandidates(count: number, overrides?: Partial<CandidateVM>): CandidateVM[] {
  return Array.from({ length: count }, (_, i) =>
    createMockCandidateVM({
      localId: `local-id-${i}`,
      front: `Question ${i + 1}?`,
      back: `Answer ${i + 1}`,
      ...overrides,
    })
  );
}
