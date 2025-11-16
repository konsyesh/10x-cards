import React from "react";
import { SourceTextarea } from "./SourceTextarea";
import { GenerateButton } from "./GenerateButton";
import { GenerationStatus } from "./GenerationStatus";
import type { GenerationState } from "@/types";

interface GenerateControlsProps {
  sourceText: string;
  onSourceChange: (text: string) => void;
  generationState: GenerationState;
  onGenerate: () => void;
  onRetry: () => void;
  isGenerating: boolean;
  min?: number;
  max?: number;
}

export const GenerateControls: React.FC<GenerateControlsProps> = ({
  sourceText,
  onSourceChange,
  generationState,
  onGenerate,
  onRetry,
  isGenerating,
  min = 1000,
  max = 50000,
}) => {
  const isValid = sourceText.length >= min && sourceText.length <= max;

  return (
    <div className="space-y-4">
      <SourceTextarea
        value={sourceText}
        onChange={onSourceChange}
        isValid={isValid}
        min={min}
        max={max}
      />

      <div className="flex justify-end">
        <GenerateButton
          onClick={onGenerate}
          disabled={!isValid || isGenerating}
          isLoading={isGenerating}
          label="Generuj karty"
        />
      </div>

      {generationState.status !== "idle" && (
        <GenerationStatus
          state={generationState.status}
          errorCode={generationState.errorCode}
          message={generationState.message}
          generatedCount={generationState.meta?.generatedCount}
          onRetry={generationState.status === "error" ? onRetry : undefined}
        />
      )}
    </div>
  );
};
