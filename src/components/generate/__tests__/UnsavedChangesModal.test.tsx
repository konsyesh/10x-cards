import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UnsavedChangesModal } from "../UnsavedChangesModal";

describe("UnsavedChangesModal", () => {
  describe("rendering", () => {
    it("should render warning message", () => {
      const onSave = vi.fn();
      const onDiscard = vi.fn();
      const onCancel = vi.fn();

      render(<UnsavedChangesModal isOpen={true} onSave={onSave} onDiscard={onDiscard} onCancel={onCancel} />);

      expect(screen.getByText(/niezapisane zmiany/i)).toBeInTheDocument();
      expect(screen.getByText(/masz niezapisane karty/i)).toBeInTheDocument();
    });
  });

  describe("interactions", () => {
    it("should call onSave when save button is clicked", async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      const onDiscard = vi.fn();
      const onCancel = vi.fn();

      render(<UnsavedChangesModal isOpen={true} onSave={onSave} onDiscard={onDiscard} onCancel={onCancel} />);

      await user.click(screen.getByRole("button", { name: /zapisz karty/i }));

      expect(onSave).toHaveBeenCalledTimes(1);
    });

    it("should call onDiscard when discard button is clicked", async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      const onDiscard = vi.fn();
      const onCancel = vi.fn();

      render(<UnsavedChangesModal isOpen={true} onSave={onSave} onDiscard={onDiscard} onCancel={onCancel} />);

      await user.click(screen.getByRole("button", { name: /porzuć zmiany/i }));

      expect(onDiscard).toHaveBeenCalledTimes(1);
    });

    it("should call onCancel when cancel button is clicked", async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      const onDiscard = vi.fn();
      const onCancel = vi.fn();

      render(<UnsavedChangesModal isOpen={true} onSave={onSave} onDiscard={onDiscard} onCancel={onCancel} />);

      await user.click(screen.getByRole("button", { name: /anuluj/i }));

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it("should disable buttons when loading", () => {
      const onSave = vi.fn();
      const onDiscard = vi.fn();
      const onCancel = vi.fn();

      render(
        <UnsavedChangesModal isOpen={true} onSave={onSave} onDiscard={onDiscard} onCancel={onCancel} isLoading={true} />
      );

      expect(screen.getByRole("button", { name: /zapisuję.../i })).toBeDisabled();
    });
  });
});
