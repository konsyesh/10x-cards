import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PaginationControls } from "../PaginationControls";
import type { PaginationState } from "@/types";

describe("PaginationControls", () => {
  const createMockState = (overrides?: Partial<PaginationState>): PaginationState => ({
    page: 1,
    perPage: 30,
    total: 100,
    ...overrides,
  });

  describe("rendering", () => {
    it("should render pagination controls", () => {
      const state = createMockState();
      const onGoToPage = vi.fn();
      const onNextPage = vi.fn();
      const onPrevPage = vi.fn();

      render(
        <PaginationControls state={state} onGoToPage={onGoToPage} onNextPage={onNextPage} onPrevPage={onPrevPage} />
      );

      // Check that pagination text contains "Strona" and page number
      // Użyj getAllByText i sprawdź tylko główny element (nie elementy wewnętrzne)
      // Sprawdź czy element ma klasę "text-muted-foreground" (główny kontener tekstu paginacji)
      const pageElements = screen.getAllByText((content, element) => {
        if (!element) return false;
        const text = element.textContent || "";
        const className = element.getAttribute("class") || "";
        const hasMutedForegroundClass = className.includes("text-muted-foreground");
        // Sprawdź czy zawiera pełny tekst "Strona X z Y" i jest głównym kontenerem
        return hasMutedForegroundClass && text.includes("Strona") && text.includes("1") && text.includes("z");
      });
      expect(pageElements.length).toBe(1);
      expect(pageElements[0]).toBeInTheDocument();

      // Verify navigation buttons are present
      expect(screen.getByLabelText(/przejdź do pierwszej strony/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/następna strona/i)).toBeInTheDocument();
    });

    it("should display current page and total pages", () => {
      const state = createMockState({ page: 2, total: 100 });
      const onGoToPage = vi.fn();
      const onNextPage = vi.fn();
      const onPrevPage = vi.fn();

      render(
        <PaginationControls state={state} onGoToPage={onGoToPage} onNextPage={onNextPage} onPrevPage={onPrevPage} />
      );

      // Text is split across spans, use getAllByText and check if any element matches
      const pageElements = screen.getAllByText((content, element) => {
        const text = element?.textContent?.toLowerCase() || "";
        return text.includes("strona") && text.includes("2") && text.includes("z") && text.includes("4");
      });
      expect(pageElements.length).toBeGreaterThan(0);
    });

    it("should display total candidates count", () => {
      const state = createMockState({ total: 150 });
      const onGoToPage = vi.fn();
      const onNextPage = vi.fn();
      const onPrevPage = vi.fn();

      render(
        <PaginationControls state={state} onGoToPage={onGoToPage} onNextPage={onNextPage} onPrevPage={onPrevPage} />
      );

      // Text is split across spans, use getAllByText and check if any element matches
      const countElements = screen.getAllByText((content, element) => {
        const text = element?.textContent?.toLowerCase() || "";
        return text.includes("150") && text.includes("kandydatów");
      });
      expect(countElements.length).toBeGreaterThan(0);
    });

    it("should not render when totalPages <= 1", () => {
      const state = createMockState({ total: 20, perPage: 30 }); // Only 1 page
      const onGoToPage = vi.fn();
      const onNextPage = vi.fn();
      const onPrevPage = vi.fn();

      const { container } = render(
        <PaginationControls state={state} onGoToPage={onGoToPage} onNextPage={onNextPage} onPrevPage={onPrevPage} />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe("navigation buttons", () => {
    it("should render all navigation buttons", () => {
      const state = createMockState({ page: 2, total: 100 });
      const onGoToPage = vi.fn();
      const onNextPage = vi.fn();
      const onPrevPage = vi.fn();

      render(
        <PaginationControls state={state} onGoToPage={onGoToPage} onNextPage={onNextPage} onPrevPage={onPrevPage} />
      );

      expect(screen.getByLabelText(/przejdź do pierwszej strony/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/poprzednia strona/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/następna strona/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/przejdź do ostatniej strony/i)).toBeInTheDocument();
    });

    it("should disable first/prev buttons on first page", () => {
      const state = createMockState({ page: 1, total: 100 });
      const onGoToPage = vi.fn();
      const onNextPage = vi.fn();
      const onPrevPage = vi.fn();

      render(
        <PaginationControls state={state} onGoToPage={onGoToPage} onNextPage={onNextPage} onPrevPage={onPrevPage} />
      );

      expect(screen.getByLabelText(/przejdź do pierwszej strony/i)).toBeDisabled();
      expect(screen.getByLabelText(/poprzednia strona/i)).toBeDisabled();
    });

    it("should disable last/next buttons on last page", () => {
      const state = createMockState({ page: 4, total: 100 }); // Last page (100/30 = 4 pages)
      const onGoToPage = vi.fn();
      const onNextPage = vi.fn();
      const onPrevPage = vi.fn();

      render(
        <PaginationControls state={state} onGoToPage={onGoToPage} onNextPage={onNextPage} onPrevPage={onPrevPage} />
      );

      expect(screen.getByLabelText(/następna strona/i)).toBeDisabled();
      expect(screen.getByLabelText(/przejdź do ostatniej strony/i)).toBeDisabled();
    });
  });

  describe("interactions", () => {
    it("should call onGoToPage when first page button is clicked", async () => {
      const user = userEvent.setup();
      const state = createMockState({ page: 3, total: 100 });
      const onGoToPage = vi.fn();
      const onNextPage = vi.fn();
      const onPrevPage = vi.fn();

      render(
        <PaginationControls state={state} onGoToPage={onGoToPage} onNextPage={onNextPage} onPrevPage={onPrevPage} />
      );

      await user.click(screen.getByLabelText(/przejdź do pierwszej strony/i));

      expect(onGoToPage).toHaveBeenCalledWith(1);
    });

    it("should call onPrevPage when prev button is clicked", async () => {
      const user = userEvent.setup();
      const state = createMockState({ page: 2, total: 100 });
      const onGoToPage = vi.fn();
      const onNextPage = vi.fn();
      const onPrevPage = vi.fn();

      render(
        <PaginationControls state={state} onGoToPage={onGoToPage} onNextPage={onNextPage} onPrevPage={onPrevPage} />
      );

      await user.click(screen.getByLabelText(/poprzednia strona/i));

      expect(onPrevPage).toHaveBeenCalledTimes(1);
    });

    it("should call onNextPage when next button is clicked", async () => {
      const user = userEvent.setup();
      const state = createMockState({ page: 2, total: 100 });
      const onGoToPage = vi.fn();
      const onNextPage = vi.fn();
      const onPrevPage = vi.fn();

      render(
        <PaginationControls state={state} onGoToPage={onGoToPage} onNextPage={onNextPage} onPrevPage={onPrevPage} />
      );

      await user.click(screen.getByLabelText(/następna strona/i));

      expect(onNextPage).toHaveBeenCalledTimes(1);
    });

    it("should call onGoToPage when last page button is clicked", async () => {
      const user = userEvent.setup();
      const state = createMockState({ page: 2, total: 100 });
      const onGoToPage = vi.fn();
      const onNextPage = vi.fn();
      const onPrevPage = vi.fn();

      render(
        <PaginationControls state={state} onGoToPage={onGoToPage} onNextPage={onNextPage} onPrevPage={onPrevPage} />
      );

      await user.click(screen.getByLabelText(/przejdź do ostatniej strony/i));

      expect(onGoToPage).toHaveBeenCalledWith(4); // 100/30 = 4 pages
    });
  });

  describe("accessibility", () => {
    it("should have aria-labels on all buttons", () => {
      const state = createMockState({ page: 2, total: 100 });
      const onGoToPage = vi.fn();
      const onNextPage = vi.fn();
      const onPrevPage = vi.fn();

      render(
        <PaginationControls state={state} onGoToPage={onGoToPage} onNextPage={onNextPage} onPrevPage={onPrevPage} />
      );

      expect(screen.getByLabelText(/przejdź do pierwszej strony/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/poprzednia strona/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/następna strona/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/przejdź do ostatniej strony/i)).toBeInTheDocument();
    });

    it("should have title attributes", () => {
      const state = createMockState({ page: 2, total: 100 });
      const onGoToPage = vi.fn();
      const onNextPage = vi.fn();
      const onPrevPage = vi.fn();

      render(
        <PaginationControls state={state} onGoToPage={onGoToPage} onNextPage={onNextPage} onPrevPage={onPrevPage} />
      );

      expect(screen.getByTitle(/pierwsza strona/i)).toBeInTheDocument();
      expect(screen.getByTitle(/poprzednia strona/i)).toBeInTheDocument();
      expect(screen.getByTitle(/następna strona/i)).toBeInTheDocument();
      expect(screen.getByTitle(/ostatnia strona/i)).toBeInTheDocument();
    });
  });
});
