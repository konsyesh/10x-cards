import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Wand2 } from "lucide-react";

interface GenerateButtonProps {
  onClick: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  label?: string;
}

export const GenerateButton: React.FC<GenerateButtonProps> = ({
  onClick,
  disabled = false,
  isLoading = false,
  label = "Generuj karty",
}) => {
  return (
    <Button
      onClick={onClick}
      disabled={disabled || isLoading}
      size="lg"
      className="gap-2"
      aria-busy={isLoading}
      aria-label={isLoading ? "Generowanie w toku..." : label}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Generowanie...</span>
        </>
      ) : (
        <>
          <Wand2 className="h-4 w-4" />
          <span>{label}</span>
        </>
      )}
    </Button>
  );
};
