import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CandidatesSection } from "../CandidatesSection";
import { createMockCandidates, createMockPaginationState } from "@/tests/helpers";
import type { TotalsSummary } from "@/types";

describe("CandidatesSection", () => {
  const createMockTotals = (): TotalsSummary => ({
    accepted: 10,
    rejected: 5,
    edited: 3,
  });

  it("should render toolbar and list when total > 0", () => {
    const items = createMockCandidates(5);
    const totals = createMockTotals();
    const paginationState = createMockPaginationState({ total: 5 });

    render(
      <CandidatesSection
        items={items}
        totals={totals}
        paginationState={paginationState}
        onItemChange={vi.fn()}
        onAccept={vi.fn()}
        onReject={vi.fn()}
        onGoToPage={vi.fn()}
        onNextPage={vi.fn()}
        onPrevPage={vi.fn()}
        onEditingCardChange={vi.fn()}
      />
    );

    // Text is split across elements, use getAllByText and check if any element matches
    const razemElements = screen.getAllByText((content, element) => {
      const text = element?.textContent?.toLowerCase() || "";
      return text.includes("razem") && text.includes("5");
    });
    expect(razemElements.length).toBeGreaterThan(0);
  });

  it("should not render toolbar when total = 0", () => {
    const items: any[] = [];
    const totals = createMockTotals();
    const paginationState = createMockPaginationState({ total: 0 });

    render(
      <CandidatesSection
        items={items}
        totals={totals}
        paginationState={paginationState}
        onItemChange={vi.fn()}
        onAccept={vi.fn()}
        onReject={vi.fn()}
        onGoToPage={vi.fn()}
        onNextPage={vi.fn()}
        onPrevPage={vi.fn()}
        onEditingCardChange={vi.fn()}
      />
    );

    expect(screen.queryByText(/razem:/i)).not.toBeInTheDocument();
  });
});
