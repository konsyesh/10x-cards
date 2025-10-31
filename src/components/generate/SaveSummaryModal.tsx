import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, Edit3, AlertCircle, Loader2 } from "lucide-react";

interface SaveSummaryModalProps {
  isOpen: boolean;
  acceptedUnedited: number;
  acceptedEdited: number;
  isLoading?: boolean;
  error?: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export const SaveSummaryModal: React.FC<SaveSummaryModalProps> = ({
  isOpen,
  acceptedUnedited,
  acceptedEdited,
  isLoading = false,
  error,
  onConfirm,
  onCancel,
}) => {
  const totalAccepted = acceptedUnedited + acceptedEdited;

  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Potwierdzenie zapisu</DialogTitle>
          <DialogDescription>
            Przejrzyj podsumowanie przed zapisaniem fiszek
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <AlertTitle className="text-red-900 dark:text-red-200">
                Błąd
              </AlertTitle>
              <AlertDescription className="text-red-800 dark:text-red-300">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3 rounded-lg bg-slate-50 p-4 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span>Niezedytowane karty</span>
              </div>
              <span className="font-semibold text-green-600 dark:text-green-400">
                {acceptedUnedited}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Edit3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>Edytowane karty</span>
              </div>
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {acceptedEdited}
              </span>
            </div>

            <div className="border-t border-slate-200 pt-3 dark:border-slate-700">
              <div className="flex items-center justify-between font-semibold">
                <span>Razem do zapisania</span>
                <span className="text-lg">{totalAccepted}</span>
              </div>
            </div>
          </div>

          <Alert className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertTitle className="text-blue-900 dark:text-blue-200">
              Operacja nieodwracalna
            </AlertTitle>
            <AlertDescription className="text-blue-800 dark:text-blue-300">
              Po zapisaniu karty będą dostępne w Twojej bibliotece
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Anuluj
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || totalAccepted === 0}
            className="gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Zapisuję...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Zapisz {totalAccepted} kart
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
