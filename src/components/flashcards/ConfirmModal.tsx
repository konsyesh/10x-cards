import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface ConfirmModalProps {
  /** Czy modal jest otwarty */
  isOpen: boolean;
  /** Typ potwierdzenia */
  type: "delete" | "conflict";
  /** Komunikat do wyświetlenia */
  message: string;
  /** Callback dla potwierdzenia */
  onConfirm: () => void;
  /** Callback dla anulowania */
  onCancel: () => void;
  /** Czy trwa ładowanie */
  isLoading?: boolean;
}

/**
 * Modal potwierdzenia dla usunięcia lub decyzji w konflikcie edycji
 */
export const ConfirmModal = ({ isOpen, type, message, onConfirm, onCancel, isLoading = false }: ConfirmModalProps) => {
  const getTitle = () => {
    switch (type) {
      case "delete":
        return "Potwierdź usunięcie";
      case "conflict":
        return "Konflikt edycji";
      default:
        return "Potwierdzenie";
    }
  };

  const getConfirmText = () => {
    switch (type) {
      case "delete":
        return "Usuń";
      case "conflict":
        return "Potwierdź";
      default:
        return "Potwierdź";
    }
  };

  const getCancelText = () => {
    return "Anuluj";
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{getTitle()}</AlertDialogTitle>
          <AlertDialogDescription>{message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline" disabled={isLoading}>
              {getCancelText()}
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button onClick={onConfirm} disabled={isLoading} variant={type === "delete" ? "destructive" : "default"}>
              {isLoading ? "Przetwarzanie..." : getConfirmText()}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
