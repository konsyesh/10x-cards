import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Edit3, Zap, CheckSquare, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TotalsSummary } from "@/types";

interface CandidatesToolbarProps {
  totals: TotalsSummary;
  total: number;
  onAcceptAll?: () => void;
  onSave?: () => void;
  isLoading?: boolean;
}

export const CandidatesToolbar: React.FC<CandidatesToolbarProps> = ({
  totals,
  total,
  onAcceptAll,
  onSave,
  isLoading = false,
}) => {
  const pending = total - totals.accepted - totals.rejected;
  const hasItems = totals.accepted > 0;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
      {/* Badgi - info section */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="gap-1">
          <Zap className="h-3 w-3" />
          Razem: <span className="font-semibold">{total}</span>
        </Badge>

        {pending > 0 && (
          <Badge variant="outline" className="gap-1">
            <span className="font-semibold">{pending}</span> oczekuje
          </Badge>
        )}
        <Badge variant="outline" className="gap-1">
          <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400" />
          Zaakceptowane: <span className="font-semibold text-green-600 dark:text-green-400">{totals.accepted}</span>
        </Badge>

        <Badge variant="outline" className="gap-1">
          <Edit3 className="h-3 w-3 text-blue-600 dark:text-blue-400" />
          Edytowane: <span className="font-semibold text-blue-600 dark:text-blue-400">{totals.edited}</span>
        </Badge>

        <Badge variant="outline" className="gap-1">
          <XCircle className="h-3 w-3 text-red-600 dark:text-red-400" />
          Odrzucone: <span className="font-semibold text-red-600 dark:text-red-400">{totals.rejected}</span>
        </Badge>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 w-full justify-end sm:w-auto sm:ml-auto">
        <Button
          onClick={onAcceptAll}
          variant="outline"
          size="sm"
          className="gap-2"
          aria-label="Zaakceptuj wszystkie karty"
        >
          <CheckSquare className="h-4 w-4" />
          {/* <span className="hidden sm:inline">Zaakceptuj wszystko</span> */}
        </Button>
        <Button
          onClick={onSave}
          disabled={!hasItems || isLoading}
          size="sm"
          className="gap-2"
          aria-label={`Zapisz ${totals.accepted} zaakceptowanych kart`}
        >
          <Save className="h-4 w-4" />
          <span className="hidden sm:inline">Zapisz</span> {hasItems && `(${totals.accepted})`}
        </Button>
      </div>
    </div>
  );
};
