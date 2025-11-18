import { useState, useEffect } from "react";
import { X, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import type { FlashcardListVM, UpdateFlashcardCommand } from "@/types";

/**
 * Waliduje pole front
 */
const validateFront = (front: string): string | undefined => {
  if (!front.trim()) {
    return "Pytanie jest wymagane";
  }
  if (front.length < 1) {
    return "Pytanie nie może być puste";
  }
  if (front.length > 200) {
    return "Pytanie może mieć maksymalnie 200 znaków";
  }
  return undefined;
};

/**
 * Waliduje pole back
 */
const validateBack = (back: string): string | undefined => {
  if (!back.trim()) {
    return "Odpowiedź jest wymagana";
  }
  if (back.length < 1) {
    return "Odpowiedź nie może być pusta";
  }
  if (back.length > 500) {
    return "Odpowiedź może mieć maksymalnie 500 znaków";
  }
  return undefined;
};

interface FlashcardModalProps {
  /** Czy modal jest otwarty */
  isOpen: boolean;
  /** Tryb modala */
  mode: "create" | "edit";
  /** Dane fiszki do edycji (tylko dla trybu edit) */
  flashcard?: FlashcardListVM;
  /** Callback dla zapisania */
  onSave: (data: UpdateFlashcardCommand) => void;
  /** Callback dla anulowania */
  onCancel: () => void;
  /** Callback dla obsługi konfliktu (tylko dla edit) */
  onConflict?: (action: "refresh" | "overwrite") => void;
  /** Czy trwa ładowanie */
  isLoading?: boolean;
}

interface FormData {
  front: string;
  back: string;
}

interface ValidationErrors {
  front?: string;
  back?: string;
}

/**
 * Modal dla tworzenia lub edycji fiszki z walidacją pól i obsługą konfliktów
 */
export const FlashcardModal = ({
  isOpen,
  mode,
  flashcard,
  onSave,
  onCancel,
  onConflict,
  isLoading = false,
}: FlashcardModalProps) => {
  const [formData, setFormData] = useState<FormData>({ front: "", back: "" });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isDirty, setIsDirty] = useState(false);

  // Reset formularza przy otwarciu/zamknięciu
  useEffect(() => {
    if (isOpen && flashcard && mode === "edit") {
      setFormData({
        front: flashcard.front,
        back: flashcard.back,
      });
      setErrors({});
      setIsDirty(false);
    } else if (isOpen && mode === "create") {
      setFormData({ front: "", back: "" });
      setErrors({});
      setIsDirty(false);
    }
  }, [isOpen, flashcard, mode]);

  // Walidacja w czasie rzeczywistym
  const validateField = (field: keyof FormData, value: string) => {
    let error: string | undefined;
    if (field === "front") {
      error = validateFront(value);
    } else if (field === "back") {
      error = validateBack(value);
    }

    setErrors((prev) => ({ ...prev, [field]: error }));
    return !error;
  };

  // Obsługa zmian w polach
  const handleFieldChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
    validateField(field, value);
  };

  // Walidacja całego formularza
  const validateForm = (): boolean => {
    const frontValid = validateField("front", formData.front);
    const backValid = validateField("back", formData.back);
    return frontValid && backValid;
  };

  // Obsługa zapisania
  const handleSave = () => {
    if (!validateForm()) return;

    const data: UpdateFlashcardCommand = {
      front: formData.front.trim(),
      back: formData.back.trim(),
    };

    onSave(data);
    setIsDirty(false);
  };

  // Obsługa anulowania z potwierdzeniem jeśli są niezapisane zmiany
  const handleCancel = () => {
    if (isDirty) {
      if (window.confirm("Masz niezapisane zmiany. Czy na pewno chcesz anulować?")) {
        onCancel();
      }
    } else {
      onCancel();
    }
  };

  // Sprawdź czy formularz jest prawidłowy
  const isFormValid = !errors.front && !errors.back && formData.front.trim() && formData.back.trim();

  const title = mode === "create" ? "Dodaj nową fiszkę" : "Edytuj fiszkę";
  const saveButtonText = mode === "create" ? "Dodaj" : "Zapisz";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="sm:max-w-[600px]" aria-describedby="flashcard-modal-description">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div id="flashcard-modal-description" className="space-y-4">
          {/* Pole Front */}
          <div className="space-y-2">
            <Label htmlFor="front" className="text-sm font-medium">
              Pytanie <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="front"
              placeholder="Wpisz pytanie fiszki..."
              value={formData.front}
              onChange={(e) => handleFieldChange("front", e.target.value)}
              className={`min-h-[80px] resize-none ${errors.front ? "border-destructive" : ""}`}
              disabled={isLoading}
              aria-invalid={!!errors.front}
              aria-describedby={errors.front ? "front-error" : undefined}
            />
            {errors.front && (
              <p id="front-error" className="text-sm text-destructive" role="alert">
                {errors.front}
              </p>
            )}
            <p className="text-xs text-muted-foreground">{formData.front.length}/200 znaków</p>
          </div>

          {/* Pole Back */}
          <div className="space-y-2">
            <Label htmlFor="back" className="text-sm font-medium">
              Odpowiedź <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="back"
              placeholder="Wpisz odpowiedź fiszki..."
              value={formData.back}
              onChange={(e) => handleFieldChange("back", e.target.value)}
              className={`min-h-[120px] resize-none ${errors.back ? "border-destructive" : ""}`}
              disabled={isLoading}
              aria-invalid={!!errors.back}
              aria-describedby={errors.back ? "back-error" : undefined}
            />
            {errors.back && (
              <p id="back-error" className="text-sm text-destructive" role="alert">
                {errors.back}
              </p>
            )}
            <p className="text-xs text-muted-foreground">{formData.back.length}/500 znaków</p>
          </div>

          {/* Informacja o źródle dla edycji */}
          {mode === "edit" && flashcard && (
            <div className="text-sm text-muted-foreground">
              Źródło:{" "}
              {flashcard.source === "manual"
                ? "ręcznie dodana"
                : flashcard.source === "ai-full"
                  ? "wygenerowana przez AI"
                  : "edytowana z AI"}
            </div>
          )}

          {/* Obsługa konfliktów edycji */}
          {onConflict && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Ta fiszka została zmodyfikowana przez kogoś innego. Co chcesz zrobić?
                <div className="flex gap-2 mt-3">
                  <Button variant="outline" size="sm" onClick={() => onConflict("refresh")} disabled={isLoading}>
                    Odśwież dane
                  </Button>
                  <Button variant="default" size="sm" onClick={() => onConflict("overwrite")} disabled={isLoading}>
                    Nadpisz
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            Anuluj
          </Button>
          <Button onClick={handleSave} disabled={!isFormValid || isLoading}>
            {isLoading ? "Zapisywanie..." : saveButtonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
