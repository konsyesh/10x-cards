import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
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
      <Alert className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
        <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
        <AlertTitle className="text-blue-900 dark:text-blue-200">Generowanie w toku</AlertTitle>
        <AlertDescription className="text-blue-800 dark:text-blue-300">
          Proszę czekać, trwa generowanie kandydatów z AI...
        </AlertDescription>
        <div className="mt-2 space-y-1">
          <Progress value={60} className="h-2" />
          <p className="text-xs text-blue-700 dark:text-blue-400">Może to potrwać kilka sekund</p>
        </div>
      </Alert>
    );
  }

  if (state === "error") {
    return (
      <Alert className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
        <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
        <AlertTitle className="text-red-900 dark:text-red-200">Błąd generowania</AlertTitle>
        <AlertDescription className="text-red-800 dark:text-red-300">
          {message || getErrorMessage(errorCode)}
        </AlertDescription>
        {onRetry && (
          <Button
            onClick={onRetry}
            variant="outline"
            size="sm"
            className="mt-2 gap-2 border-red-300 hover:bg-red-100 dark:border-red-700 dark:hover:bg-red-900"
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
      <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
        <Loader2 className="h-4 w-4 text-green-600 dark:text-green-400" />
        <AlertTitle className="text-green-900 dark:text-green-200">Pomyślnie wygenerowano</AlertTitle>
        <AlertDescription className="text-green-800 dark:text-green-300">
          Wygenerowano {generatedCount || 0} kandydatów. Przejrzyj je poniżej.
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};
