import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { GenerateControls } from "../GenerateControls";
import { createMockGenerationState } from "@/tests/helpers";

describe("GenerateControls", () => {
  describe("rendering", () => {
    it("should render SourceTextarea and GenerateButton", () => {
      const onSourceChange = vi.fn();
      const onGenerate = vi.fn();
      const onRetry = vi.fn();
      const state = createMockGenerationState({ status: "idle" });

      render(
        <GenerateControls
          sourceText="Test text"
          onSourceChange={onSourceChange}
          generationState={state}
          onGenerate={onGenerate}
          onRetry={onRetry}
          isGenerating={false}
        />
      );

      expect(screen.getByLabelText(/tekst źródłowy/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /generuj karty/i })).toBeInTheDocument();
    });

    it("should disable button when text is invalid", () => {
      const onSourceChange = vi.fn();
      const onGenerate = vi.fn();
      const onRetry = vi.fn();
      const state = createMockGenerationState({ status: "idle" });

      render(
        <GenerateControls
          sourceText="short"
          onSourceChange={onSourceChange}
          generationState={state}
          onGenerate={onGenerate}
          onRetry={onRetry}
          isGenerating={false}
          min={1000}
          max={50000}
        />
      );

      expect(screen.getByRole("button", { name: /generuj karty/i })).toBeDisabled();
    });

    it("should show GenerationStatus when not idle", () => {
      const onSourceChange = vi.fn();
      const onGenerate = vi.fn();
      const onRetry = vi.fn();
      const state = createMockGenerationState({ status: "loading" });
      const longText = "a".repeat(5000);

      render(
        <GenerateControls
          sourceText={longText}
          onSourceChange={onSourceChange}
          generationState={state}
          onGenerate={onGenerate}
          onRetry={onRetry}
          isGenerating={true}
        />
      );

      expect(screen.getByText(/generowanie w toku/i)).toBeInTheDocument();
    });

    it("should show retry button on error", () => {
      const onSourceChange = vi.fn();
      const onGenerate = vi.fn();
      const onRetry = vi.fn();
      const state = createMockGenerationState({ status: "error" });
      const longText = "a".repeat(5000);

      render(
        <GenerateControls
          sourceText={longText}
          onSourceChange={onSourceChange}
          generationState={state}
          onGenerate={onGenerate}
          onRetry={onRetry}
          isGenerating={false}
        />
      );

      expect(screen.getByRole("button", { name: /spróbuj ponownie/i })).toBeInTheDocument();
    });
  });
});

