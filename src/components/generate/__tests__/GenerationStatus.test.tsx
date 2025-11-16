import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GenerationStatus } from "../GenerationStatus";

describe("GenerationStatus", () => {
  describe("idle state", () => {
    it("should not render when status is idle", () => {
      render(<GenerationStatus state="idle" />);

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("loading state", () => {
    it("should render loading alert with progress", () => {
      render(<GenerationStatus state="loading" />);

      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText(/generowanie w toku/i)).toBeInTheDocument();
      expect(screen.getByText(/proszę czekać/i)).toBeInTheDocument();
      expect(screen.getByRole("progressbar")).toBeInTheDocument();
    });

    it("should show spinner icon", () => {
      render(<GenerationStatus state="loading" />);

      const spinner = screen.getByRole("alert").querySelector("svg");
      expect(spinner).toBeInTheDocument();
    });
  });

  describe("error state", () => {
    it("should render error alert with message", () => {
      render(<GenerationStatus state="error" message="Custom error message" />);

      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText(/błąd generowania/i)).toBeInTheDocument();
      expect(screen.getByText(/custom error message/i)).toBeInTheDocument();
    });

    it("should use getErrorMessage when message is not provided", () => {
      render(<GenerationStatus state="error" errorCode="RATE_LIMIT_EXCEEDED" />);

      expect(screen.getByText(/przekroczono limit żądań/i)).toBeInTheDocument();
    });

    it("should show retry button when onRetry is provided", async () => {
      const user = userEvent.setup();
      const onRetry = vi.fn();
      render(<GenerationStatus state="error" onRetry={onRetry} />);

      const retryButton = screen.getByRole("button", { name: /spróbuj ponownie/i });
      expect(retryButton).toBeInTheDocument();

      await user.click(retryButton);
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it("should not show retry button when onRetry is not provided", () => {
      render(<GenerationStatus state="error" />);

      expect(screen.queryByRole("button", { name: /spróbuj ponownie/i })).not.toBeInTheDocument();
    });

    it("should handle different error codes", () => {
      const errorCodes = [
        { code: "SERVICE_UNAVAILABLE", expected: /usługa niedostępna/i },
        { code: "GATEWAY_TIMEOUT", expected: /przekroczono czas generacji/i },
        { code: "TEXT_LENGTH_INVALID", expected: /tekst ma nieprawidłową długość/i },
        { code: "VALIDATION_ERROR", expected: /błąd walidacji danych/i },
      ];

      errorCodes.forEach(({ code, expected }) => {
        const { unmount } = render(<GenerationStatus state="error" errorCode={code as any} />);
        expect(screen.getByText(expected)).toBeInTheDocument();
        unmount();
      });
    });

    it("should show default error message for unknown error code", () => {
      render(<GenerationStatus state="error" errorCode="UNKNOWN_CODE" />);

      expect(screen.getByText(/błąd podczas generowania/i)).toBeInTheDocument();
    });
  });

  describe("completed state", () => {
    it("should render success alert", () => {
      render(<GenerationStatus state="completed" generatedCount={5} />);

      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText(/pomyślnie wygenerowano/i)).toBeInTheDocument();
      expect(screen.getByText(/wygenerowano 5 kandydatów/i)).toBeInTheDocument();
    });

    it("should handle zero generated count", () => {
      render(<GenerationStatus state="completed" generatedCount={0} />);

      expect(screen.getByText(/wygenerowano 0 kandydatów/i)).toBeInTheDocument();
    });

    it("should handle undefined generatedCount", () => {
      render(<GenerationStatus state="completed" />);

      expect(screen.getByText(/wygenerowano 0 kandydatów/i)).toBeInTheDocument();
    });
  });
});
