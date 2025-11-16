import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HelpCircle } from "lucide-react";

interface KeyboardShortcutsHintProps {
  show?: boolean;
}

export const KeyboardShortcutsHint: React.FC<KeyboardShortcutsHintProps> = ({ show = true }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!show) return null;

  const shortcuts = [
    { key: "A", description: "Zaakceptuj bieżącą kartę" },
    { key: "E", description: "Edytuj bieżącą kartę" },
    { key: "R", description: "Odrzuć bieżącą kartę" },
    { key: "S", description: "Otwórz modal zapisu" },
    { key: "←", description: "Poprzednia karta" },
    { key: "→", description: "Następna karta" },
    { key: "PgUp", description: "Poprzednia strona" },
    { key: "PgDn", description: "Następna strona" },
  ];

  return (
    <>
      <div className="fixed bottom-6 right-6 z-40">
        <Button
          onClick={() => setIsOpen(true)}
          variant="outline"
          size="icon"
          className="rounded-full shadow-lg"
          aria-label="Pokaż skróty klawiaturowe (naciśnij ?)"
          title="Skróty klawiaturowe (?)"
        >
          <HelpCircle className="h-5 w-5" />
        </Button>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Skróty klawiaturowe</DialogTitle>
            <DialogDescription>Szybkie nawigacja i zarządzanie kartami</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {shortcuts.map(({ key, description }) => (
              <div key={key} className="flex items-center gap-3 rounded-lg bg-card p-2">
                <kbd className="inline-flex min-w-[3rem] items-center justify-center rounded border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground shadow-sm">
                  {key}
                </kbd>
                <span className="text-sm text-foreground">{description}</span>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">💡 Skróty działają poza polami tekstowymi</p>
        </DialogContent>
      </Dialog>
    </>
  );
};
