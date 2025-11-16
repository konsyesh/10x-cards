import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KeyboardShortcutsHint } from "../KeyboardShortcutsHint";

describe("KeyboardShortcutsHint", () => {
  describe("rendering", () => {
    it("should render floating button", () => {
      render(<KeyboardShortcutsHint />);

      expect(screen.getByLabelText(/pokaż skróty klawiaturowe/i)).toBeInTheDocument();
    });

    it("should not render when show=false", () => {
      const { container } = render(<KeyboardShortcutsHint show={false} />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe("dialog", () => {
    it("should open dialog when button is clicked", async () => {
      const user = userEvent.setup();
      render(<KeyboardShortcutsHint />);

      await user.click(screen.getByLabelText(/pokaż skróty klawiaturowe/i));

      expect(screen.getByText(/skróty klawiaturowe/i)).toBeInTheDocument();
      expect(screen.getByText(/zaakceptuj bieżącą kartę/i)).toBeInTheDocument();
    });

    it("should display all shortcuts", async () => {
      const user = userEvent.setup();
      render(<KeyboardShortcutsHint />);

      await user.click(screen.getByLabelText(/pokaż skróty klawiaturowe/i));

      expect(screen.getByText(/zaakceptuj bieżącą kartę/i)).toBeInTheDocument();
      expect(screen.getByText(/edytuj bieżącą kartę/i)).toBeInTheDocument();
      expect(screen.getByText(/odrzuć bieżącą kartę/i)).toBeInTheDocument();
      expect(screen.getByText(/otwórz modal zapisu/i)).toBeInTheDocument();
    });
  });
});

