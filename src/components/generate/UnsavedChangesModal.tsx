import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";

interface UnsavedChangesModalProps {
  isOpen: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const UnsavedChangesModal: React.FC<UnsavedChangesModalProps> = ({
  isOpen,
  onSave,
  onDiscard,
  onCancel,
  isLoading = false,
}) => {
  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent>
        <div className="flex gap-3">
          <AlertTriangle className="h-5 w-5 text-warning" />
          <div className="flex-1">
            <AlertDialogTitle>Niezapisane zmiany</AlertDialogTitle>
            <AlertDialogDescription className="mt-2">
              Masz niezapisane karty. Czy chcesz je zapisać przed opuszczeniem strony?
            </AlertDialogDescription>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} disabled={isLoading}>
            Anuluj
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onDiscard}
            disabled={isLoading}
            className="bg-destructive hover:bg-destructive/80 disabled:bg-destructive/50 disabled:cursor-not-allowed"
          >
            Porzuć zmiany
          </AlertDialogAction>
          <AlertDialogAction onClick={onSave} disabled={isLoading} className="disabled:cursor-not-allowed">
            {isLoading ? "Zapisuję..." : "Zapisz karty"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
