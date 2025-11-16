import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CandidatesList } from "../CandidatesList";
import { createMockCandidates } from "@/tests/helpers";

vi.mock("@/hooks/use-mobile", () => ({
  useMediaQuery: vi.fn(() => false), // Desktop by default
}));

describe("CandidatesList", () => {
  describe("rendering", () => {
    it("should render items in grid", () => {
      const items = createMockCandidates(3);
      const onItemChange = vi.fn();
      const onAccept = vi.fn();
      const onReject = vi.fn();

      render(<CandidatesList items={items} onItemChange={onItemChange} onAccept={onAccept} onReject={onReject} />);

      expect(screen.getAllByText(/question/i)).toHaveLength(3);
    });

    it("should show empty state when no items", () => {
      const onItemChange = vi.fn();
      const onAccept = vi.fn();
      const onReject = vi.fn();

      render(<CandidatesList items={[]} onItemChange={onItemChange} onAccept={onAccept} onReject={onReject} />);

      expect(screen.getByText(/brak kandydatów/i)).toBeInTheDocument();
    });

    it("should use startIndex for numbering", () => {
      const items = createMockCandidates(1);
      const onItemChange = vi.fn();
      const onAccept = vi.fn();
      const onReject = vi.fn();

      render(
        <CandidatesList
          items={items}
          onItemChange={onItemChange}
          onAccept={onAccept}
          onReject={onReject}
          startIndex={10}
        />
      );

      expect(screen.getByText(/#11/i)).toBeInTheDocument();
    });
  });
});
