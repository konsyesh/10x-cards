import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, AlertCircle, RefreshCw, CheckCircle2 } from "lucide-react";
import type { ApiErrorCode } from "@/types";

type GenerationStatusState = "idle" | "loading" | "error" | "completed";

interface GenerationStatusProps {
  state: GenerationStatusState;
  errorCode?: ApiErrorCode;
  message?: string;
  onRetry?: () => void;
  generatedCount?: number;
}

const getErrorMessage = (errorCode?: ApiErrorCode): string => {
  const errorMessages: Record<string, string> = {
    RATE_LIMIT_EXCEEDED: "Przekroczono limit żądań. Spróbuj ponownie za minutę.",
    SERVICE_UNAVAILABLE: "Usługa niedostępna. Serwer LLM nie odpowiada.",
    GATEWAY_TIMEOUT: "Przekroczono czas generacji. Spróbuj ponownie.",
    TEXT_LENGTH_INVALID: "Tekst ma nieprawidłową długość.",
    VALIDATION_ERROR: "Błąd walidacji danych.",
  };
  return errorMessages[errorCode || ""] || "Błąd podczas generowania.";
};

export const GenerationStatus: React.FC<GenerationStatusProps> = ({
  state,
  errorCode,
  message,
  onRetry,
  generatedCount,
}) => {
  if (state === "idle") return null;

  if (state === "loading") {
    return (
      <Alert className="border-info bg-info-soft">
        <Loader2 className="h-4 w-4 animate-spin text-info-soft-foreground" />
        <AlertTitle className="text-info-soft-foreground">Generowanie w toku</AlertTitle>
        <AlertDescription className="text-info-soft-foreground">
          Proszę czekać, trwa generowanie kandydatów z AI...
        </AlertDescription>
        <div className="mt-2 space-y-1">
          <Progress value={60} className="h-2" />
          <p className="text-xs text-info-soft-foreground">Może to potrwać kilka sekund</p>
        </div>
      </Alert>
    );
  }

  if (state === "error") {
    return (
      <Alert className="border-destructive bg-destructive/10">
        <AlertCircle className="h-4 w-4 text-destructive" />
        <AlertTitle className="text-destructive">Błąd generowania</AlertTitle>
        <AlertDescription className="text-destructive/80">{message || getErrorMessage(errorCode)}</AlertDescription>
        {onRetry && (
          <Button
            onClick={onRetry}
            variant="outline"
            size="sm"
            className="mt-2 gap-2 border-destructive/30 hover:bg-destructive/10"
          >
            <RefreshCw className="h-3 w-3" />
            Spróbuj ponownie
          </Button>
        )}
      </Alert>
    );
  }

  if (state === "completed") {
    return (
      <Alert className="border-success bg-success-soft">
        <CheckCircle2 className="h-4 w-4 text-success-soft-foreground" />
        <AlertTitle className="text-success-soft-foreground">Pomyślnie wygenerowano</AlertTitle>
        <AlertDescription className="text-success-soft-foreground">
          Wygenerowano {generatedCount || 0} kandydatów. Przejrzyj je poniżej.
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};
