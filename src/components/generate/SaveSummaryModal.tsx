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
          <DialogDescription>Przejrzyj podsumowanie przed zapisaniem fiszek</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert className="border-destructive bg-destructive/10">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <AlertTitle className="text-destructive">Błąd</AlertTitle>
              <AlertDescription className="text-destructive/80">{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-3 rounded-lg bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span>Niezedytowane karty</span>
              </div>
              <span className="font-semibold text-success">{acceptedUnedited}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Edit3 className="h-4 w-4 text-info" />
                <span>Edytowane karty</span>
              </div>
              <span className="font-semibold text-info">{acceptedEdited}</span>
            </div>

            <div className="border-t border-border pt-3">
              <div className="flex items-center justify-between font-semibold">
                <span>Razem do zapisania</span>
                <span className="text-lg">{totalAccepted}</span>
              </div>
            </div>
          </div>

          <Alert className="border-info bg-info-soft">
            <AlertCircle className="h-4 w-4 text-info-soft-foreground" />
            <AlertTitle className="text-info-soft-foreground">Operacja nieodwracalna</AlertTitle>
            <AlertDescription className="text-info-soft-foreground">
              Po zapisaniu karty będą dostępne w Twojej bibliotece
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            Anuluj
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading || totalAccepted === 0} className="gap-2">
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
