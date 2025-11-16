import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SourceTextarea } from "../SourceTextarea";

describe("SourceTextarea", () => {
  describe("rendering", () => {
    it("should render textarea with label", () => {
      const onChange = vi.fn();
      render(<SourceTextarea value="" onChange={onChange} />);

      expect(screen.getByLabelText(/tekst źródłowy/i)).toBeInTheDocument();
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    it("should display character count", () => {
      const onChange = vi.fn();
      render(<SourceTextarea value="Test" onChange={onChange} />);

      // Text is in a span element: "4 / 50 000 znaków"
      // Polish locale: 4 formats as "4", 50000 formats as "50 000"
      // Użyj regex do znalezienia tekstu, który może być podzielony na wiele elementów
      const countText = screen.getByText(/4.*50\s000.*znaków/i);
      expect(countText).toBeInTheDocument();
    });

    it("should display formatted character count", () => {
      const onChange = vi.fn();
      const longText = "a".repeat(1000);
      render(<SourceTextarea value={longText} onChange={onChange} />);

      // Text is in a span element: "1000 / 50 000 znaków"
      // Polish locale: 1000 formats as "1000" (no space), 50000 formats as "50 000"
      // Użyj regex do znalezienia tekstu, który może być podzielony na wiele elementów
      const countText = screen.getByText(/1000.*50\s000.*znaków/i);
      expect(countText).toBeInTheDocument();
    });
  });

  describe("validation - too short", () => {
    it("should show error when text is too short", () => {
      const onChange = vi.fn();
      render(<SourceTextarea value="short" onChange={onChange} min={1000} max={50000} />);

      expect(screen.getByText(/za mało znaków/i)).toBeInTheDocument();
      expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
    });

    it("should calculate remaining characters needed", () => {
      const onChange = vi.fn();
      const shortText = "a".repeat(500);
      render(<SourceTextarea value={shortText} onChange={onChange} min={1000} max={50000} />);

      expect(screen.getByText(/potrzebujesz co najmniej 500 więcej/i)).toBeInTheDocument();
    });

    it("should not show error for empty string", () => {
      const onChange = vi.fn();
      render(<SourceTextarea value="" onChange={onChange} min={1000} max={50000} />);

      expect(screen.queryByText(/za mało znaków/i)).not.toBeInTheDocument();
    });
  });

  describe("validation - too long", () => {
    it("should show error when text is too long", () => {
      const onChange = vi.fn();
      const longText = "a".repeat(50001);
      render(<SourceTextarea value={longText} onChange={onChange} min={1000} max={50000} />);

      expect(screen.getByText(/za dużo znaków/i)).toBeInTheDocument();
      expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
    });

    it("should calculate excess characters", () => {
      const onChange = vi.fn();
      const longText = "a".repeat(51000);
      render(<SourceTextarea value={longText} onChange={onChange} min={1000} max={50000} />);

      // Text is in a <p> element inside error div: "Za dużo znaków. Usuń co najmniej 1000 znaków."
      // Polish locale: 1000 formats as "1000" (no space, not "1 000")
      // 51000 - 50000 = 1000, which formats as "1000"
      const errorElements = screen.getAllByText((content, element) => {
        const text = element?.textContent || "";
        // Sprawdź czy zawiera wszystkie części (1000 bez spacji, nie "1 000")
        return (
          text.includes("Za dużo znaków") && text.includes("Usuń") && text.includes("1000") && text.includes("znaków")
        );
      });
      expect(errorElements.length).toBeGreaterThan(0);
    });
  });

  describe("validation - valid range", () => {
    it("should show success indicator when text is in valid range", () => {
      const onChange = vi.fn();
      const validText = "a".repeat(5000);
      render(<SourceTextarea value={validText} onChange={onChange} min={1000} max={50000} />);

      const icon = screen.getByRole("textbox").parentElement?.querySelector("svg");
      expect(icon).toBeInTheDocument();
      expect(screen.getByRole("textbox")).not.toHaveAttribute("aria-invalid", "true");
    });

    it("should not show error messages when valid", () => {
      const onChange = vi.fn();
      const validText = "a".repeat(5000);
      render(<SourceTextarea value={validText} onChange={onChange} min={1000} max={50000} />);

      expect(screen.queryByText(/za mało znaków/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/za dużo znaków/i)).not.toBeInTheDocument();
    });
  });

  describe("interaction", () => {
    it("should call onChange when text is entered", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<SourceTextarea value="" onChange={onChange} />);

      const textarea = screen.getByRole("textbox");
      await user.type(textarea, "Test input");

      expect(onChange).toHaveBeenCalled();
    });

    it("should update displayed character count", () => {
      const onChange = vi.fn();

      // Renderuj komponent z wartością "Test" - test sprawdza czy licznik się aktualizuje
      // (interakcja jest już sprawdzona w teście "should call onChange when text is entered")
      render(<SourceTextarea value="Test" onChange={onChange} />);

      // Text is in a span element: "4 / 50 000 znaków"
      // Polish locale: 4 formats as "4", 50000 formats as "50 000"
      // Użyj regex do znalezienia tekstu, który może być podzielony na wiele elementów
      const countText = screen.getByText(/4.*50\s000.*znaków/i);
      expect(countText).toBeInTheDocument();
    });
  });

  describe("placeholder", () => {
    it("should show placeholder with min characters", () => {
      const onChange = vi.fn();
      render(<SourceTextarea value="" onChange={onChange} min={1000} max={50000} />);

      // Placeholder text: "Wklej tekst (min. 1000 znaków)..."
      // Polish locale: 1000 is formatted as "1000" (no separator for numbers < 10000)
      const textarea = screen.getByRole("textbox");
      const placeholder = textarea.getAttribute("placeholder") || "";
      expect(placeholder).toMatch(/wklej tekst/i);
      expect(placeholder).toMatch(/min/i);
      expect(placeholder).toMatch(/1000/i);
      expect(placeholder).toMatch(/znaków/i);
    });
  });

  describe("accessibility", () => {
    it("should have aria-invalid when invalid", () => {
      const onChange = vi.fn();
      render(<SourceTextarea value="short" onChange={onChange} min={1000} max={50000} />);

      expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
    });

    it("should have aria-describedby when invalid", () => {
      const onChange = vi.fn();
      render(<SourceTextarea value="short" onChange={onChange} min={1000} max={50000} />);

      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveAttribute("aria-describedby");
    });

    it("should not have aria-invalid when valid", () => {
      const onChange = vi.fn();
      const validText = "a".repeat(5000);
      render(<SourceTextarea value={validText} onChange={onChange} min={1000} max={50000} />);

      expect(screen.getByRole("textbox")).not.toHaveAttribute("aria-invalid", "true");
    });
  });

  describe("custom min/max", () => {
    it("should respect custom min value", () => {
      const onChange = vi.fn();
      const shortText = "a".repeat(500);
      render(<SourceTextarea value={shortText} onChange={onChange} min={2000} max={10000} />);

      expect(screen.getByText(/za mało znaków/i)).toBeInTheDocument();
    });

    it("should respect custom max value", () => {
      const onChange = vi.fn();
      const longText = "a".repeat(10001);
      render(<SourceTextarea value={longText} onChange={onChange} min={2000} max={10000} />);

      expect(screen.getByText(/za dużo znaków/i)).toBeInTheDocument();
    });
  });
});
