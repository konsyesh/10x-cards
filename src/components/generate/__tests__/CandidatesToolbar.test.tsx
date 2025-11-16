import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CandidatesToolbar } from "../CandidatesToolbar";
import type { TotalsSummary } from "@/types";

describe("CandidatesToolbar", () => {
  const createMockTotals = (overrides?: Partial<TotalsSummary>): TotalsSummary => ({
    accepted: 10,
    rejected: 5,
    edited: 3,
    ...overrides,
  });

  describe("rendering", () => {
    it("should render all badges", () => {
      const totals = createMockTotals();
      const onAcceptAll = vi.fn();
      const onSave = vi.fn();

      render(<CandidatesToolbar totals={totals} total={20} onAcceptAll={onAcceptAll} onSave={onSave} />);

      // Text is split across elements (Badge contains spans), use function matcher
      // Sprawdź tylko elementy Badge (data-slot="badge") żeby uniknąć dopasowania do elementów wewnętrznych
      const razemElements = screen.getAllByText((content, element) => {
        const text = element?.textContent || "";
        const isBadge = element?.getAttribute("data-slot") === "badge";
        return isBadge && text.includes("Razem") && text.includes("20");
      });
      expect(razemElements.length).toBe(1);

      const zaakceptowaneElements = screen.getAllByText((content, element) => {
        const text = element?.textContent || "";
        const isBadge = element?.getAttribute("data-slot") === "badge";
        return isBadge && text.includes("Zaakceptowane") && text.includes("10");
      });
      expect(zaakceptowaneElements.length).toBe(1);

      const edytowaneElements = screen.getAllByText((content, element) => {
        const text = element?.textContent || "";
        const isBadge = element?.getAttribute("data-slot") === "badge";
        return isBadge && text.includes("Edytowane") && text.includes("3");
      });
      expect(edytowaneElements.length).toBe(1);

      const odrzuconeElements = screen.getAllByText((content, element) => {
        const text = element?.textContent || "";
        const isBadge = element?.getAttribute("data-slot") === "badge";
        return isBadge && text.includes("Odrzucone") && text.includes("5");
      });
      expect(odrzuconeElements.length).toBe(1);
    });

    it("should show pending count when there are pending items", () => {
      const totals = createMockTotals();
      const onAcceptAll = vi.fn();
      const onSave = vi.fn();

      render(<CandidatesToolbar totals={totals} total={20} onAcceptAll={onAcceptAll} onSave={onSave} />);

      // Text is split: "<span>5</span> oczekuje", use function matcher
      // Sprawdź tylko elementy Badge (data-slot="badge") żeby uniknąć dopasowania do elementów wewnętrznych
      // (musi zawierać "oczekuje" żeby odróżnić od "Odrzucone: 5")
      const oczekujeElements = screen.getAllByText((content, element) => {
        const text = element?.textContent || "";
        const isBadge = element?.getAttribute("data-slot") === "badge";
        return isBadge && text.includes("5") && text.includes("oczekuje");
      });
      expect(oczekujeElements.length).toBe(1); // 20 - 10 - 5 = 5
    });

    it("should not show pending when all items are processed", () => {
      const totals = createMockTotals({ accepted: 10, rejected: 10 });
      const onAcceptAll = vi.fn();
      const onSave = vi.fn();

      render(<CandidatesToolbar totals={totals} total={20} onAcceptAll={onAcceptAll} onSave={onSave} />);

      expect(screen.queryByText(/oczekuje/i)).not.toBeInTheDocument();
    });
  });

  describe("actions", () => {
    it("should call onAcceptAll when accept all button is clicked", async () => {
      const user = userEvent.setup();
      const totals = createMockTotals();
      const onAcceptAll = vi.fn();
      const onSave = vi.fn();

      render(<CandidatesToolbar totals={totals} total={20} onAcceptAll={onAcceptAll} onSave={onSave} />);

      await user.click(screen.getByLabelText(/zaakceptuj wszystkie karty/i));

      expect(onAcceptAll).toHaveBeenCalledTimes(1);
    });

    it("should call onSave when save button is clicked", async () => {
      const user = userEvent.setup();
      const totals = createMockTotals();
      const onAcceptAll = vi.fn();
      const onSave = vi.fn();

      render(<CandidatesToolbar totals={totals} total={20} onAcceptAll={onAcceptAll} onSave={onSave} />);

      await user.click(screen.getByLabelText(/zapisz 10 zaakceptowanych kart/i));

      expect(onSave).toHaveBeenCalledTimes(1);
    });

    it("should disable save button when no accepted items", () => {
      const totals = createMockTotals({ accepted: 0 });
      const onAcceptAll = vi.fn();
      const onSave = vi.fn();

      render(<CandidatesToolbar totals={totals} total={20} onAcceptAll={onAcceptAll} onSave={onSave} />);

      expect(screen.getByLabelText(/zapisz 0 zaakceptowanych kart/i)).toBeDisabled();
    });

    it("should disable save button when loading", () => {
      const totals = createMockTotals();
      const onAcceptAll = vi.fn();
      const onSave = vi.fn();

      render(
        <CandidatesToolbar totals={totals} total={20} onAcceptAll={onAcceptAll} onSave={onSave} isLoading={true} />
      );

      expect(screen.getByLabelText(/zapisz 10 zaakceptowanych kart/i)).toBeDisabled();
    });

    it("should show accepted count in save button", () => {
      const totals = createMockTotals({ accepted: 15 });
      const onAcceptAll = vi.fn();
      const onSave = vi.fn();

      render(<CandidatesToolbar totals={totals} total={20} onAcceptAll={onAcceptAll} onSave={onSave} />);

      expect(screen.getByText(/\(15\)/i)).toBeInTheDocument();
    });
  });
});
