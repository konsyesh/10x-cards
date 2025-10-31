import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Save, Zap } from "lucide-react";

interface BulkSaveToolbarProps {
  acceptedCount: number;
  acceptedEditedCount: number;
  isLoading?: boolean;
  onOpenSummary: () => void;
}

export const BulkSaveToolbar: React.FC<BulkSaveToolbarProps> = ({
  acceptedCount,
  acceptedEditedCount,
  isLoading = false,
  onOpenSummary,
}) => {
  const totalToSave = acceptedCount;
  const hasItems = totalToSave > 0;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 border-t bg-white px-4 py-3 shadow-lg dark:border-slate-800 dark:bg-slate-950 ${
        hasItems ? "translate-y-0" : "translate-y-full"
      } transition-transform duration-200 ease-in-out md:relative md:translate-y-0`}
    >
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold">Gotowe do zapisania:</span>
          <Badge variant="default" className="gap-1">
            <Zap className="h-3 w-3" />
            {totalToSave} kart
          </Badge>
          {acceptedEditedCount > 0 && <Badge variant="secondary">{acceptedEditedCount} edytowanych</Badge>}
        </div>

        <Button
          onClick={onOpenSummary}
          disabled={!hasItems || isLoading}
          size="lg"
          className="gap-2"
          aria-label={`Zapisz ${totalToSave} kart`}
        >
          <Save className="h-4 w-4" />
          <span className="hidden sm:inline">Zapisz</span> {totalToSave} kart
        </Button>
      </div>

      {/* Spacer dla mobile */}
      <div className="h-20 md:hidden" />
    </div>
  );
};
