import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GenerateButton } from "../GenerateButton";

describe("GenerateButton", () => {
  describe("rendering", () => {
    it("should render with default label", () => {
      const onClick = vi.fn();
      render(<GenerateButton onClick={onClick} />);

      expect(screen.getByRole("button", { name: /generuj karty/i })).toBeInTheDocument();
    });

    it("should render with custom label", () => {
      const onClick = vi.fn();
      render(<GenerateButton onClick={onClick} label="Custom Label" />);

      expect(screen.getByRole("button", { name: /custom label/i })).toBeInTheDocument();
    });

    it("should render Wand2 icon when not loading", () => {
      const onClick = vi.fn();
      render(<GenerateButton onClick={onClick} />);

      const icon = screen.getByRole("button").querySelector("svg");
      expect(icon).toBeInTheDocument();
    });
  });

  describe("loading state", () => {
    it("should show loading spinner when isLoading is true", () => {
      const onClick = vi.fn();
      render(<GenerateButton onClick={onClick} isLoading={true} />);

      expect(screen.getByText(/generowanie.../i)).toBeInTheDocument();
      const spinner = screen.getByRole("button").querySelector("svg");
      expect(spinner).toBeInTheDocument();
    });

    it("should show loading text when isLoading is true", () => {
      const onClick = vi.fn();
      render(<GenerateButton onClick={onClick} isLoading={true} />);

      expect(screen.getByText(/generowanie.../i)).toBeInTheDocument();
    });

    it("should be disabled when isLoading is true", () => {
      const onClick = vi.fn();
      render(<GenerateButton onClick={onClick} isLoading={true} />);

      expect(screen.getByRole("button")).toBeDisabled();
    });

    it("should have aria-busy when loading", () => {
      const onClick = vi.fn();
      render(<GenerateButton onClick={onClick} isLoading={true} />);

      expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "true");
    });
  });

  describe("disabled state", () => {
    it("should be disabled when disabled prop is true", () => {
      const onClick = vi.fn();
      render(<GenerateButton onClick={onClick} disabled={true} />);

      expect(screen.getByRole("button")).toBeDisabled();
    });

    it("should be disabled when both disabled and isLoading are true", () => {
      const onClick = vi.fn();
      render(<GenerateButton onClick={onClick} disabled={true} isLoading={true} />);

      expect(screen.getByRole("button")).toBeDisabled();
    });
  });

  describe("interaction", () => {
    it("should call onClick when clicked", async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(<GenerateButton onClick={onClick} />);

      await user.click(screen.getByRole("button"));

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("should not call onClick when disabled", async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(<GenerateButton onClick={onClick} disabled={true} />);

      await user.click(screen.getByRole("button"));

      expect(onClick).not.toHaveBeenCalled();
    });

    it("should not call onClick when loading", async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(<GenerateButton onClick={onClick} isLoading={true} />);

      await user.click(screen.getByRole("button"));

      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe("accessibility", () => {
    it("should have aria-label when loading", () => {
      const onClick = vi.fn();
      render(<GenerateButton onClick={onClick} isLoading={true} />);

      expect(screen.getByRole("button")).toHaveAttribute("aria-label", "Generowanie w toku...");
    });

    it("should have aria-label with custom label", () => {
      const onClick = vi.fn();
      render(<GenerateButton onClick={onClick} label="Custom Label" />);

      expect(screen.getByRole("button")).toHaveAttribute("aria-label", "Custom Label");
    });
  });
});

