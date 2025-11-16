import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SaveSummaryModal } from "../SaveSummaryModal";

describe("SaveSummaryModal", () => {
  describe("rendering", () => {
    it("should render summary with counts", () => {
      const onConfirm = vi.fn();
      const onCancel = vi.fn();

      render(
        <SaveSummaryModal
          isOpen={true}
          acceptedUnedited={5}
          acceptedEdited={3}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );

      expect(screen.getByText("Niezedytowane karty")).toBeInTheDocument();
      // Verify numbers are present - use getAllByText to handle multiple occurrences
      const number5Elements = screen.getAllByText("5");
      expect(number5Elements.length).toBeGreaterThan(0);

      // Użyj dokładnego tekstu zamiast regexu, żeby uniknąć konfliktu z "Niezedytowane karty"
      expect(screen.getByText("Edytowane karty")).toBeInTheDocument();
      const number3Elements = screen.getAllByText("3");
      expect(number3Elements.length).toBeGreaterThan(0);

      expect(screen.getByText(/razem do zapisania/i)).toBeInTheDocument();
      // "8" appears in both summary and button text "Zapisz 8 kart"
      const number8Elements = screen.getAllByText("8");
      expect(number8Elements.length).toBeGreaterThan(0);
    });

    it("should show error when provided", () => {
      const onConfirm = vi.fn();
      const onCancel = vi.fn();

      render(
        <SaveSummaryModal
          isOpen={true}
          acceptedUnedited={5}
          acceptedEdited={3}
          error="Test error"
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );

      expect(screen.getByText(/test error/i)).toBeInTheDocument();
    });
  });

  describe("interactions", () => {
    it("should call onConfirm when save button is clicked", async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();
      const onCancel = vi.fn();

      render(
        <SaveSummaryModal
          isOpen={true}
          acceptedUnedited={5}
          acceptedEdited={3}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );

      await user.click(screen.getByRole("button", { name: /zapisz 8 kart/i }));

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it("should call onCancel when cancel button is clicked", async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();
      const onCancel = vi.fn();

      render(
        <SaveSummaryModal
          isOpen={true}
          acceptedUnedited={5}
          acceptedEdited={3}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );

      await user.click(screen.getByRole("button", { name: /anuluj/i }));

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it("should disable save button when totalAccepted = 0", () => {
      const onConfirm = vi.fn();
      const onCancel = vi.fn();

      render(
        <SaveSummaryModal
          isOpen={true}
          acceptedUnedited={0}
          acceptedEdited={0}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );

      expect(screen.getByRole("button", { name: /zapisz 0 kart/i })).toBeDisabled();
    });

    it("should show loading state", () => {
      const onConfirm = vi.fn();
      const onCancel = vi.fn();

      render(
        <SaveSummaryModal
          isOpen={true}
          acceptedUnedited={5}
          acceptedEdited={3}
          isLoading={true}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );

      expect(screen.getByText(/zapisuję.../i)).toBeInTheDocument();
    });
  });
});
